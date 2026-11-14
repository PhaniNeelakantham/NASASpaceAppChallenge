# HALO — Health Autonomy for Long-duration Operations

NASA Space Apps Challenge 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*

> Prototype decision-support tool, **not a medical device**. Crew data is simulated unless marked as NASA data.

Design doc: [DESIGN.md](DESIGN.md)

## Run it
```bash
cd app
npm install
npm run dev     # http://localhost:5173
```

### Keys (optional, private)
Copy `app/.env.example` → `app/.env.local` (git-ignored) and fill in:
- `CLAUDE_API_KEY` — Claude API key from https://console.anthropic.com, powers the AI copilot / Ask HALO (Claude Haiku 5.5). Without it, the app falls back to the offline step-by-step guides.
- `VITE_NASA_API_KEY` — optional free key from https://api.nasa.gov for live DONKI space weather.
- `CLAUDE_MODEL` — optional, defaults to `claude-haiku-5-5` (cheapest current Claude model).

## Deploy (Vercel)
1. Import the GitHub repo in Vercel and set **Root Directory = `app`** (framework: Vite — detected automatically).
2. In *Settings → Environment Variables* add `CLAUDE_API_KEY` (and optionally `VITE_NASA_API_KEY`, `CLAUDE_MODEL`).
3. Deploy. `app/api/assistant.ts` becomes the serverless route `/api/assistant`, so the Claude API key never reaches the browser.

## AI use (Space Apps disclosure)
- **In the product:** the emergency copilot and "Ask HALO" call Anthropic's Claude Haiku 5.5 through our own server route (one call per message, low effort). The model only *proposes* actions (start a guide, answer the current step, open a body system); a crew member confirms each one. Guides, thresholds and procedures are written content, not generated at runtime. Prototype only — not a medical device.
- **In development:** AI coding assistants (Claude) helped write code and text; the team chose the idea, reviewed and edited the output. Generated images/video (if any) must carry a visible watermark.

## Layout
```
app/                      React + TypeScript (Vite, Tailwind v4, Recharts, Framer Motion, Dexie)
  src/types.ts            shared types (Reading, Finding, Status…)
  src/content/            metrics.ts (draft thresholds) · systems.ts (HRP risk text, actions, escalation)
  src/engine/             baseline.ts · rules.ts (status engine) · summary.ts (template summaries)
  src/data/               syntheticCrew.ts (deterministic simulated crew, demo scenarios)
  src/state/mission.ts    environments + Earth signal delay
  src/features/body3d/    interactive 3D holographic body (React Three Fiber)
    anatomy/              CC0 muscle + skeleton GLB models (public/models), body plan, holo/flow shaders, 4 peelable layers
    nodes/                health nodes (pulse rings, satellites, labels), HUD card, node/zone config
    scene/                canvas, camera rig (right-drag orbit, inertia, zone fly-to), platform, scan beam
    ui/                   layer peel control, zone pills, detail panel (2nd tap)
    health.ts             per-system view model (status, primary metric, one-line trend)
  src/features/emergency/ emergency guide (protocols in src/content/emergency.ts), CPR coach, AI copilot
  src/ai/                 assistant client, offline keyword fallback, voice input
  api/assistant.ts        server route (Vercel Function + Vite dev middleware) → Claude Haiku 5.5; key stays server-side
  src/features/           checkin · trends · radiation · learn
data/                     models-raw/ (original CC0 GLBs, not shipped) · Python: OSDR Inspiration4 download/cleaning, synthetic crew generator, DONKI snapshot
docs/                     model card, references, AI-use disclosure
```

## Owners (fill in)
| Area | Owner |
|---|---|
| App shell, design system, body map | |
| Check-in, trends, action cards | |
| Data pipeline + ML (Python) | |
| Science content + citations | |
| Video, slides, project page | |

## Next TODOs
- [ ] Persist check-ins to IndexedDB (Dexie) and feed them into `evaluate()`
- [ ] Python: export real OSDR Inspiration4 CBC data → `app/public/data/i4_cbc.json`; add "Mission replay" mode
- [ ] Python: DONKI snapshot → `app/public/data/donki_snapshot.json`; radiation banner
- [ ] Mars-mode escalation: delayed message queue with countdown
- [ ] Symptom chips, Amsler-grid vision test, PVT-B reaction test
- [ ] Verify every threshold in `content/metrics.ts` and add citations
- [ ] Deploy to Vercel early; test in a private window
- [ ] AI-use disclosure in `docs/`
