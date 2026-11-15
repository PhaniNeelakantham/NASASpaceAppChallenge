// Browser side of the HALO assistant. Talks only to our own /api/assistant route, never to Gemini directly.

export type Mode = 'emergency' | 'ask' | 'handover' | 'skin'

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

export interface ProposedAction {
  name: string
  args: Record<string, unknown>
}

export type AssistantResult =
  | { ok: true; text: string; actions: ProposedAction[]; model: string }
  | { ok: false; error: 'offline' | 'no_key' | 'bad_request' | 'rate_limited' | 'upstream' | 'timeout'; message: string }

export async function askAssistant(mode: Mode, messages: ChatTurn[], context: unknown, images?: { label: string; dataUrl: string }[]): Promise<AssistantResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, error: 'offline', message: 'No connection.' }
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 25000)
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}api/assistant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode, messages: messages.slice(-12), context, images }),
      signal: ctl.signal,
    })
    const body = (await r.json().catch(() => null)) as AssistantResult | null
    if (!body) return { ok: false, error: 'upstream', message: `Server returned ${r.status}.` }
    return body
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { ok: false, error: 'timeout', message: 'The AI took too long.' }
    return { ok: false, error: 'offline', message: 'Could not reach the AI.' }
  } finally {
    clearTimeout(t)
  }
}

/** Plain-language reason for a failed request, plus what still works. */
export function failureText(r: Extract<AssistantResult, { ok: false }>): string {
  switch (r.error) {
    case 'no_key':
      return 'AI not configured (no Claude API key on the server). The step-by-step guide still works.'
    case 'rate_limited':
      return 'AI is busy (rate limit). Keep following the steps; try again in a minute.'
    case 'offline':
    case 'timeout':
      return 'AI unavailable: no connection. Using the offline guide.'
    default:
      return 'AI unavailable right now. The step-by-step guide still works.'
  }
}
