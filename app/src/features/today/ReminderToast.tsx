import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { usePersistentState } from '../../state/persist'
import { useRoutine } from '../../state/routine'

/**
 * Routine reminders, shown on every tab except Today.
 * The full reminder card appears only the first time (remembered in this browser); after that,
 * due tasks show as a compact "View reminders" button that opens the Today tab.
 */
export function ReminderToast({ onOpen }: { onOpen: () => void }) {
  const { reminders, snooze } = useRoutine()
  const [introSeen, setIntroSeen] = usePersistentState('halo.reminders.introSeen', false)
  const task = reminders[0]

  const open = () => {
    setIntroSeen(true)
    onOpen()
  }

  return (
    <AnimatePresence>
      {task && !introSeen && (
        <motion.div
          key="intro"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="glass fixed bottom-20 right-4 z-30 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 border-accent/40 p-4"
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            <span className="section-h !mb-0 flex-1 text-accent">Routine reminder{reminders.length > 1 ? ` · ${reminders.length} due` : ''}</span>
            <button onClick={() => setIntroSeen(true)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-dim hover:bg-white/5 hover:text-ink" aria-label="Dismiss reminder">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="font-semibold">{task.label}</div>
          <div className="text-xs text-ink-dim">{task.howTo}</div>
          <div className="text-[11px] text-ink-dim">Next time, due tasks appear as a small “View reminders” button.</div>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => {
                snooze(task.id, 30)
                setIntroSeen(true)
              }}
              className="min-h-10 flex-1 rounded-lg bg-space-800 text-sm text-ink-dim hover:text-ink"
            >
              Snooze 30 min
            </button>
            <button onClick={open} className="min-h-10 flex-1 rounded-lg bg-accent text-sm font-semibold text-space-950">
              Open Today
            </button>
          </div>
        </motion.div>
      )}

      {task && introSeen && (
        <motion.button
          key="pill"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={open}
          className="glass fixed bottom-20 right-4 z-30 flex min-h-12 items-center gap-2 px-4 text-sm font-semibold text-accent hover:brightness-125"
          aria-label={`View reminders: ${reminders.length} due`}
        >
          <Bell className="h-4 w-4" aria-hidden />
          View reminders
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-space-950">{reminders.length}</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
