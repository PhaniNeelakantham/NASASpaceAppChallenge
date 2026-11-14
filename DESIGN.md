# HALO — Health Autonomy for Long-duration Operations
### Draft design · NASA Space Apps Challenge 2026 · "Create Health Monitoring Software for Astronauts on Space Missions"

> Status: draft v0.1 (Nov 14, 2026). Name is a placeholder; rename freely.
> Deadline: **Sunday Nov 15, 11:59 p.m. local time of your Local Event.**

---

## 1. What the research says (read this first)

### 1.1 The challenge, in its own words (official page)
- **Goal:** "a visual tool that helps astronauts assess their own health during space missions and provides guidance on treatments and health improvements."
- **Input can be anything:** keyboard, mouse clicks, **camera images**; any data that is a health indicator (e.g. blood sugar in mg/dL, ultrasound images).
- **Suggested indicators:** blood pressure, heart rate, blood sugar, body temperature, daily sleep hours, mood.
- **Questions they want answered:** Which measurements can be done in space? Why is the exam needed? How do spaceflight hazards affect each indicator? **When should a result go to the crew or to flight surgeons on the ground?** What actions prevent a critical condition?
- **UI is explicitly important.** They literally suggest: *"display a human figure where each part of the body is clickable and displays information about its function and health status."*
- **Optional extras they list (= free points if we do them):** different environments (spacecraft, station, rover, Moon/Mars base); prompting astronauts to take measurements as part of the routine; **gamification**; **dynamic charts over time**; **color coding**; simple instructions because "do not assume that astronauts know everything."
- **Official resources:** NASA HRP *5 Hazards*, *Risks of Human Spaceflight*, *Ongoing HRP Research*; CSA *Monitoring Radiation for Astronaut Health*; CSA *Why do we conduct science in space*.

### 1.2 How we get scored (2026 Judging & Awards Guide)
Each criterion is scored 1–5 at every level (local → global → executive):

| Criterion | What a "5" means | How HALO earns it |
|---|---|---|
| **Impact** | Significant problem, broad reach, could change the world | Earth-independent care for Moon/Mars crews **and** remote/rural patients on Earth (CSA says Bio-Monitor tech targets exactly that) |
| **Creativity** | Novel, not attempted before | Mission-environment switch with comm-delay escalation, camera-based self-exams, clickable body map |
| **Validity** | Scientifically sound, feasible, **usable & user-friendly** | Every threshold and action cites NASA HRP / literature; personal baselines; honest limits ("decision support, not diagnosis") |
| **Relevance** | Fully addresses challenge; **NASA data is core, not decoration** | Real OSDR Inspiration4 blood data, NASA DONKI space-weather feed, HRP risk content drives the body map |
| **Presentation** | Clear, engaging story; demo + full project page | 30-second video with a story ("Day 142, Mars transit, 18 min from Earth…"), polished live demo URL, strong README |

The guide explicitly warns teams to give **Presentation equal weight** to the other four.

### 1.3 Hard submission rules (do not lose on a technicality)
- Demo = **video ≤ 30 seconds** *or* **≤ 7 slides** (incl. title). Exceeding = ineligible for global judging.
- English on the page and linked materials (video can be another language with English subtitles).
- **Must use at least one NASA data/resource** to be eligible for a Global Award. Partner-agency data (CSA, ESA, JAXA, ISRO…) is encouraged.
- All links public, no login. Host the app (Vercel/GitHub Pages) and test in a private window.
- **AI ("Super Intelligence") disclosure:** allowed for code/assets, not for coming up with the idea. AI-generated images/video need a visible watermark; AI-generated code/data must be acknowledged in text/metadata. No NASA logos in generated content.
- List every external resource (libraries, images, models) in References.
- No images/video of anyone under 18.
- Max 6 team members, all registered at the same Local Event.

### 1.4 What wins (past global winners)
2025 global winners (from 18,860 teams) share a pattern:
- **Best Use of Science — SpaceGenes+**: made complex space-biology data (radiation × microgravity) accessible through *thoughtful design and data visualization*. Closest analogue to our challenge.
- **Best Use of Technology — Twisters/SkySense**: blended multiple NASA datasets in a clean pipeline into "an everyday assistant" with a simple question as its hook.
- **Galactic Impact — Astro Sweepers**: one memorable concept ("credit score for satellites") + a visually engaging prototype.
- **Best Mission Concept — PureFlow**: tested designs against real solar-threat data; "always puts crew safety first."
- **Art & Technology — Zumorroda-X**: a pixel game built on NASA data.

**Takeaways:** one crisp hook, real NASA data visibly driving the product, polish over feature count, and an emotional story. Awards we can realistically target: **Best Use of Science, Best Use of Data, Best Mission Concept, Galactic Impact, Most Inspirational.**

### 1.5 What other 2026 teams are already building (public GitHub)
At least 7 public repos for this exact challenge exist already. Common features:
personal baselines, NEWS2-style alert scores, the 3-minute PVT-B vigilance test, radiation dose tracking, offline operation, Streamlit dashboards, LLM chat assistants. The strongest one (AURORA) is an offline React/TypeScript PWA with encrypted storage, an Isolation-Forest anomaly model, real OSDR RadLab + NOAA radiation data, and a citation-only assistant.

**So "dashboard + baseline + alerts + chatbot" is now table stakes.** We should still do the solid core, but our score comes from what others are *not* doing (Section 3).

### 1.6 The science that should drive the product
NASA HRP's **5 hazards**: radiation, isolation & confinement, distance from Earth, altered gravity, hostile closed environment.

HRP **risks** we map to body systems:

| Body system (clickable region) | HRP risk | What we can measure in flight | Notes for guidance |
|---|---|---|---|
| Heart & vessels | Cardiovascular adaptations | HR, HRV, BP (cuff / Bio-Monitor shirt) | Fluid shift headward; orthostatic intolerance on return to gravity |
| Lungs / blood oxygen | Hypoxia (EVA prebreathe, low-O2 atmospheres) | SpO2 pulse oximeter, breathing rate | Relevant for EVA days |
| Eyes & brain | **SANS** (neuro-ocular; reported in ~70% of long-duration crew in some reviews) | **Amsler-grid + near-vision self test on screen**, headache log | Countermeasures are still research (LBNP, thigh cuffs) — say so |
| Bones | Spaceflight-induced bone loss (≈1–1.5%/month in hip/spine is the commonly cited NASA figure — verify before citing) | No DXA in flight → proxies: exercise load (ARED), calcium/vit D intake, hydration (kidney-stone risk) | Be honest: we track risk factors, not density |
| Muscles | Reduced cardiorespiratory & musculoskeletal fitness | Exercise minutes/loads, body mass (SLAMMD on ISS), step-test HR recovery | Gamify countermeasure exercise |
| Immune | Altered immune response, viral reactivation | Body temperature, symptoms (rash, cold sores), CBC on long missions | OSDR Inspiration4 CBC gives real reference shapes |
| Gut / nutrition | Inadequate food & nutrition | Meal log, body mass, **blood glucose** (challenge asks) | Spaceflight insulin resistance |
| Mind | Behavioral changes, inadequate teamwork | Mood/stress check-in, journaling | Underreporting is real — privacy matters |
| Sleep & alertness | Inadequate sleep & irregular schedules | Sleep hours (actigraphy), **PVT-B 3-min reaction test** (NASA calls it the *Reaction Self-Test* on ISS; lapse = ≥355 ms) | Ties to task-safety advice |
| Whole body | Radiation-induced cancer | Personal dosimeter dose vs **NASA career limit 600 mSv**; live solar particle events | Shelter recommendation during SEP events |
| Environment | Hostile closed environment | Cabin CO2 (headaches), temperature, noise | Correlate symptoms ↔ CO2 |

**Crew autonomy is NASA's own direction.** Mars one-way signal delay is up to ~20–24 min; NASA's *Earth-Independent Medical Operations (EIMO)* ConOps and the CHP-IDA decision-support work aim to guide a Crew Medical Officer — or a non-medical crewmember if the CMO is the one who's sick — without ground help. **This is the strongest "why" for our pitch.**

**Real hardware to model our sensors on:** CSA **Bio-Monitor / Astroskin** shirt (ECG/HR, BP, breathing rate, SpO2, skin temperature, actigraphy) — used on ISS by David Saint-Jacques. Partner-agency resource = Relevance points.

---

## 2. Product concept

**One-liner:** *HALO is an onboard health copilot that lets every astronaut check themselves in under 3 minutes, see their whole body's status at a glance, and know exactly what to do next — even when Earth is 20 minutes away.*

**Core principles (derived from astronaut users):**
1. **Glanceable in 5 seconds.** Astronauts' schedules are packed; health checks compete with science work.
2. **Autonomy-first, Earth-optional.** Works fully offline. Ground contact is a bonus, not a dependency.
3. **Explain, don't diagnose.** Every flag says *why*, *what to do now*, *when to escalate*, and *the source*.
4. **Personal, not population.** Compare each astronaut to their own pre-flight / first-week baseline.
5. **Crew owns their data.** Astronauts historically underreport symptoms to avoid being grounded; private-by-default with explicit sharing builds honest reporting.
6. **Teach as you go.** Every measurement has a short how-to (e.g. how to take BP when floating).

---

## 3. Features

### 3.1 Must-have (MVP — required to answer the challenge)
1. **Interactive Body Map (home screen).** Human figure; each region (heart, lungs, eyes/brain, bones, muscles, immune, gut, mind, sleep) is colored by status. Click → panel with: current status, trend sparkline, "what this system does", "how spaceflight affects it" (HRP), recommended actions. *The challenge literally suggests this — doing it well is a direct relevance win.*
2. **Daily Check-in (≤ 3 min).** Guided, step-by-step: vitals entry (HR, BP, SpO2, temp, glucose), sleep hours, mood/stress sliders, symptom chips (headache, congestion, back pain, rash, nausea, vision change). Big tap targets, minimal typing, resumable if interrupted.
3. **Status engine with explainable alerts.**
   - Three tiers: **Nominal / Caution / Warning** using color **+ icon shape + word** (never color alone; colorblind-safe).
   - Rules: absolute safety limits, deviation from personal baseline (z-score / EWMA), sustained-trend rules (e.g. 3 readings in a row), and combined rules (fever + rash → viral reactivation guidance).
   - NASA telemetry display conventions: yellow/red up/down arrow when outside threshold; **show when data is stale**.
4. **Trends.** Dynamic charts per indicator on a **mission-day** axis with the personal baseline band shaded and events overlaid (EVA, exercise, solar storm).
5. **Action cards.** For each flag: *What's happening → Why in space → Do this now → Escalate if…* with the escalation ladder **Self-care → Crew Medical Officer → Flight surgeon (ground)**.
6. **Learn mode.** Plain-language explainers for every indicator and every measurement procedure.

### 3.2 Differentiators (what other teams don't have — our Creativity score)
7. **Mission Environment switch** — *the headline feature.*
   ISS (LEO, 0 g, ground instantly reachable) · Lunar surface (⅙ g, ~1.3 s delay) · Mars transit (0 g, up to ~22 min delay) · Mars surface (0.38 g) · Rover/EVA.
   Changing environment changes: which risks are emphasized on the body map, which countermeasures apply, radiation context, and **how escalation works**. On Mars, "Contact flight surgeon" becomes a **delayed message queue with a countdown** ("Reply expected in ~40 min round trip — here is what to do meanwhile"). This visually *proves* the autonomy argument.
8. **Camera self-exams** (the challenge explicitly allows camera input):
   - **Webcam heart rate (rPPG)** — face video → pulse estimate in the browser. Huge demo "wow." Stretch, with manual-entry fallback.
   - **Amsler grid / near-vision check** for SANS — a simple on-screen test; distortions are tapped on the grid and logged over time.
   - **Urine-color hydration chart** (photo or tap-to-match) for kidney-stone/dehydration risk.
9. **Real mission replay.** A "Demo mission" mode that plays back **real Inspiration4 blood data from NASA OSDR** (CBC/metabolic panels, studies OSD-569/570/571/575) on the timeline, alongside a synthetic daily-vitals crew. Judges see NASA data *driving* the app — Relevance 5.
10. **Live space weather.** NASA **DONKI** API (solar energetic particle events, flares) → radiation banner: "SEP event detected — follow storm-shelter procedure." Cumulative dose vs 600 mSv career limit.
11. **Reaction Self-Test (PVT-B, 3 min)** — objective fatigue check; result feeds the Sleep/Mind regions.

### 3.3 Nice-to-have (judge-pleasers if time allows)
12. **Gamification (cooperative, not competitive):** mission-patch badges for streaks (exercise, hydration, check-ins); a crew-wide goal ("crew hydration 90% this week") rather than ranking people's health against each other.
13. **Scheduled prompts:** "Time for your morning check-in", "EVA tomorrow — log SpO2 baseline today."
14. **Crew view (CMO dashboard):** grid of crew members with status chips — only categories each astronaut chose to share.
15. **Ground digest:** a compact daily report "transmitted" to Earth, with consent toggles per category.
16. **Voice / hands-free:** Web Speech API for "log heart rate 72" — astronauts often have their hands busy or floating objects.
17. **Night / sleep-period mode:** dark red-light theme to protect sleep.
18. **Second language** (crews are international).

### 3.4 Explicitly NOT doing
- No diagnosis claims. Banner: *"Prototype decision-support tool, not a medical device. Data is simulated except where marked."*
- No cloud-dependent LLM as a core feature (contradicts the Mars-autonomy story and every team has one). If you add an assistant, make it answer only from our own cited content and disclose AI use.

---

## 4. Screen layout (draft wireframes)

### 4.1 Home — Body Map (landscape tablet/laptop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HALO   ● Mars Transit ▾   Mission Day 142   ⟳ Earth delay 18m 40s   ☾  ⚙  👤A. │
├───────────────┬──────────────────────────────────────┬───────────────────────┤
│ TODAY         │                                      │  EYES & BRAIN  ▲ CAUT │
│ ✓ Check-in    │            ( body figure )           │  ───────────────────  │
│ ○ PVT test    │         eyes ▲   brain ●             │  Near vision: 2 grid  │
│ ○ Exercise 90m│         heart ●  lungs ●             │  distortions (new)    │
│               │         bones ●  muscle ▲            │  Headache 3 days ↑    │
│ ALERTS (2)    │         immune ●  gut ●              │                       │
│ ▲ Vision      │         mind ●   sleep ▲             │  Why in space: fluid  │
│ ▲ Sleep 5.1h  │                                      │  shifts toward head…  │
│               │   ● Nominal  ▲ Caution  ◆ Warning    │  DO NOW: Amsler test  │
│ RADIATION     │                                      │  daily; log headache  │
│ 212/600 mSv   │                                      │  ESCALATE IF: blurred │
│ ☀ SEP: none   │                                      │  vision → CMO         │
├───────────────┴──────────────────────────────────────┴───────────────────────┤
│  [ Body ]   [ Check-in ]   [ Trends ]   [ Radiation ]   [ Crew ]   [ Learn ] │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Left: today's tasks + alerts + radiation (the 5-second glance).
- Center: body map (the visual hook).
- Right: detail drawer for the selected system.
- Top bar: **environment selector** and **Earth-delay indicator** always visible — keeps the autonomy story on screen in every screenshot.

### 4.2 Check-in flow
One card per step, progress bar, big buttons, "Skip / do later", "How do I measure this?" link on every step, summary at the end with immediate status changes animated on a mini body map.

### 4.3 Trends
Indicator picker → line chart; shaded baseline band; caution/warning lines; event markers; toggle "compare to Inspiration4 crew (real NASA data)" where applicable.

### 4.4 Escalation (Mars mode)
Message composer pre-filled with the relevant data → "Queued — arrives at Earth in 18m 40s, earliest reply in ~37 min" → interim checklist the astronaut follows meanwhile.

---

## 5. Visual design system

- **Dark theme by default** (cabin lighting, sleep periods), with a light theme toggle. Night mode = red-on-black.
- **Status colors:** Nominal green-teal, Caution amber, Warning red — always paired with **shape** (● ▲ ◆) and a word. Check with a colorblind simulator.
- **Typography:** large, high-contrast sans (e.g. Inter / IBM Plex Sans), numbers tabular. Minimum ~16px body, 28–40px for key vitals.
- **Touch targets ≥ 44–48 px** (gloves, floating posture, vibration).
- **Motion with purpose:** body regions gently pulse when they change status; no decorative animation that competes with alerts.
- **Consistency with NASA crew-display conventions:** yellow/red arrows for out-of-limit values, stale-data indicator, caution vs warning separation (NASA-STD-3001 / Human Integration Design Handbook — cite in the write-up for Validity).
- **Alarm fatigue control:** only Warnings interrupt; Cautions batch into the alerts list; snoozing requires a reason.

---

## 6. Recommended tech stack

**Main language: TypeScript (frontend app). Secondary: Python (data prep + model training only).**

| Layer | Choice | Why |
|---|---|---|
| App | **React + TypeScript + Vite** | Fast to build, huge ecosystem, everyone can find help; type safety helps a team of 4–6 not break each other's code |
| Styling | **Tailwind CSS** (+ shadcn/ui components) | Polished UI fast; dark mode trivial |
| Charts | **Recharts** (simple) or **Apache ECharts** (richer, annotations/bands) | Baseline bands + event markers |
| Body map | **Inline SVG body figure** with clickable `<path>` regions (MVP) → optional **React Three Fiber** 3D model if a teammate knows three.js | SVG is reliable in 2 days; 3D is the stretch "wow" |
| Animation | **Framer Motion** | Status transitions, drawers |
| Offline storage | **IndexedDB via Dexie.js**; **vite-plugin-pwa** for installable offline app | Supports the "works with no Earth link" claim |
| Camera | **MediaPipe Face Landmarker (JS)** + simple green-channel FFT for rPPG | Runs in browser, no server |
| Voice | Web Speech API | Zero install |
| Live NASA data | **NASA DONKI API** (`api.nasa.gov`, get a free key; DEMO_KEY is rate-limited) — **cache a snapshot JSON** so the demo never depends on the network | |
| Data prep | **Python + pandas** notebooks: download OSDR Inspiration4 CSVs, clean, export to `public/data/*.json`; generate synthetic crew vitals | Python is the natural tool for data; keep it out of the runtime |
| Optional ML | **scikit-learn** (e.g. Isolation Forest / simple per-person z-score model) trained in Python, exported as JSON thresholds/weights | Keep it explainable; rules first, ML second |
| Hosting | **Vercel** or **GitHub Pages** | Free, public URL, no login for judges |
| Repo | GitHub, public, MIT license, strong README with screenshots | Judges read it |

**Why not Streamlit/Flask/Django?** Faster for data people, but looks generic, many competing teams use it, and it can't deliver the interactive body map, animations, or offline mode — which cost you Creativity and Presentation points. **Why no backend?** The autonomy story is stronger if everything runs on the "onboard tablet," and there is nothing to break during judging.

**Suggested repo layout**
```
/app            React + TS (Vite)
  /src/features/{body-map,checkin,trends,radiation,crew,learn,escalation}
  /src/engine   rules.ts, baseline.ts, scoring.ts  (pure functions, unit-tested)
  /src/content  hrp-risks.json, procedures.json  (cited text)
  /public/data  i4_cbc.json, donki_snapshot.json, synthetic_crew.json
/data           Python notebooks + scripts (OSDR download, synthetic generator)
/docs           design notes, references, AI-use disclosure
```

---

## 6b. Machine learning plan

**Principle:** ML must work offline, be explainable, and never invent medical facts. No cloud LLM as a core feature: it breaks the Mars-autonomy story, competing teams already have chatbots, and a hallucinated health claim costs Validity points.

| # | Component | Technique | Where it shows up | Priority |
|---|---|---|---|---|
| 1 | **Daily summaries** | Template-based natural-language generation driven by the rules engine's structured findings (deviation %, streak length, linked HRP risk, recommended action). Deterministic, traceable, offline. | "Today" card on Home; per-system drawer | **P0** |
| 2 | **Personal anomaly detection** | Step 1: per-person baseline (mean/SD from first 7 mission days) + z-score and EWMA drift. Step 2 (if time): scikit-learn **Isolation Forest** on baseline deviations, trained in Python on the synthetic crew, exported to JSON and scored in TypeScript. Every flag lists the top contributing signals. | Body-map region colors, alerts | **P0** (z-score) / P1 (Isolation Forest) |
| 3 | **Short-term forecasting** | Robust trend (Theil–Sen / linear regression) → "at this rate you reach X mSv by day N", sleep-debt projection, body-mass trend. | Radiation panel, Trends | P1 |
| 4 | **Camera heart rate (rPPG)** | MediaPipe Face Landmarker (browser) → forehead/cheek ROI → green-channel signal → band-pass 0.7–3 Hz → FFT peak = BPM. Manual entry fallback. | Check-in step "Measure with camera" | P1 (demo wow) |
| 5 | **Ground digest for Mars mode** | Compress a day of readings into a short summary + only the abnormal raw series, sized for a slow, delayed link. Show "bytes saved". | Escalation / Ground digest | P2 |
| 6 | **Optional on-device LLM** | WebLLM with a small model, used **only to rephrase** template summaries; never adds facts. Must degrade gracefully (multi-GB download). | Summary card toggle | Stretch only |

**Model card (put in `/docs/model-card.md`):** training data = simulated crew (state clearly), features, thresholds, false-positive rate on healthy simulated days, known limits ("not validated on real astronauts; not a medical device").

**AI disclosure:** list every AI-assisted piece (code, text, generated images with watermark) on the project page per Space Apps rules.

**Ownership:** Python/data person builds #2 training + synthetic data; one frontend dev builds #1 summaries and the scoring port; whoever knows computer vision takes #4.

---

## 7. Data plan

| Data | Source | Used for |
|---|---|---|
| HRP hazards & risks text | NASA HRP pages (official challenge resources) | Body-map explanations, action cards |
| Inspiration4 CBC / metabolic panels | NASA **OSDR** (OSD-569/570/571/575 — confirm which file holds which panel) | Real-mission replay, immune/blood region, reference curves |
| Space weather (SEP, flares) | NASA **DONKI** API | Radiation banner, storm-shelter guidance |
| Radiation context | CSA *Monitoring Radiation for Astronaut Health* (official resource); optionally OSDR RadLab | Dose explainer, partner-agency credit |
| Sensor model | CSA **Bio-Monitor/Astroskin** spec | What vitals are realistic to collect continuously |
| Vigilance test | NASA PVT-B / Reaction Self-Test (Basner et al.) | Sleep/Mind region |
| Daily vitals | **Synthetic** crew of 4 generated in Python with realistic baselines + injected scenarios (fever, poor sleep streak, SANS symptoms, SEP event) | Demo scenarios; clearly labelled simulated |
| UI conventions | NASA-STD-3001 Vol. 2 / Human Integration Design Handbook | Validity / design rationale |

Label every screen's data provenance: **"NASA data"** badge vs **"Simulated"** badge. Judges reward honesty and it reinforces Relevance.

---

## 8. Demo & story (Presentation = 20% of score)

**30-second video script (recommended over slides):**
- 0:00 — "We're Team ___, and we took the astronaut health-monitoring challenge."
- 0:03 — Black screen, text: *"Mars. Day 142. Earth is 18 minutes away. The crew doctor is the one who's sick."*
- 0:07 — Title card: **HALO — your health copilot when Earth can't answer.**
- 0:10 — Screen capture: check-in in 3 taps → body map lights amber at the eyes → action card → environment switch ISS → Mars shows escalation becoming a delayed message → DONKI solar-storm alert.
- 0:22 — "Built on NASA OSDR Inspiration4 data, NASA DONKI space weather, and HRP risk research."
- 0:27 — "From Mars transit to a rural clinic on Earth — health autonomy for everyone." Logo.

Also prepare a 7-slide deck as a backup for the local live pitch (problem → user → solution → demo → NASA data → impact → team).

**Project page:** fill the "Detailed description" with the research table (Section 1.6) — judges score the full project, not only the demo.

---

## 9. Two-day build plan (team of 4–6)

**Roles**
- **A — Frontend lead:** app shell, routing, design system, body map.
- **B — Frontend:** check-in flow, trends charts, action cards.
- **C — Data/Python:** OSDR download + cleaning, synthetic crew generator, DONKI snapshot, rules thresholds with citations.
- **D — Science/content:** HRP research → `hrp-risks.json`, procedures, citations, Learn mode text; validates every claim.
- **E — Story/design:** wireframes → Figma (optional), video, slides, project page, README. *Start on day 1, not the last 3 hours.*
- **F (if 6):** stretch features — rPPG camera HR, PVT test, 3D body.

**Day 1 (Sat)**
- Morning: lock scope + names, scaffold repo, deploy "hello world" to Vercel (so hosting is never a last-minute risk). C pulls data; D writes thresholds table.
- Afternoon: body map + status engine (pure functions) + check-in working end-to-end with synthetic data.
- Evening: trends + action cards + environment switch. **Feature freeze for MVP at end of day 1.**

**Day 2 (Sun)**
- Morning: differentiators — Mars escalation queue, DONKI banner, I4 replay, Amsler/PVT test; polish.
- Early afternoon: bug bash on the deployed URL, test in private window, mobile/tablet check.
- Afternoon: record video (≤30 s!), write project page, references, AI disclosure.
- **Submit by ~6 p.m.**, then iterate — you can resubmit until 11:59 p.m.

---

## 10. Open questions for the team
1. Team size & skills — does anyone know three.js or computer vision (decides 3D body / rPPG)?
2. Target device in the story: wall tablet in the module, laptop, or wrist? (Recommend: tablet landscape.)
3. Name/brand — HALO or your own.
4. Video or slides for the demo? (Recommend: video.)

---

## Sources
- Challenge page: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
- Judging & Awards Guide: https://www.spaceappschallenge.org/resources/judging-awards-guide/
- Project Submission Guide: https://www.spaceappschallenge.org/resources/project-submission-guide/
- 2025 Global Winners: https://www.spaceappschallenge.org/2025/meet-the-2025-global-winners/
- NASA HRP Risks: https://www.nasa.gov/hrp/risks/ · Hazards: https://www.nasa.gov/hrp/hazards/
- CSA Bio-Monitor: https://asc-csa.gc.ca/eng/sciences/astroskin.asp
- CSA radiation article: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- OSDR Inspiration4 access (npj Microgravity 2024): https://pmc.ncbi.nlm.nih.gov/articles/PMC11094041
- SOMA overview: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11470996/
- NASA EIMO ConOps: https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf
- Mars medical decadal topical: https://ntrs.nasa.gov/citations/20210023828
- Cognition / PVT-B (Penn): https://www.med.upenn.edu/uep/cognition.html
- NASA Human Integration Design Handbook: https://www.nasa.gov/human-integration-design-handbook/
- NASA DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI · API keys: https://api.nasa.gov
- Competitor example (AURORA): https://github.com/fabriciojunio/aurora-astronaut-health
