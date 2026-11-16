import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, MotionConfig, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  CircleCheck,
  FileText,
  Hand,
  Mic,
  Radio,
  WifiOff,
} from 'lucide-react'
import { ENVIRONMENT_LIST, formatDelay } from '../state/mission'

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const APP_URL = '/app'

/** Opens the app on a given tab (the app remembers its tab in localStorage). */
function openApp(tab?: string) {
  try {
    if (tab) localStorage.setItem('halo.app.tab', JSON.stringify(tab))
  } catch {
    /* storage blocked: the app just opens on its default tab */
  }
  window.location.href = APP_URL
}

function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const ring = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8'
  return (
    <span className="inline-flex items-center gap-3">
      <span className={`grid ${ring} place-items-center rounded-full border border-accent/60 shadow-[0_0_18px_-4px_var(--color-accent)]`}>
        <span className="h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className={`font-mono font-bold tracking-[0.45em] text-accent ${size === 'lg' ? 'text-xl' : 'text-base'}`}>HALO</span>
    </span>
  )
}

/** Fades and lifts its children in when they scroll into view. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** HUD-style corner brackets around a box. */
function Brackets() {
  const c = 'pointer-events-none absolute h-3 w-3 border-ink-dim/60'
  return (
    <>
      <span className={`${c} left-0 top-0 border-l border-t`} />
      <span className={`${c} right-0 top-0 border-r border-t`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} />
    </>
  )
}

/** A screenshot in a thin app-window frame. */
function Shot({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-space-900 shadow-[0_40px_120px_-40px_rgba(125,211,252,0.35)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/5 bg-space-800/80 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
      </div>
      <img src={src} alt={alt} width={2160} height={1350} loading="lazy" className="block h-auto w-full" />
    </div>
  )
}

function Eyebrow({ n, children, tone = 'text-accent' }: { n?: string; children: ReactNode; tone?: string }) {
  return (
    <div className={`flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] ${tone}`}>
      {n && <span className="h-px w-8 bg-current" />}
      {n && <span>{n}</span>}
      <span className={n ? 'text-ink-dim' : ''}>{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Heartbeat pieces: ECG trace, crew monitor and counting numbers      */
/* ------------------------------------------------------------------ */

/** An ECG trace across a 1200 x 100 box: flat line, then a heartbeat every 240 units. */
function ecgPath(width = 1200, every = 240, base = 60) {
  let d = `M0 ${base}`
  for (let x = 40; x + 160 <= width; x += every) {
    d += ` L${x} ${base} Q${x + 12} ${base - 10} ${x + 24} ${base} L${x + 44} ${base} L${x + 50} ${base + 8} L${x + 58} ${base - 52} L${x + 66} ${base + 22} L${x + 72} ${base} L${x + 96} ${base} Q${x + 112} ${base - 16} ${x + 128} ${base}`
  }
  return `${d} L${width} ${base}`
}
const ECG_PATH = ecgPath()

/** Bedside-monitor style readout for the demo crew member. */
function CrewMonitor() {
  const read = [
    { label: 'Heart rate', value: '72', unit: 'bpm', tone: 'text-nominal' },
    { label: 'SpO₂', value: '98', unit: '%', tone: 'text-accent' },
    { label: 'Temp', value: '38.6', unit: '°C', tone: 'text-warning' },
    { label: 'Earth link', value: '18:40', unit: 'min', tone: 'text-caution' },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_20px_80px_-30px_rgba(45,212,191,0.35)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-sm font-semibold">Crew Medical Officer · Day 142</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-nominal">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nominal" /> Live demo
        </span>
      </div>
      <svg viewBox="0 0 1200 100" preserveAspectRatio="none" className="h-14 w-full bg-nominal/[0.03]" aria-hidden>
        <path d={ECG_PATH} fill="none" stroke="rgba(45,212,191,0.25)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d={ECG_PATH} pathLength={1} fill="none" stroke="var(--color-nominal)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" className="ecg-sweep" />
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {read.map((r, i) => (
          <div key={r.label} className={`px-4 py-3 ${i > 0 ? 'sm:border-l' : ''} ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t sm:border-t-0' : ''} border-white/10`}>
            <div className="text-[11px] text-ink-dim">{r.label}</div>
            <div className={`mt-0.5 font-mono text-2xl font-semibold ${r.tone}`}>
              {r.value}
              <span className="ml-1 text-xs font-normal text-ink-dim">{r.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    id: 'body',
    img: '/landing/body.webp',
    eyebrow: 'Body map',
    title: 'The Body Map',
    text: 'A 3D body lights up each system by its status. Tap a point to see the reading, how far it is from your own normal, and what to do now. You can also log pain on specific parts of the body.',
    points: ['Highly Interactive', 'Priorities change with the mission environment', 'Pain map and guided ultrasound self-scans'],
  },
  {
    id: 'today',
    img: '/landing/today.webp',
    eyebrow: 'Daily routine',
    title: 'Daily Routine',
    text: 'Gives the Astronauts everything they need to do for the day. This is all gamified for increased engagement from them.',
    points: ['Reminders and streaks keep data coming in', 'Rest days count when you have a fever', 'Milestones for long-term adherence'],
  },
  {
    id: 'checkin',
    img: '/landing/checkin.webp',
    eyebrow: 'Check-in',
    title: 'Measuring Vitals to keep Health in check',
    text: 'Step-by-step questions with how to measure each one. Answer by voice, hands free, or measure your pulse with the camera.',
    points: ['Hands-free voice answers', 'Camera pulse check, compared with the Bio-Monitor', 'Every answer becomes a trend'],
  },
  {
    id: 'care',
    img: '/landing/care.webp',
    eyebrow: 'Care tools',
    title: 'Take Care of Yourself',
    text: 'Daily skin photos compared by AI, an Amsler grid for eye changes, buddy checks, a private journal, the med kit and a landing readiness test.',
    points: ['AI photo check: change tracking, not diagnosis', 'Buddy check catches what people underreport', 'Med kit stock, expiry and dose log'],
  },
  {
    id: 'trends',
    img: '/landing/trends.webp',
    eyebrow: 'Trends',
    title: 'Check your measurements against the baseline',
    text: 'Every metric is shown against a personal baseline band with caution and warning limits, so slow changes stand out early.',
    points: ['Personal baselines, not population averages', 'Real Inspiration4 blood data from NASA OSDR', 'Flags say why and what to do'],
  },
  {
    id: 'radiation',
    img: '/landing/radiation.webp',
    eyebrow: 'Radiation',
    title: 'Keep track of Radiation and Space Weather',
    text: 'Solar flares, CMEs and particle events from NASA DONKI become plain guidance: when to shelter, and what your daily dose looks like where you are.',
    points: ['Live NASA DONKI feed, with an offline snapshot', 'Dose by environment from published measurements', 'Shelter steps when a storm arrives'],
  },
]

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Landing() {
  const heroShot = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroShot, offset: ['start end', 'center center'] })
  const tilt = useTransform(scrollYProgress, [0, 1], [24, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1])
  const [active, setActive] = useState(0)

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-copy relative min-h-full overflow-x-clip bg-space-950 text-ink">
        {/* starfield + glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 12% 18%, #fff8 50%, transparent 51%), radial-gradient(1px 1px at 72% 9%, #fff6 50%, transparent 51%), radial-gradient(1.5px 1.5px at 88% 42%, #fff5 50%, transparent 51%), radial-gradient(1px 1px at 33% 64%, #fff5 50%, transparent 51%), radial-gradient(1px 1px at 58% 33%, #fff4 50%, transparent 51%), radial-gradient(1px 1px at 8% 82%, #fff4 50%, transparent 51%)',
            backgroundSize: '600px 600px, 700px 700px, 800px 800px, 500px 500px, 900px 900px, 650px 650px',
          }}
        />

        {/* nav */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-space-950/70 backdrop-blur-md">
          <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
            <a href="/" aria-label="HALO home">
              <Logo />
            </a>
            <div className="ml-auto hidden items-center gap-6 text-sm text-ink-dim md:flex">
              <a href="#how" className="hover:text-ink">How it works</a>
              <a href="#emergency" className="hover:text-ink">Emergency</a>
              <a href="#data" className="hover:text-ink">Data</a>
            </div>
            <button onClick={() => openApp()} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-space-950 hover:brightness-110 md:ml-0">
              Launch HALO <ArrowRight className="h-4 w-4" />
            </button>
          </nav>
        </header>

        {/* hero */}
        <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-8 sm:pt-24">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-nominal"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nominal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-nominal" />
            </span>
            <span>
              NASA Space Apps Challenge 2026 <span className="text-ink-dim">·</span> Create Health Monitoring Software for Astronauts on Space Missions
            </span>
          </motion.h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <p className="max-w-xl text-xl font-semibold sm:text-2xl">Where astronaut health monitoring meets emergency guidance.</p>
              <p className="mt-4 max-w-xl leading-relaxed text-ink-dim">
                HALO watches each crew member's health at each part of their body, explains what changed and what to do, and talks the crew through a medical emergency
                when the flight surgeon is too far away to help in time.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => openApp()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-space-950 hover:brightness-110">
                  Launch HALO <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#how" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-6 font-semibold hover:bg-white/5">
                  See how it works
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.45 }} className="lg:w-[500px]">
              <CrewMonitor />
            </motion.div>
          </div>

          {/* hero screenshot that flattens as you scroll */}
          <div ref={heroShot} className="mt-20 [perspective:1600px]">
            <motion.div style={{ rotateX: tilt, scale }} className="origin-top">
              <Shot src="/landing/body.webp" alt="HALO body map with the immune system flagged and its summary card open" />
            </motion.div>
          </div>
        </section>

        {/* how it works: sticky screenshot that swaps as you scroll */}
        <section id="how" className="relative scroll-mt-20 border-t border-white/5">
          <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
            <Reveal>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="display mt-4 max-w-4xl text-[length:clamp(2.2rem,5.6vw,4.6rem)]">One app for everything Health-related</h2>
            </Reveal>
          </div>

          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.id}
                  onViewportEnter={() => setActive(i)}
                  viewport={{ amount: 0.6 }}
                  className="flex min-h-[70vh] flex-col justify-center py-10"
                >
                  <div className={`transition-opacity duration-500 lg:opacity-40 ${active === i ? 'lg:!opacity-100' : ''}`}>
                    <Eyebrow n={`0${i + 1}`}>{s.eyebrow}</Eyebrow>
                    <h3 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{s.title}</h3>
                    <p className="mt-4 leading-relaxed text-ink-dim">{s.text}</p>
                    <ul className="mt-5 space-y-2 font-sans">
                      {s.points.map((p) => (
                        <li key={p} className="flex gap-2 text-sm">
                          <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-nominal" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => openApp(s.id)} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                      Open {s.eyebrow.toLowerCase()} in HALO <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  {/* phones and tablets: the image sits under its text */}
                  <Shot src={s.img} alt={`HALO ${s.eyebrow} screen`} className="mt-8 lg:hidden" />
                </motion.div>
              ))}
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-[calc(50vh-210px)]">
                <div className="relative">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={STEPS[active].id}
                      initial={{ opacity: 0, y: 40, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -40, scale: 0.97 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Shot src={STEPS[active].img} alt={`HALO ${STEPS[active].eyebrow} screen`} />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="mt-5 flex justify-center gap-2" aria-hidden>
                  {STEPS.map((s, i) => (
                    <span key={s.id} className={`h-1 rounded-full transition-all duration-500 ${i === active ? 'w-8 bg-accent' : 'w-3 bg-white/15'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* emergency spotlight */}
        <section id="emergency" className="relative scroll-mt-20 overflow-hidden border-y border-warning/20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Reveal>
              <Eyebrow tone="text-warning">Emergency mode</Eyebrow>
              <h2 className="display mt-4 text-[length:clamp(2rem,3.5vw,3rem)]">
                Help during <span className="text-warning">Emergency</span>
              </h2>
              <p className="mt-6 leading-relaxed text-ink-dim">
                One red button opens a full-screen guide. HALO asks who needs help and what is happening, then coaches the rescuer one step at a time,
                like an emergency dispatcher.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Mic, t: 'Talk or type', d: 'Hands-free voice, with steps read aloud.' },
                  { icon: Hand, t: 'You confirm every step', d: 'AI suggestions follow the checked guide. Nothing happens without a tap or a "yes".' },
                  { icon: FileText, t: 'Handover in one tap', d: 'Writes the report for the flight surgeon from the live log.' },
                  { icon: WifiOff, t: 'Works offline', d: 'If the AI is unreachable, the step-by-step guide still runs.' },
                ].map(({ icon: I, t, d }) => (
                  <li key={t} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <I aria-hidden className="h-5 w-5 text-warning" />
                    <div className="mt-2 font-semibold">{t}</div>
                    <div className="mt-1 text-sm text-ink-dim">{d}</div>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.15}>
              <Shot src="/landing/emergency.webp" alt="HALO emergency mode: AI copilot above the first step of the collapse guide" className="shadow-[0_40px_120px_-40px_rgba(255,90,78,0.45)]" />
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim">
                <Bot aria-hidden className="h-3.5 w-3.5" /> Prototype copilot uses Claude Haiku, not a medical device
              </p>
            </Reveal>
          </div>
        </section>

        {/* environments */}
        <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-8">
          <Reveal>
            <Eyebrow>Built for all missions</Eyebrow>
            <h2 className="display mt-4 max-w-4xl text-[length:clamp(2.2rem,5.6vw,4.6rem)]">From orbit to Mars.</h2>
            <p className="mt-6 max-w-2xl leading-relaxed text-ink-dim">
              Based on the crew's location, HALO chooses which body systems matter most, how long communication with Earth takes, and what data to use.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ENVIRONMENT_LIST.map((e, i) => (
              <Reveal key={e.id} delay={i * 0.08}>
                <div className="relative h-full p-5">
                  <Brackets />
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim">{e.kind}</div>
                  <div className="mt-1 font-semibold leading-snug">{e.label}</div>
                  <div className={`mt-4 font-mono text-2xl ${e.oneWayDelaySec > 60 ? 'text-caution' : 'text-nominal'}`}>{formatDelay(e.oneWayDelaySec)}</div>
                  <div className="text-xs text-ink-dim">to Earth, one way · {e.gravity}</div>
                  <div className="mt-4 flex items-start gap-2 text-xs text-ink-dim">
                    <Radio aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    {e.escalation.firstContact}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12">
            <Shot src="/landing/mars.webp" alt="HALO body map on a Mars base, with Mars priorities highlighted" />
          </Reveal>
        </section>

        {/* /* built for the cabin
        <section className="relative border-t border-white/5">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[auto_1fr]">
            <Reveal className="mx-auto w-[230px]">
              <div className="overflow-hidden rounded-[2rem] border-4 border-space-700 shadow-[0_30px_80px_-30px_rgba(125,211,252,0.4)]">
                <img src="/landing/phone.webp" alt="HALO check-in on a phone" width={780} height={1688} loading="lazy" className="block h-auto w-full" />
              </div>
            </Reveal>
            <div>
              <Reveal>
                <Eyebrow>Designed for the cabin</Eyebrow>
                <h2 className="display mt-4 text-[length:clamp(2rem,4.6vw,3.8rem)]">Clear under stress.</h2>
              </Reveal>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, t: 'Explain, never diagnose', d: 'Every flag says why, what to do now, when to escalate, and the source.' },
                  { icon: Activity, t: 'Your normal, not an average', d: 'Alerts compare each reading with that crew member’s own baseline.' },
                  { icon: Stethoscope, t: 'Big targets, colour plus shape', d: 'Works with gloves, under stress, and for colourblind crew.' },
                  { icon: WifiOff, t: 'Offline first', d: 'Data stays on the device. NASA data is cached so the demo never depends on a connection.' },
                ].map(({ icon: I, t, d }, i) => (
                  <Reveal key={t} delay={i * 0.08}>
                    <div className="flex gap-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10">
                        <I aria-hidden className="h-5 w-5 text-accent" />
                      </span>
                      <div>
                        <div className="font-semibold">{t}</div>
                        <div className="mt-1 text-sm leading-relaxed text-ink-dim">{d}</div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section> */}

        {/* final CTA */}
        <section className="relative overflow-hidden border-t border-white/5">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/15 shadow-[0_0_120px_-20px_rgba(125,211,252,0.35)]" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/10" />
          <Reveal className="relative mx-auto max-w-4xl px-4 py-32 text-center sm:px-8">
            <h2 className="display text-[length:clamp(2.4rem,6.4vw,5.4rem)]">Ready to see HALO?</h2>
            <p className="mx-auto mt-6 max-w-xl text-ink-dim">Runs in the browser. Demo crew data is preloaded, so you can explore every screen right away.</p>
            <button onClick={() => openApp()} className="mt-10 inline-flex min-h-14 items-center gap-2 rounded-xl bg-accent px-8 text-lg font-semibold text-space-950 hover:brightness-110">
              Launch <ArrowRight className="h-5 w-5" />
            </button>
          </Reveal>
        </section>

        <Footer />
      </div>
    </MotionConfig>
  )
}

/* ------------------------------------------------------------------ */
/* Footer: data used, research, and what is simulated                  */
/* ------------------------------------------------------------------ */

type FooterLink = { label: string; href?: string; tab?: string; note?: string }

const FOOTER: { title: string; links: FooterLink[] }[] = [
  {
    title: 'The app',
    links: [
      { label: 'Body map', tab: 'body' },
      { label: 'Daily routine', tab: 'today' },
      { label: 'Check-in', tab: 'checkin' },
      { label: 'Care tools', tab: 'care' },
      { label: 'Trends', tab: 'trends' },
      { label: 'Radiation', tab: 'radiation' },
    ],
  },
  {
    title: 'Data we used',
    links: [
      { label: 'NASA OSDR · Inspiration4 blood counts (OSD-569)', href: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-569' },
      { label: 'NASA DONKI · flares, CMEs, particle events', href: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
      { label: 'Published dose rates · Curiosity RAD, Chang’e-4 LND, ISS' },
      { label: '3D anatomy models · grab3d.com (CC0)', href: 'https://grab3d.com/models/anatomy/human-skeleton/' },
    ],
  },
  {
    title: 'Research',
    links: [
      { label: 'NASA Human Research Program · Risks of Human Spaceflight', href: 'https://www.nasa.gov/hrp/risks/' },
      { label: 'NASA HRP · five hazards of human spaceflight' },
      { label: 'CSA · Monitoring radiation for astronaut health; Bio-Monitor' },
      { label: 'NASA Reaction Self-Test (PVT-B, Basner et al.)' },
      { label: 'NASA-STD-3001 · Human Integration Design Handbook' },
      { label: 'NASA Earth-Independent Medical Operations (EIMO)' },
    ],
  },
  {
    title: 'Simulated in this prototype',
    links: [
      { label: 'Crew of four: vitals, check-ins and symptoms' },
      { label: 'Flight surgeon replies (real signal delays)' },
      { label: 'Personal radiation dose estimate' },
      { label: 'Demo skin photos, journal, buddy checks and med kit' },
    ],
  },
]

function Footer() {
  return (
    <footer id="data" className="relative scroll-mt-20 border-t border-white/10 bg-[#070b17]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.2fr_0.8fr_1.3fr_1.3fr_1.1fr]">
        <div>
          <Logo size="lg" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-dim">
            Health monitoring and emergency guidance for astronauts on missions where communication with Earth is minutes away. Every screen marks whether its numbers are real NASA data or
            simulated.
          </p>
          <button onClick={() => openApp()} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            Launch HALO <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {FOOTER.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-dim">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.tab ? (
                    <button onClick={() => openApp(l.tab)} className="text-left hover:text-ink">
                      {l.label}
                    </button>
                  ) : l.href ? (
                    <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-ink">
                      {l.label}
                    </a>
                  ) : (
                    <span>{l.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-white/10 px-4 py-6 text-xs text-ink-dim sm:px-8 md:flex-row md:justify-between">
        <p>
          Built for the{' '}
          <a href="https://www.spaceappschallenge.org/" target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
            NASA Space Apps Challenge 2026
          </a>{' '}
          by Apollo Coders
        </p>
        <p className="md:text-right">
          Prototype decision support, not a medical device. AI chatbot features use the Claude API (Anthropic). Not affiliated with or endorsed by NASA.
        </p>
      </div>
    </footer>
  )
}
