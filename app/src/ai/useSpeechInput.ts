import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typing for the browser Speech Recognition API (Chrome/Edge expose it as webkitSpeechRecognition).
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type Ctor = new () => SpeechRecognitionLike

function getCtor(): Ctor | null {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Push-to-talk speech input. In Chrome the audio is sent to Google's speech service for transcription.
 * `onFinal` receives the finished sentence; `interim` shows live text while speaking.
 */
export function useSpeechInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<SpeechRecognitionLike | null>(null)
  const supported = typeof window !== 'undefined' && getCtor() !== null
  const finalCb = useRef(onFinal)
  finalCb.current = onFinal

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    const C = getCtor()
    if (!C) return
    window.speechSynthesis?.cancel() // don't transcribe our own voice
    const r = new C()
    r.lang = 'en-US'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      let text = ''
      let final = false
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
        if (e.results[i].isFinal) final = true
      }
      setInterim(text)
      if (final) {
        finalCb.current(text.trim())
        setInterim('')
      }
    }
    r.onerror = (e) => {
      // Silence and our own stop() are normal, not errors (hands-free mode restarts listening).
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : `Voice input error: ${e.error}`)
    }
    r.onend = () => setListening(false)
    rec.current = r
    setError(null)
    setListening(true)
    r.start()
  }, [])

  useEffect(() => () => rec.current?.stop(), [])
  return { supported, listening, interim, error, start, stop }
}

export type SpeechInput = ReturnType<typeof useSpeechInput>
