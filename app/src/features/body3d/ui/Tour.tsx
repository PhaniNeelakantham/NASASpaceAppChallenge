import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const STEPS: { title: string; body: string; place: string }[] = [
  {
    title: 'This is you',
    body: 'The body shows how each part of you is doing today. Calm blue means fine. Amber ▲ means keep an eye on it. Red ◆ means act now.',
    place: 'left-1/2 top-[38%] -translate-x-1/2',
  },
  {
    title: 'Start here, every time',
    body: 'The panel on the left tells you what to do next, one step at a time. Press the big button on the current step.',
    place: 'left-[330px] top-24',
  },
  {
    title: 'Tap a glowing point',
    body: 'Tap once for a quick summary. Tap again (or press “Full details”) for history, the step-by-step procedure, and who to contact.',
    place: 'left-1/2 top-[30%] translate-x-[40px]',
  },
  {
    title: 'Where you are changes the advice',
    body: 'Pick your environment at the top — station, spacecraft, rover, Moon or Mars base. HALO changes your priorities and how to reach help.',
    place: 'left-[330px] top-3',
  },
]

/** Short first-visit walkthrough. Shown once; replay with the ? button. */
export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0)
  const last = i === STEPS.length - 1
  const close = () => {
    setI(0)
    onClose()
  }
  const s = STEPS[i]
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-space-950/55"
          onPointerDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="How to use HALO"
        >
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass absolute w-[min(360px,calc(100%-24px))] p-5 ${s.place}`}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              How HALO works · {i + 1} of {STEPS.length}
            </div>
            <h2 className="mt-1 text-xl font-bold">{s.title}</h2>
            <p className="mt-2 text-[15px] leading-snug text-ink/90">{s.body}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={close} className="hud-btn flex-1 border border-white/15 text-ink-dim">
                Skip
              </button>
              <button onClick={() => (last ? close() : setI(i + 1))} className="hud-btn flex-[2] bg-accent font-bold text-space-950">
                {last ? 'Got it' : 'Next ›'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
