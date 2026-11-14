/**
 * HALO AI assistant — server side (Claude Haiku 5.5 via the official Anthropic SDK).
 *
 * Runs as a Vercel Function in production (POST /api/assistant) and is loaded by the Vite dev
 * server locally (see vite.config.ts), so the API key never reaches the browser.
 *
 * One API call per user message. The model never executes anything itself: it returns short
 * guidance plus *proposed* actions (tool_use blocks). The app shows each proposal and a crew
 * member confirms it — so no tool results are sent back and there is no agent loop.
 */
import Anthropic from '@anthropic-ai/sdk'

export type Mode = 'emergency' | 'ask'

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

export interface AssistantRequest {
  mode: Mode
  messages: ChatTurn[]
  /** Current app state (environment, vitals, current step, …) — attached to the latest message. */
  context: unknown
}

export interface ProposedAction {
  name: string
  args: Record<string, unknown>
}

export type AssistantBody =
  | { ok: true; text: string; actions: ProposedAction[]; model: string }
  | { ok: false; error: 'no_key' | 'bad_request' | 'rate_limited' | 'upstream'; message: string }

// Cheapest current Claude model ($0.10 / $0.50 per million input / output tokens).
const DEFAULT_MODEL = 'claude-haiku-5-5'

const PROTOCOL_IDS = ['collapse', 'chest', 'breath', 'bleed', 'toxic', 'dcs']
const SYSTEM_IDS = ['skin', 'heart', 'lungs', 'eyes', 'bones', 'muscle', 'immune', 'gut', 'mind', 'sleep']

/* ------------------------------------------------------------------ */
/* Prompts                                                              */
/* ------------------------------------------------------------------ */

const EMERGENCY_PROMPT = `You are HALO's emergency copilot on a crewed space mission. The person typing is a crew member, not a doctor, helping a crewmate in a medical emergency. Their messages are short, typed or spoken, and may be panicked.

How to reply:
- At most two short sentences, plain words, written as instructions. No markdown, no lists.
- Always write at least one short sentence of guidance, even when you also call a tool — it is read aloud to the rescuer.
- The app runs checked step-by-step guides (protocol ids: collapse, chest, breath, bleed, toxic, dcs). Those guides are the source of truth. You never invent procedures, never name drugs or doses — for medicines say "follow the medical kit card".
- If no guide is running, call choose_protocol with the best match. If you are unsure, or the patient may be unresponsive or not breathing normally, choose "collapse" (it starts with safety and breathing checks).
- If a guide is running and the crew member's words clearly answer the CURRENT step, call answer_step with yes/no (for a question) or done (for an action step). If their words do not clearly answer it, ask the current step's question back in simpler words instead. Never answer any step other than the current one.
- Treat not breathing, unresponsive, no pulse or severe bleeding as the most urgent.
- Call log_event for important facts they mention (when symptoms started, allergies, what happened, medicines already given).
- If the escalation mode is "queued", Earth is minutes away: remind them they are the first responders and must not wait for Earth. Call send_consult only when they ask to contact the ground.
- Each user message ends with a JSON context block describing the app state. Use it; do not read it back.`

const ASK_PROMPT = `You are HALO, an onboard health assistant for astronauts on a space mission. The person asking is an astronaut, not a doctor.

How to reply:
- Two to five short sentences in plain language. No markdown headings; a short list is fine when giving steps.
- Always answer in words first. Calling open_system, open_tab or start_emergency is in addition to your written answer, never instead of it.
- Answer from the JSON context (their readings compared with their own normal, the mission environment, space weather) and well-established general knowledge about spaceflight health (NASA Human Research Program risks). Say so when you are not sure.
- Explain how to take a measurement step by step when asked, adapted to the environment's gravity.
- Never diagnose and never give drug names or doses. For anything worrying, point them to their Crew Medical Officer and the escalation option shown in the context.
- If they describe an emergency (someone collapsed, chest pain, can't breathe, heavy bleeding, smoke or a toxic leak), call start_emergency immediately and tell them to press Emergency.
- Call open_system to show the body system you are talking about, and open_tab when a screen (checkin, trends, radiation, learn) would help.
- The crew data in this prototype is simulated; the Inspiration4 blood data and DONKI space weather are real NASA data.
- Each user message ends with a JSON context block. Use it; do not read it back.`

/* ------------------------------------------------------------------ */
/* Tools (proposals only — strict schemas so arguments always validate) */
/* ------------------------------------------------------------------ */

const str = (description: string) => ({ type: 'string' as const, description })

function tool(name: string, description: string, properties: Record<string, unknown>, required: string[]): Anthropic.Tool {
  return {
    name,
    description,
    strict: true,
    input_schema: { type: 'object', properties, required, additionalProperties: false },
  }
}

const EMERGENCY_TOOLS: Anthropic.Tool[] = [
  tool('choose_protocol', 'Propose which emergency guide to start. The crew member confirms before it starts.', { protocol_id: { type: 'string', enum: PROTOCOL_IDS }, reason: str('Short reason shown to the crew member') }, ['protocol_id', 'reason']),
  tool('answer_step', 'Propose the answer to the CURRENT step of the running guide, only when the crew member clearly answered it. They confirm it.', { answer: { type: 'string', enum: ['yes', 'no', 'done'] }, reason: str('The words that answer the step') }, ['answer', 'reason']),
  tool('log_event', 'Record an important fact in the emergency log (symptom onset, allergies, what happened, medicines given).', { text: str('One short log line') }, ['text']),
  tool('send_consult', 'Propose sending a consult message to Earth or the base medical officer. Only when the crew member asks to contact them.', { summary: str('One-paragraph situation summary') }, ['summary']),
]

const ASK_TOOLS: Anthropic.Tool[] = [
  tool('open_system', 'Show a body system on the 3D body with its summary card.', { system_id: { type: 'string', enum: SYSTEM_IDS } }, ['system_id']),
  tool('start_emergency', 'Open emergency mode immediately because the user described a medical emergency.', { reason: str('What the emergency is') }, ['reason']),
  tool('open_tab', 'Open another screen of the app.', { tab: { type: 'string', enum: ['checkin', 'trends', 'radiation', 'learn'] } }, ['tab']),
]

/* ------------------------------------------------------------------ */
/* Guaranteed text: if the model only called a tool, say what it did    */
/* ------------------------------------------------------------------ */

const SYSTEM_NAMES: Record<string, string> = {
  skin: 'skin', heart: 'heart and blood vessels', lungs: 'lungs and oxygen', eyes: 'eyes and brain', bones: 'bones',
  muscle: 'muscles', immune: 'immune system', gut: 'nutrition and metabolism', mind: 'mood', sleep: 'sleep and alertness',
}
const PROTOCOL_NAMES: Record<string, string> = {
  collapse: 'Collapsed / not responding', chest: 'Chest pain', breath: 'Trouble breathing', bleed: 'Heavy bleeding',
  toxic: 'Smoke or toxic leak', dcs: 'Pain or numbness after a spacewalk',
}

/** A short, deterministic sentence describing the proposed actions (no extra API call). */
function fallbackText(mode: Mode, actions: ProposedAction[]): string {
  const parts: string[] = []
  for (const a of actions) {
    const v = (k: string) => String(a.args[k] ?? '')
    if (a.name === 'open_system') parts.push(`Here’s your ${SYSTEM_NAMES[v('system_id')] ?? 'body system'} on the body — tap its card for your readings and what to do.`)
    if (a.name === 'open_tab') parts.push(`I’ve opened the ${v('tab')} screen for you.`)
    if (a.name === 'start_emergency') parts.push('This sounds like an emergency — opening the emergency guide now.')
    if (a.name === 'choose_protocol') parts.push(`Start the “${PROTOCOL_NAMES[v('protocol_id')] ?? 'emergency'}” guide — confirm below.`)
    if (a.name === 'answer_step') parts.push(`I think the answer to this step is “${v('answer')}” — confirm below.`)
    if (a.name === 'send_consult') parts.push('I drafted a message to the ground — confirm below to send it.')
  }
  if (parts.length) return parts.join(' ')
  return mode === 'emergency' ? 'Keep following the step on screen.' : 'Sorry, I don’t have an answer for that. Try asking it another way.'
}

/* ------------------------------------------------------------------ */
/* Handler (shared by Vercel and the Vite dev server)                   */
/* ------------------------------------------------------------------ */

function validate(b: unknown): AssistantRequest | null {
  if (!b || typeof b !== 'object') return null
  const r = b as Partial<AssistantRequest>
  if (r.mode !== 'emergency' && r.mode !== 'ask') return null
  if (!Array.isArray(r.messages) || r.messages.length === 0 || r.messages.length > 24) return null
  for (const m of r.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string' || m.text.length > 2000) return null
  }
  if (r.messages.at(-1)!.role !== 'user') return null
  if (JSON.stringify(r.context ?? null).length > 24000) return null
  return r as AssistantRequest
}

/** Claude requires alternating roles starting with "user"; merge any repeats defensively. */
function toMessages(req: AssistantRequest): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = []
  req.messages.forEach((m, i) => {
    const last = i === req.messages.length - 1
    const text = last ? `${m.text}\n\nContext (app state, JSON):\n${JSON.stringify(req.context ?? {})}` : m.text
    const role = m.role === 'model' ? 'assistant' : 'user'
    const prev = out.at(-1)
    if (prev && prev.role === role && typeof prev.content === 'string') prev.content += `\n\n${text}`
    else out.push({ role, content: text })
  })
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

export async function handleAssistant(body: unknown, apiKey: string | undefined, model?: string): Promise<{ status: number; body: AssistantBody }> {
  if (!apiKey) return { status: 503, body: { ok: false, error: 'no_key', message: 'CLAUDE_API_KEY is not set on the server.' } }
  const req = validate(body)
  if (!req) return { status: 400, body: { ok: false, error: 'bad_request', message: 'Invalid request.' } }

  const useModel = model || DEFAULT_MODEL
  const client = new Anthropic({ apiKey, maxRetries: 1 })
  try {
    const res = await client.messages.create(
      {
        model: useModel,
        max_tokens: 2048,
        // Low effort: fastest and cheapest; these are short, well-scoped replies.
        output_config: { effort: 'low' },
        system: req.mode === 'emergency' ? EMERGENCY_PROMPT : ASK_PROMPT,
        tools: req.mode === 'emergency' ? EMERGENCY_TOOLS : ASK_TOOLS,
        messages: toMessages(req),
      },
      { timeout: 20_000 },
    )

    if (res.stop_reason === 'refusal') {
      return { status: 200, body: { ok: true, text: 'I can’t help with that here. Keep following the step-by-step guide and contact your Crew Medical Officer.', actions: [], model: useModel } }
    }
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()
    const actions = res.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ name: b.name, args: (b.input ?? {}) as Record<string, unknown> }))
    return { status: 200, body: { ok: true, text: text || fallbackText(req.mode, actions), actions, model: useModel } }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { status: 429, body: { ok: false, error: 'rate_limited', message: 'Rate limit reached. Try again in a minute.' } }
    if (e instanceof Anthropic.AuthenticationError) return { status: 502, body: { ok: false, error: 'upstream', message: 'The Claude API key was rejected.' } }
    if (e instanceof Anthropic.APIError) return { status: 502, body: { ok: false, error: 'upstream', message: `Claude API error ${e.status ?? ''}`.trim() } }
    return { status: 502, body: { ok: false, error: 'upstream', message: 'AI request failed.' } }
  }
}

/** Vercel Function entry point (Web-standard handler). */
export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)
  const r = await handleAssistant(body, process.env.CLAUDE_API_KEY, process.env.CLAUDE_MODEL)
  return Response.json(r.body, { status: r.status })
}
