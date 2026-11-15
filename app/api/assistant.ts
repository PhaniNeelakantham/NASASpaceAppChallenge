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

export type Mode = 'emergency' | 'ask' | 'handover' | 'skin'

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

export interface AssistantRequest {
  mode: Mode
  messages: ChatTurn[]
  /** Current app state (environment, vitals, current step, …) — attached to the latest message. */
  context: unknown
  /** Skin mode only: up to two labelled photos (JPEG/PNG data URLs), attached to the latest message. */
  images?: { label: string; dataUrl: string }[]
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
const CREW_IDS = ['c1', 'c2', 'c3', 'c4']
const SYSTEM_IDS = ['skin', 'heart', 'lungs', 'eyes', 'bones', 'muscle', 'immune', 'gut', 'mind', 'sleep']

/* ------------------------------------------------------------------ */
/* Prompts                                                              */
/* ------------------------------------------------------------------ */

const EMERGENCY_PROMPT = `You are HALO, the emergency copilot on a crewed space mission. You talk with a crew member who is not a doctor while they help a crewmate in a medical emergency — like a calm emergency dispatcher who stays on the line. Their messages are short, typed or spoken, and may be panicked. Your words are read aloud.

How to reply:
- One to three short spoken sentences, plain words, no markdown or lists. Sound like a calm person on the line: acknowledge what they said in a few words, give the single most important instruction, then (when useful) ask one focused question.
- Always write words, even when you also call tools.
- Use their crewmate's title (for example "the Commander") from the context.
- The app runs checked step-by-step guides (protocol ids: collapse, chest, breath, bleed, toxic, dcs). They are the source of truth. Never invent procedures, never name drugs or doses — for medicines say "follow the medical kit card".
- No patient chosen yet: if their words make clear who is hurt, call choose_patient with that crew id.
- No guide running yet: call choose_protocol with the best match. If unsure, or the patient may be unresponsive or not breathing normally, choose "collapse" (it starts with safety and breathing checks).
- A guide is running: coach them through the CURRENT step in your own words (what to look for, how to do it in their gravity — in 0 g, anchor yourself and the patient first). If their words clearly answer the current step, call answer_step with one of the answers listed in currentStep.answers (an action step only accepts "done", even when its wording is a question; if what they said means the action is not complete, do not call answer_step — tell them what to do instead). If not, ask the current step's question again, more simply. Never answer any other step.
- During CPR, keep them going: push hard and fast in the centre of the chest, about two per second, swap rescuers every two minutes if there is one.
- If they are frightened, reassure briefly ("You're doing the right thing") and keep them on task.
- Treat not breathing, unresponsive, no pulse or severe bleeding as the most urgent.
- Call log_event for important facts they mention (vital signs they measured, when symptoms started, allergies, what happened, medicines already given).
- If the escalation mode is "queued", Earth is minutes away: they are the first responders and must not wait for Earth. Call send_consult only when they ask to contact the ground.
- Each user message ends with a JSON context block describing the app state. Use it; do not read it back.`

const SKIN_PROMPT = `You help an astronaut track a skin problem (rash, bruise, cut, pressure mark) by comparing two photos of the same spot taken at different times. The person is not a doctor. This is change tracking, not a diagnosis.

Reply in this exact format, plain text, no markdown:
First line: exactly one of "LEVEL: same", "LEVEL: watch" or "LEVEL: show_cmo".
Then two to four short sentences:
- What changed between the earlier and the later photo: size (use the ruler if one is visible), colour, edges, spread, blisters, broken or weeping skin.
- If the photos are hard to compare (light, distance, angle, blur, no ruler), say so and how to retake them.
- What to do next.

Choose "show_cmo" when it is clearly spreading or growing, blistering, broken or weeping, has red streaks, or the notes mention fever, worsening pain or swelling. Choose "watch" for a small change or when you cannot tell. Choose "same" only when it looks unchanged or better.
Never name a condition as certain and never name medicines or doses. You may say what the Crew Medical Officer may want to check. If an image does not show skin, say so.
The text after the photos gives when each was taken, the body area, measured sizes and the astronaut's notes. Crew data in this prototype may be simulated.`

const HANDOVER_PROMPT = `You write the medical handover report for a space-mission emergency, from the event log and app state in the JSON context. The reader is a flight surgeon on Earth or the base medical officer.

Write exactly four short lines, plain text, each starting with its label:
Situation: who (by title), what is happening, and how long since the start.
Background: relevant readings from before the event and anything learned about how it started.
Assessment: what the crew found and did, in time order, using the times from the log. Report findings; do not diagnose.
Request: what the crew needs from the reader.
Never name drugs or doses that are not in the log. Do not invent facts; say "not recorded" when something is missing.`

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
  tool('answer_step', 'Propose the answer to the CURRENT step of the running guide, only when the crew member clearly answered it. The answer must be one of currentStep.answers in the context. They confirm it.', { answer: { type: 'string', enum: ['yes', 'no', 'done'] }, reason: str('The words that answer the step') }, ['answer', 'reason']),
  tool('log_event', 'Record an important fact in the emergency log (symptom onset, allergies, what happened, medicines given).', { text: str('One short log line') }, ['text']),
  tool('choose_patient', 'Propose which crew member is the patient, when the rescuer said who is hurt. They confirm it.', { crew_id: { type: 'string', enum: CREW_IDS }, reason: str('The words that say who it is') }, ['crew_id', 'reason']),
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
    if (a.name === 'choose_patient') parts.push('Confirm who the patient is below.')
    if (a.name === 'send_consult') parts.push('I drafted a message to the ground — confirm below to send it.')
  }
  if (parts.length) return parts.join(' ')
  if (mode === 'skin') return 'LEVEL: watch\nThe photos could not be compared. Keep photographing daily and show your Crew Medical Officer if it changes.'
  if (mode === 'handover') return 'Handover report could not be written. Send the event log instead.'
  return mode === 'emergency' ? 'Keep following the step on screen.' : 'Sorry, I don’t have an answer for that. Try asking it another way.'
}

/* ------------------------------------------------------------------ */
/* Handler (shared by Vercel and the Vite dev server)                   */
/* ------------------------------------------------------------------ */

const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

function validate(b: unknown): AssistantRequest | null {
  if (!b || typeof b !== 'object') return null
  const r = b as Partial<AssistantRequest>
  if (r.mode !== 'emergency' && r.mode !== 'ask' && r.mode !== 'handover' && r.mode !== 'skin') return null
  if (!Array.isArray(r.messages) || r.messages.length === 0 || r.messages.length > 24) return null
  for (const m of r.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'model') || typeof m.text !== 'string' || m.text.length > 2000) return null
  }
  if (r.messages.at(-1)!.role !== 'user') return null
  if (JSON.stringify(r.context ?? null).length > 24000) return null
  if (r.mode === 'skin') {
    if (!Array.isArray(r.images) || r.images.length < 1 || r.images.length > 2) return null
    for (const im of r.images) {
      if (!im || typeof im.label !== 'string' || im.label.length > 200 || typeof im.dataUrl !== 'string') return null
      if (!IMAGE_RE.test(im.dataUrl) || im.dataUrl.length > 1_500_000) return null
    }
  } else if (r.images !== undefined) return null
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

  // Skin mode: put the photos in front of the final text, each with its label.
  if (req.images?.length) {
    const lastMsg = out.at(-1)!
    const blocks: Anthropic.ContentBlockParam[] = []
    for (const im of req.images) {
      const m = IMAGE_RE.exec(im.dataUrl)!
      blocks.push({ type: 'text', text: im.label })
      blocks.push({ type: 'image', source: { type: 'base64', media_type: `image/${m[1]}` as 'image/jpeg' | 'image/png' | 'image/webp', data: im.dataUrl.slice(im.dataUrl.indexOf(',') + 1) } })
    }
    blocks.push({ type: 'text', text: lastMsg.content as string })
    lastMsg.content = blocks
  }
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
        system: { emergency: EMERGENCY_PROMPT, handover: HANDOVER_PROMPT, skin: SKIN_PROMPT, ask: ASK_PROMPT }[req.mode],
        ...(req.mode === 'emergency' || req.mode === 'ask' ? { tools: req.mode === 'emergency' ? EMERGENCY_TOOLS : ASK_TOOLS } : {}),
        messages: toMessages(req),
      },
      { timeout: 25_000 },
    )

    if (res.stop_reason === 'refusal') {
      const msg = req.mode === 'skin' ? 'LEVEL: watch\nI can’t assess these photos. Show them to your Crew Medical Officer.' : 'I can’t help with that here. Keep following the step-by-step guide and contact your Crew Medical Officer.'
      return { status: 200, body: { ok: true, text: msg, actions: [], model: useModel } }
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
