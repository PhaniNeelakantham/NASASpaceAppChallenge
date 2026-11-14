import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode: its dev-only double mount fights drei <Html> portals (spurious "unmount a root" errors).
createRoot(document.getElementById('root')!).render(<App />)
