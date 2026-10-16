import { pgDb } from '../utils/postgresDatabase.js';
import { logger } from '../utils/logger.js';

const POLL_SECONDS = Math.max(5, Number(process.env.PERSISTENT_JOB_POLL_SECONDS) || 15);
let timer = null;
let running = false;

function requirePool() {
  if (!pgDb?.pool || !pgDb.isConnected) {
    throw new Error('Persistent jobs require a connected PostgreSQL database.');
  }
  return pgDb.pool;
}

export async function ensurePersistentJobsTable() {
  const pool = requirePool();
  await pool.query(`CREATE TABLE IF NOT EXISTS titanbot_scheduled_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_type VARCHAR(40) NOT NULL,
    run_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_titanbot_scheduled_jobs_due ON titanbot_scheduled_jobs (run_at) WHERE status = 'pending'`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_titanbot_scheduled_jobs_type_status ON titanbot_scheduled_jobs (job_type, status)`);
  // A deploy/restart may interrupt a job after it was claimed. Re-queue those jobs.
  await pool.query(`UPDATE titanbot_scheduled_jobs SET status='pending', updated_at=NOW(), last_error=COALESCE(last_error, 'Recovered after process restart') WHERE status='running'`);
}

export async function schedulePersistentJob(jobType, runAt, payload) {
  const pool = requirePool();
  if (!(runAt instanceof Date) || Number.isNaN(runAt.getTime()) || runAt <= new Date()) {
    throw new Error('Scheduled job time must be in the future.');
  }
  const result = await pool.query(
    `INSERT INTO titanbot_scheduled_jobs (job_type, run_at, payload) VALUES ($1, $2, $3::jsonb) RETURNING id, run_at`,
    [jobType, runAt.toISOString(), JSON.stringify(payload ?? {})],
  );
  return result.rows[0];
}

async function claimDueJob() {
  const pool = requirePool();
  const result = await pool.query(`
    WITH next_job AS (
      SELECT id FROM titanbot_scheduled_jobs
      WHERE status = 'pending' AND run_at <= NOW()
      ORDER BY run_at ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE titanbot_scheduled_jobs j
    SET status = 'running', attempts = attempts + 1, updated_at = NOW()
    FROM next_job WHERE j.id = next_job.id
    RETURNING j.id, j.job_type, j.payload, j.attempts
  `);
  return result.rows[0] ?? null;
}

async function markDone(id) {
  await requirePool().query(`UPDATE titanbot_scheduled_jobs SET status='done', completed_at=NOW(), updated_at=NOW(), last_error=NULL WHERE id=$1`, [id]);
}

async function markFailedOrRetry(job, error) {
  const final = Number(job.attempts) >= 5;
  await requirePool().query(
    `UPDATE titanbot_scheduled_jobs SET status=$2, run_at=CASE WHEN $2='pending' THEN NOW() + (LEAST(attempts, 4) * INTERVAL '30 seconds') ELSE run_at END, last_error=$3, updated_at=NOW() WHERE id=$1`,
    [job.id, final ? 'failed' : 'pending', String(error?.stack || error).slice(0, 4000)],
  );
}

async function executeJob(client, job) {
  const payload = job.payload || {};
  if (job.job_type === 'reminder') {
    const channel = await client.channels.fetch(String(payload.channelId)).catch(() => null);
    if (!channel?.isTextBased?.()) throw new Error(`Reminder channel ${payload.channelId} is unavailable.`);
    const userId = String(payload.userId);
    await channel.send({
      content: `<@${userId}> ⏰ Reminder: ${String(payload.message || '(no message)').slice(0, 1500)}`,
      allowedMentions: { users: [userId] },
    });
    return;
  }
  if (job.job_type === 'tempban_unban') {
    const guild = await client.guilds.fetch(String(payload.guildId)).catch(() => null);
    if (!guild) throw new Error(`Guild ${payload.guildId} is unavailable.`);
    await guild.members.unban(String(payload.userId), 'Temporary ban duration elapsed (persistent scheduler)');
    const channel = payload.channelId ? await client.channels.fetch(String(payload.channelId)).catch(() => null) : null;
    if (channel?.isTextBased?.()) await channel.send(`✅ Temporary ban ended for <@${payload.userId}>.`).catch(() => {});
    return;
  }
  throw new Error(`Unknown persistent job type: ${job.job_type}`);
}

async function tick(client) {
  if (running || !pgDb.isConnected || !pgDb.pool) return;
  running = true;
  try {
    // Bound each pass so a backlog does not block the bot's event loop indefinitely.
    for (let count = 0; count < 25; count += 1) {
      const job = await claimDueJob();
      if (!job) break;
      try {
        await executeJob(client, job);
        await markDone(job.id);
        logger.info(`Persistent job ${job.id} (${job.job_type}) completed.`);
      } catch (error) {
        logger.error(`Persistent job ${job.id} (${job.job_type}) failed:`, error);
        await markFailedOrRetry(job, error).catch(dbError => logger.error('Could not update persistent job state:', dbError));
      }
    }
  } catch (error) {
    logger.error('Persistent scheduler tick failed:', error);
  } finally {
    running = false;
  }
}

export async function startPersistentJobScheduler(client) {
  await ensurePersistentJobsTable();
  if (timer) clearInterval(timer);
  await tick(client);
  timer = setInterval(() => { void tick(client); }, POLL_SECONDS * 1000);
  timer.unref?.();
  logger.info(`Persistent PostgreSQL job scheduler started (poll every ${POLL_SECONDS}s).`);
}

export function stopPersistentJobScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
