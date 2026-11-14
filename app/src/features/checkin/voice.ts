import { useCallback, useEffect, useRef, useState } from 'react'

// Hands-free check-in: HALO reads each question aloud and listens for the number.
// In weightlessness one hand is often busy holding on, so voice input matters.

const ONES: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const FIX: Record<string, string> = { to: 'two', too: 'two', for: 'four', won: 'one', ate: 'eight', tree: 'three', fourty: 'forty' }

/** Number words for 0–999, e.g. "one hundred twenty", "seventy two", and BP-style "one twenty". */
function wordsToInt(words: string[]): number | null {
  const ws = words.filter((w) => w !== 'and')
  if (!ws.length || ws.some((w) => !(w in ONES || w in TENS || w === 'hundred'))) return null
  // "one twenty" = 120: a single digit followed by a two-digit number, no "hundred".
  if (!ws.includes('hundred') && ws.length >= 2 && ONES[ws[0]] !== undefined && ONES[ws[0]] > 0 && ONES[ws[0]] < 10 && (ws[1] in TENS || ONES[ws[1]] >= 10)) {
    const rest = wordsToInt(ws.slice(1))
    return rest === null ? null : ONES[ws[0]] * 100 + rest
  }
  let total = 0
  let cur = 0
  for (const w of ws) {
    if (w === 'hundred') {
      total += (cur || 1) * 100
      cur = 0
    } else cur += ONES[w] ?? TENS[w]
  }
  return total + cur
}

/** Parse a spoken answer into a number. Returns null if no number was heard. */
export function parseSpokenNumber(raw: string): number | null {
  const n = parseCore(raw)
  return n !== null && /\band a half\b/i.test(raw) ? n + 0.5 : n
}

function parseCore(raw: string): number | null {
  const text = raw.toLowerCase().replace(/,/g, '').trim()
  const digits = text.match(/-?\d+(?:\.\d+)?/)
  if (digits) {
    // "38 point 4" style
    const after = text.slice((digits.index ?? 0) + digits[0].length).match(/^\s*(?:point|dot)\s*(\d|\w+)/)
    if (after && !digits[0].includes('.')) {
      const dec = /\d/.test(after[1]) ? Number(after[1]) : ONES[FIX[after[1]] ?? after[1]]
      if (dec !== undefined && !Number.isNaN(dec)) return Number(`${digits[0]}.${dec}`)
    }
    return Number(digits[0])
  }
  const words = text
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => FIX[w] ?? w)
  const pi = words.indexOf('point')
  const numWords = (ws: string[]) => ws.filter((w) => w in ONES || w in TENS || w === 'hundred' || w === 'and')
  if (pi >= 0) {
    const whole = wordsToInt(numWords(words.slice(0, pi)))
    const decWord = words.slice(pi + 1).find((w) => w in ONES)
    if (whole !== null && decWord) return Number(`${whole}.${ONES[decWord]}`)
  }
  // Take the longest run of number words.
  let best: number | null = null
  let run: string[] = []
  const flush = () => {
    const v = wordsToInt(run)
    if (v !== null) best = v
    run = []
  }
  for (const w of words) {
    if (w in ONES || w in TENS || w === 'hundred' || (w === 'and' && run.length)) run.push(w)
    else flush()
  }
  flush()
  return best
}

export function parseCommand(raw: string): 'skip' | 'back' | 'repeat' | null {
  const t = raw.toLowerCase()
  if (/\b(skip|next|pass)\b/.test(t)) return 'skip'
  if (/\b(back|previous|go back)\b/.test(t)) return 'back'
  if (/\b(repeat|again|what)\b/.test(t)) return 'repeat'
  return null
}

// Minimal Web Speech API types (not in TypeScript's DOM library).
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}
interface Recognizer {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type RecognizerCtor = new () => Recognizer

function getRecognizer(): RecognizerCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const voiceSupported = () => typeof window !== 'undefined' && getRecognizer() !== null

export function speak(text: string, onDone?: () => void) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return onDone?.()
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.05
    u.onend = () => onDone?.()
    u.onerror = () => onDone?.()
    synth.speak(u)
  } catch {
    onDone?.()
  }
}

/** Listen once; calls onFinal with the transcript. */
export function useListener(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [error, setError] = useState('')
  const rec = useRef<Recognizer | null>(null)
  const cb = useRef(onFinal)
  useEffect(() => {
    cb.current = onFinal
  }, [onFinal])

  const stop = useCallback(() => {
    rec.current?.abort()
    rec.current = null
    setListening(false)
  }, [])

  const listen = useCallback(() => {
    const Ctor = getRecognizer()
    if (!Ctor) return setError('Voice input isn’t supported in this browser. Try Chrome or Safari.')
    rec.current?.abort()
    const r = new Ctor()
    r.lang = 'en-US'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1]
      const t = res[0].transcript
      setHeard(t)
      if (res.isFinal) cb.current(t)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Microphone access was blocked. Allow it in the browser to use voice.')
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError(`Voice error: ${e.error}`)
    }
    r.onend = () => setListening(false)
    rec.current = r
    setError('')
    setHeard('')
    setListening(true)
    try {
      r.start()
    } catch {
      setListening(false)
    }
  }, [])

  useEffect(() => () => rec.current?.abort(), [])
  return { listening, heard, error, listen, stop }
}
