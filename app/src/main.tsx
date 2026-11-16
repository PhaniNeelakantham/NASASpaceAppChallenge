import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Landing } from './landing/Landing'

// The app (with the 3D body) only downloads when someone opens /app, so the landing page loads fast.
const App = lazy(() => import('./App.tsx'))
const inApp = window.location.pathname.replace(/\/+$/, '').startsWith('/app')

// No StrictMode: its dev-only double mount fights drei <Html> portals (spurious "unmount a root" errors).
createRoot(document.getElementById('root')!).render(
  inApp ? (
    <Suspense fallback={<div className="grid h-full place-items-center font-mono text-xs uppercase tracking-[0.3em] text-ink-dim">Starting HALO…</div>}>
      <App />
    </Suspense>
  ) : (
    <Landing />
  ),
)
