import express from 'express';
import { timingSafeEqual } from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 3000);
const dashboardUser = process.env.DASHBOARD_USER || 'owner';
const dashboardPassword = process.env.DASHBOARD_PASSWORD || '';
const botApiUrl = process.env.BOT_API_URL || '';
const botUser = process.env.BOT_DASHBOARD_USER || 'owner';
const botPassword = process.env.BOT_DASHBOARD_PASSWORD || '';

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function auth(req, res, next) {
  if (!dashboardPassword || dashboardPassword.length < 24) {
    return res.status(503).send('Dashboard is disabled. Set a unique DASHBOARD_PASSWORD (at least 24 characters) in the hosting environment.');
  }
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  let user = '', pass = '';
  try {
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      user = decoded.slice(0, sep);
      pass = decoded.slice(sep + 1);
    }
  } catch {}
  if (scheme !== 'Basic' || !safeEqual(user, dashboardUser) || !safeEqual(pass, dashboardPassword)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Dream Core Owner Dashboard"');
    return res.status(401).send('Owner login required.');
  }
  next();
}
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'dream-core-owner-dashboard' }));
app.get('/api/snapshot', auth, async (_req, res) => {
  if (!botApiUrl || !botPassword) return res.status(503).json({ error: 'Set BOT_API_URL, BOT_DASHBOARD_USER and BOT_DASHBOARD_PASSWORD in the dashboard environment.' });
  try {
    const token = Buffer.from(`${botUser}:${botPassword}`).toString('base64');
    const response = await fetch(botApiUrl, { headers: { Authorization: `Basic ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return res.status(502).json({ error: `Bot API returned HTTP ${response.status}. Check BOT_API_URL and bot dashboard credentials.` });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(await response.json());
  } catch {
    return res.status(502).json({ error: 'Cannot reach the bot API. Check that the bot is online and BOT_API_URL is the public HTTPS URL ending in /owner/data.' });
  }
});
app.get('/', auth, (_req, res) => res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dream Core — Owner Panel</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;padding:24px;font:15px system-ui;background:#0b1020;color:#eef2ff}header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}h1{margin:0;font-size:clamp(24px,4vw,34px)}p{color:#aeb9d4}.pill{border:1px solid #384464;border-radius:99px;padding:6px 10px;color:#c9d5f3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin:22px 0}.card,section{background:#151d32;border:1px solid #293653;border-radius:15px;padding:16px;margin-bottom:16px}.label{color:#aeb9d4;font-size:13px}.value{font-size:26px;font-weight:750;margin-top:6px;overflow-wrap:anywhere}.scroll{overflow:auto;max-height:460px}table{border-collapse:collapse;width:100%;min-width:620px}th,td{text-align:left;padding:10px;border-bottom:1px solid #293653;overflow-wrap:anywhere}th{color:#aeb9d4;font-size:13px}#error{color:#ffb4b4;white-space:pre-wrap}button{background:#7c6cff;color:white;border:0;border-radius:9px;padding:9px 13px;font-weight:650;cursor:pointer}small{color:#aeb9d4}.status{color:#83efba}footer{color:#8491ae;font-size:12px;margin-top:20px}
</style></head><body><header><div><h1>✨ Dream Core</h1><p>Private owner dashboard · Israfil Thronhalo</p></div><div><span class="pill" id="state">Connecting…</span> <button onclick="loadData()">Refresh</button></div></header>
<div id="error"></div><div class="grid">
<div class="card"><div class="label">Bot status</div><div class="value" id="status">—</div></div>
<div class="card"><div class="label">Discord servers</div><div class="value" id="servers">—</div></div>
<div class="card"><div class="label">Loaded commands</div><div class="value" id="commands">—</div></div>
<div class="card"><div class="label">Uptime</div><div class="value" id="uptime">—</div></div>
</div><section><h2>Discord Servers</h2><div class="scroll"><table><thead><tr><th>Server</th><th>Server ID</th><th>Members</th></tr></thead><tbody id="guildRows"><tr><td colspan="3">Loading…</td></tr></tbody></table></div></section>
<section><h2>Recent Command & DM Events</h2><p>DM message content is not stored. This shows events the bot itself receives, not private conversations between other users.</p><div class="scroll"><table><thead><tr><th>Time</th><th>Event</th><th>User</th><th>Server</th><th>Details</th></tr></thead><tbody id="activityRows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div></section>
<footer>Dashboard data comes from the bot's authenticated API. Activity history currently resets when the bot restarts.</footer>
<script>
const el=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function duration(s){s=Math.max(0,Number(s)||0);const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d?(d+'d '+h+'h'):h?(h+'h '+m+'m'):(m+'m');}
async function loadData(){el('state').textContent='Refreshing…';el('error').textContent='';try{const r=await fetch('/api/snapshot',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));el('status').textContent=d.status||'Unknown';el('servers').textContent=(d.guilds||[]).length;el('commands').textContent=d.commandCount??'—';el('uptime').textContent=duration(d.uptimeSeconds);el('guildRows').innerHTML=(d.guilds||[]).map(g=>'<tr><td>'+esc(g.name)+'</td><td>'+esc(g.id)+'</td><td>'+esc(g.members)+'</td></tr>').join('')||'<tr><td colspan="3">No servers found</td></tr>';el('activityRows').innerHTML=(d.activity||[]).map(e=>'<tr><td>'+esc(new Date(e.at).toLocaleString())+'</td><td>'+esc(e.type)+'</td><td>'+esc(e.userTag||e.userId||'')+'</td><td>'+esc(e.guildName||e.guildId||'DM')+'</td><td>'+esc(e.detail||'')+'</td></tr>').join('')||'<tr><td colspan="5">No activity recorded yet</td></tr>';el('state').textContent='Connected';}catch(e){el('state').textContent='Connection issue';el('error').textContent=e.message;}}loadData();setInterval(loadData,30000);
</script></body></html>`));
app.listen(port, '0.0.0.0', () => console.log(`Dream Core Owner Dashboard listening on ${port}`));
