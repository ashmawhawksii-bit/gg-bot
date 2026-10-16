// Lightweight in-memory activity buffer for the owner dashboard. No message content is stored by default.
const MAX_EVENTS = 1500;
const events = [];
export function recordOwnerActivity(event = {}) {
  events.unshift({ at: new Date().toISOString(), ...event });
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}
export function getOwnerActivity(limit = 250) { return events.slice(0, Math.max(1, Math.min(Number(limit) || 250, 1000))); }
