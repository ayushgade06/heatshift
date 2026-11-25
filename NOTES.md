# NOTES — HeatShift build log

Built for **Code for Change** (Devpost, Nov 5 – Dec 1, 2026). Plan: `../HACKATHON_PROJECT_PLAN.md`.

## Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Foundation & repo | ✅ |
| M1 | Heat science core | ✅ |
| M2 | Shift planner | ✅ (with safety-cap deviation, below) |
| M3 | Open-Meteo client + demo snapshot | ✅ |

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
