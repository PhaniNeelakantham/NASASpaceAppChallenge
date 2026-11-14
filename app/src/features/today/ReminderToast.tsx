import { AnimatePresence, motion } from 'framer-motion'
import { useRoutine } from '../../state/routine'

/** Nudges the astronaut when a routine task is due. Shown on every tab except Today. */
export function ReminderToast({ onOpen }: { onOpen: () => void }) {
  const { reminders, snooze } = useRoutine()
  const task = reminders[0]
  return (
    <AnimatePresence>
      {task && (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="glass fixed bottom-20 right-4 z-30 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 border-accent/40 p-4"
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            <span className="section-h !mb-0 text-accent">Routine reminder{reminders.length > 1 ? ` · ${reminders.length} due` : ''}</span>
          </div>
          <div className="font-semibold">{task.label}</div>
          <div className="text-xs text-ink-dim">{task.howTo}</div>
          <div className="mt-1 flex gap-2">
            <button onClick={() => snooze(task.id, 30)} className="min-h-10 flex-1 rounded-lg bg-space-800 text-sm text-ink-dim hover:text-ink">
              Snooze 30 min
            </button>
            <button onClick={onOpen} className="min-h-10 flex-1 rounded-lg bg-accent text-sm font-semibold text-space-950">
              Open Today
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
