/**
 * Offline fallback: route a free-text description to an emergency guide with simple keyword rules.
 * Used when the AI can't be reached. Order matters, the most life-threatening signs win.
 */
const RULES: { id: string; words: RegExp }[] = [
  { id: 'collapse', words: /\b(collapse|collapsed|unconscious|passed out|faint|not respond|unresponsive|not breathing|no pulse|won'?t wake|limp)\b/i },
  { id: 'toxic', words: /\b(smoke|fire|fumes?|leak|ammonia|chemical|toxic|burning smell)\b/i },
  { id: 'breath', words: /\b(breath|breathing|can'?t breathe|choking|oxygen|blue lips|wheez|suffocat)/i },
  { id: 'chest', words: /\b(chest|heart attack|left arm|jaw pain|crushing|pressure in)\b/i },
  { id: 'bleed', words: /\b(bleed|bleeding|blood|cut|wound|gash|laceration|injur)/i },
  { id: 'dcs', words: /\b(eva|spacewalk|bends|decompression|numb|tingl|joint pain)\b/i },
]

export function routeOffline(text: string): string | null {
  for (const r of RULES) if (r.words.test(text)) return r.id
  return null
}
