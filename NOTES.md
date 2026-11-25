# NOTES — HeatShift build log

Built for **Code for Change** (Devpost, Nov 5 – Dec 1, 2026). Plan: `../HACKATHON_PROJECT_PLAN.md`.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation & repo | ✅ |
| M1 | Heat science core | ✅ |
| M2 | Shift planner | ✅ (with safety-cap deviation, below) |
| M3 | Open-Meteo client + demo snapshot | ✅ |
| M4 | App shell & design system | ✅ |
| M5 | Day plan (core experience) | ✅ |
| M6 | Season replay | ✅ |
| M7 | Crew card, sharing & languages (EN/HI/MR/ES) | ✅ (HI/MR/ES pending native-speaker review, below) |
| M8 | Methodology page + week view | ✅ |
| M9 | P1/P2 extras | Partial: shareable URL ✅, offline last forecast ✅, MR + ES ✅, Playwright e2e ✅. Skipped: P2 sun-exposed WBGT model, P2 machine-translation endpoint (see below). |
| M10 | Reliability, polish & accessibility | ✅ (see checklist) |
| M11 | Deployment & docs | ✅ https://heatshift-three.vercel.app (Vercel, static) · https://github.com/ayushgade06/heatshift |
| M12 | Demo & submission readiness | Screenshots + Devpost copy ready; video and Devpost submission are manual steps. |

## Demo numbers (computed by the app, not typed)

Settings: moderate work, 8 h needed, usual shift 09:00–17:00, allowed 06:00–19:00, up to two blocks. Data: Open-Meteo archive, Delhi (28.652, 77.231).

| Scenario | Usual shift | HeatShift plan |
|---|---|---|
| **13 May 2024** (demo day) | 4 h Red/Black, 5 h 50 m work delivered, 2 h 10 m rest | **0 h** Red/Black, **8 h** work, 0 m extra rest (06:00–08:00 + 13:00–19:00) |
| **May 2024, 31 days** | 165 h Red/Black, 163 h work | **127 h** Red/Black, **222 h** work (+59 h 10 m) |
| May 2024: days the usual shift hit Red/Black | 24 / 31 | |
| May 2024: days the full 8 h couldn't fit under the safety cap | | 10 / 31 |

Other workloads, same month (from `scripts/probe.ts`): easy 165 → 92; heavy and very heavy stay at 165 (most extreme days have no cooler hours in the 06–19 window) but deliver more work. Widening the window to 05–20 takes moderate work to 165 → 89.

## Translation review

Hindi, Marathi and Spanish strings in `src/i18n/strings.ts` were drafted with AI assistance and have **not yet been reviewed by a native speaker**. The developer (Hindi/Marathi reader) must review the crew-card text (heat-illness signs, first aid, water) before submission. All numbers use Latin digits in every language so times, litres and dates read consistently.

## Skipped (with reasons)

- **P2 sun-exposed WBGT (Liljegren).** It must be validated against ≥3 published reference values before shipping, and there wasn't time to do that properly. Shipping it unvalidated would be worse than the clearly labelled BoM estimate.
- **P2 `/api/translate` (Claude).** It would add the only server code and a secret. It would also produce unreviewed safety text, which is less safe than the fixed, reviewable templates. Not needed for the four supported languages.

## QA checklist (M10)

- [x] Unit/component: 49 tests green (`npm test`): science, planner (7 spec scenarios + property test + safety cap + perf), API (fixtures, nulls, errors, snapshot rules), season aggregation, i18n completeness, share URL validation, PlaceSearch keyboard, Day plan metrics = `planDay`, crew text ≤ 1000 chars in all languages.
- [x] E2E: 4 Playwright tests green (`npm run test:e2e`): snapshot fallback → plan → counters 4 h → 0 h and 5 h 50 m → 8 h; language switch; season preset totals (165); invalid range validation; 360 px has no horizontal page scroll.
- [x] Live data checked in Chrome: Delhi demo day (live archive), Delhi 7-day forecast (week view), season replay live (165 → 127 matches the snapshot run).
- [x] Layout: 1366 px desktop and 360 px phone checked; ruler scrolls inside its own panel; inputs collapse on phones.
- [x] Keyboard: tabs (arrow keys), place search combobox (arrows/Enter/Escape), heat cells focusable with full aria-labels, heatmap rows open with Enter/Space.
- [x] Reduced motion: all animations and the counter tween are disabled under `prefers-reduced-motion`.
- [x] Bundle: 94 KB gzipped JS, 5.5 KB CSS (budget 200 KB).
- [x] No console errors in the e2e run (`pageerror` listener).
- [x] Production: the 4 Playwright tests pass against https://heatshift-three.vercel.app (`BASE_URL=… npm run test:e2e`); the live archive and forecast load with no page errors.
- [ ] Lighthouse run on the deployed URL (manual).
- [ ] Print preview on paper / phone WhatsApp share (manual, needs a phone).

## Known issues

- Read aloud depends on the device having a voice for the language; the button is hidden when none exists (common for Marathi on desktop).
- Geolocation places are named by coordinates (Open-Meteo has no reverse geocoding).
- The archive date limit (today − 5 days) is a conservative rule; Open-Meteo sometimes has more recent data.

## [VERIFY] record

| Item | Result | Source |
|---|---|---|
| TB MED 507 work/rest + water table | **Confirmed.** All 20 cells match TB MED 507 (12 Apr 2022), Table 3-2 "Fluid replacement and work-rest guidelines for training in warm and hot environments" (the ≤4 h table; NL = "no limit to work per hour (up to 4 continuous hours)"). Cat 5 is printed "> 90 °F"; since Cat 4 ends at 89.9 we map ≥ 90.0 → 5. A separate Table 3-3 (continuous work) exists; we use the more conservative 3-2 for all hours. | https://www.govinfo.gov/content/pkg/GOVPUB-D101-PURL-gpo216616/pdf/GOVPUB-D101-PURL-gpo216616.pdf |
| Fluid caps | **Confirmed.** "Hourly fluid intake should not exceed 1½ qt." "Daily fluid intake should not exceed 12 qt." | Same |
| BoM WBGT formula | **Partially confirmed.** BoM's site returns HTTP 403 to automated fetches. Formula `0.567·Ta + 0.393·e + 3.94` confirmed via a peer-reviewed secondary source (attributed to ACSM 1987), which also finds it inaccurate in some conditions. Vapour-pressure expression is the standard Magnus-type form used by BoM. Condition wording "moderately sunny, light wind" seen only in a mirror of BoM text. Limitations are stated on the methodology page. **Manual action: open https://www.bom.gov.au/info/thermal_stress/ in a browser to confirm.** | https://pmc.ncbi.nlm.nih.gov/articles/PMC9941479 |
| NIOSH acclimatisation | **Confirmed.** New workers: "no more than a 20% exposure on day 1" and "an increase of no more than 20% on each additional day". | https://www.cdc.gov/niosh/heat-stress/recommendations/acclimatization.html |
| OSHA heat-stroke signs / first aid | **Confirmed.** Signs include confusion, slurred speech, unconsciousness, seizures, heavy sweating or hot dry skin; "call 911 immediately and cool the worker with ice or cold water until help arrives". | https://www.osha.gov/heat-exposure/illness-first-aid |
| OSHA-NIOSH Heat Safety Tool | **Confirmed it does not reschedule work.** It shows an hourly heat-index forecast and risk levels; planning is left to the user. The page notes the app "is not receiving updates at this time". | https://www.cdc.gov/niosh/heat-stress/communication-resources/app.html |
| ILO figures | **Corrected wording.** The ILO release says "more than 2.4 billion workers" (not 2.41), 22.87 M injuries, 18,970 deaths per year. | https://www.ilo.org/resource/news/climate-change-creates-cocktail-serious-health-hazards-70-cent-worlds |
| Open-Meteo endpoints & variables | **Confirmed** by live calls: `temperature_2m`, `relative_humidity_2m`, `wind_speed_10m`, `shortwave_radiation`, `daily=sunrise,sunset`, `timezone=auto`. Errors are HTTP 400 `{"error":true,"reason":...}`. | Live API, 2026-11-26 |

## Decisions & deviations

- **Safety cap (deviation from §16.2).** The spec's best-effort rule ("maximise effective work") recommended *more* Red/Black hours than the usual shift on Delhi's worst days (e.g. 29 May 2024, moderate work: 8 → 12). The planner now discards any candidate with more Red/Black hours than the usual shift, for feasible and infeasible plans alike. Invariant: *HeatShift never adds Red/Black hours.* Property-tested over 300 random days.
- **Heat dose is not a headline number.** When a plan delivers more work than the usual shift, its dose can be higher. Headlines use Red/Black hours and work delivered.
- **Partial final hour.** The partial hour counts fully toward Red/Black hours (conservative); work, rest, dose and water scale with the fraction used.
- **React 19** (current Vite template) instead of React 18. No API differences matter here.
- **Snapshot fallback** accepts any date range *inside* the snapshot (not only the exact range), same place ±0.05°. Still never presented as live.
- The null-value fixture `archive-with-nulls.json` is a real response with two values set to `null` by hand (the live API returned no nulls).

## Known issues

(none yet)
