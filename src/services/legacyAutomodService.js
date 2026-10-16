import { PermissionFlagsBits } from 'discord.js';
import { pgDb } from '../utils/postgresDatabase.js';

const key = guildId => `temp:titan_automod:${guildId}`;
const recent = new Map();
const defaults = () => ({ words: [], antiinvite: false, antilinks: false, antispam: false, linksChannelId: null });

export async function getAutomodConfig(guildId) {
  const saved = await pgDb.get(key(guildId), {});
  return { ...defaults(), ...(saved && typeof saved === 'object' ? saved : {}), words: Array.isArray(saved?.words) ? saved.words : [] };
}
export async function saveAutomodConfig(guildId, config) {
  return pgDb.set(key(guildId), config);
}

export async function enforceLegacyAutomod(message) {
  if (!message.guild || message.author.bot) return false;
  const cfg = await getAutomodConfig(message.guild.id);
  const content = message.content || '';
  const lower = content.toLowerCase();
  let reason = null;
  if (cfg.words.some(word => word && lower.includes(String(word).toLowerCase()))) reason = 'blocked word';
  if (!reason && cfg.antiinvite && /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(content)) reason = 'Discord invite link';
  const hasLink = /https?:\/\/|www\./i.test(content);
  if (!reason && cfg.antilinks && hasLink && (!cfg.linksChannelId || message.channel.id !== cfg.linksChannelId)) reason = 'link';
  if (!reason && cfg.antispam) {
    const now = Date.now();
    const id = `${message.guild.id}:${message.author.id}`;
    const entries = (recent.get(id) || []).filter(t => now - t < 7000);
    entries.push(now); recent.set(id, entries);
    if (entries.length >= 6) { reason = 'spam'; recent.set(id, []); }
  }
  if (!reason) return false;
  const me = message.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
  await message.delete().catch(() => null);
  const warning = await message.channel.send({ content: `<@${message.author.id}> message removed by AutoMod (${reason}).`, allowedMentions: { users: [message.author.id] } }).catch(() => null);
  if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
  return true;
}
