# Devpost submission kit: HeatShift

Every number below was computed by the app from Open-Meteo data (see `NOTES.md`, "Demo numbers"). Re-check them on the live URL before submitting.

## Name and tagline

**HeatShift**: Same work. Cooler hours.

## One-line description (Devpost "elevator pitch", ≤ 200 chars)

HeatShift turns a real heat forecast into a safer shift for outdoor workers, moving work out of Red/Black heat hours and showing exactly how much exposure it removed.

## Project story (paste into Devpost)

### Inspiration
In Delhi on 13 May 2024, a crew doing moderate work on the usual 9-to-5 shift spent **4 hours in Red/Black heat**, and once the mandatory rest breaks were taken it got only **5 h 50 m** of work done. HeatShift's plan for the same day: **0 hours** in Red/Black heat and the **full 8 hours** of work.

Heat already causes 22.87 million occupational injuries and 18,970 deaths a year (ILO, 2024), and most of that exposure happens on ordinary hot days, when no alert is issued. Supervisors check the temperature and keep the same shift anyway, because nothing turns a forecast into a schedule.

### What it does
- **Day plan:** search a place, see a 24-hour heat ruler with your usual shift overlaid, press **Plan safer shift**, and watch the before/after: hours in Red/Black heat, work actually delivered under the rest rules, rest needed.
- **Crew card:** a printable A4 plan with work hours, break pattern, water per hour, heat-illness warning signs and first aid. Share it on WhatsApp, copy it, or have it read aloud, in English, Hindi, Marathi or Spanish.
- **Week:** seven days at a glance; the coolest day is marked.
- **Season replay:** the planner on up to 31 days of real historical weather. Delhi, May 2024: the usual shift spent **165 hours** in Red/Black heat; HeatShift plans needed **127** and got **59 more hours of work** done within the rest rules.
- **How it works:** every formula, the full work/rest table and every source, in the app.

### How we built it
- Estimated WBGT per hour from Open-Meteo temperature and humidity (Australian BoM approximation).
- Heat levels and work/rest/water limits from US Army TB MED 507 (2022), Table 3-2.
- A planner that searches every one- or two-block shift and picks the fewest Red/Black hours, then the lowest heat dose, then the shortest day. It has a **safety cap**: it never adds Red/Black hours compared with the usual shift.
- Vite + React + TypeScript, hand-built CSS/SVG visuals, no backend, no tracking. 49 unit/component tests and 4 Playwright end-to-end tests.

### Challenges we ran into
On Delhi's worst days every daylight hour is Red or Black. Our first planner did exactly what the spec said, "maximise work", and recommended *more* Red/Black hours than the usual shift to squeeze in the job. We added a safety cap and a property test over 300 random days: the plan never adds danger hours. If the job can't fit, HeatShift says how much fits and suggests a cooler day or lighter task.

### Accomplishments that we're proud of
- An explainable result: every number traces to a formula or table shown in the app.
- Real data, with a labelled cached snapshot so the demo never breaks.
- A crew card a supervisor can actually hand out, in four languages.

### What we learned
Air temperature is the wrong number for safety: humidity and workload change the safe work/rest cycle completely. And a fixed 9-to-5 on a hot day delivers far less real work than people assume, once the required breaks are counted.

### What's next
- A sun- and wind-aware WBGT model (Liljegren), validated against published reference values.
- Native-speaker-reviewed translations for more languages.
- SMS crew cards for workers without smartphones.
- Pilots with a contractor or a street-vendor union.

### Built with
react, typescript, vite, open-meteo, svg, vitest, playwright, vercel

## Links
- Live demo: `<Vercel URL>`
- Source: `https://github.com/<you>/heatshift`
- Video: `<YouTube/Vimeo link>`

## Screenshots (in `docs/screenshots/`, with number captions)

| File | Caption |
|---|---|
| `1-day-plan.png` | Delhi, 13 May 2024: the usual 9-to-5 spends 4 h in Red/Black heat and delivers 5 h 50 m of work. HeatShift: 0 h, full 8 h. |
| `2-season-replay.png` | May 2024 in Delhi: 165 → 127 hours in Red/Black heat, 59 more hours of work done. Faded cells are hours HeatShift avoids. |
| `3-crew-card.png` | The plan as a crew card: work hours, water per hour, warning signs, first aid. Print, WhatsApp or read aloud. |
| `4-crew-card-hindi.png` | The same card in Hindi (also Marathi and Spanish). |
| `5-how-it-works.png` | Every formula and the full TB MED 507 table, rendered from the code the planner uses. |
| `6-phone.png` | Works on a 360 px phone. |

## Demo video (≤ 3 min)

| Time | Scene | Say |
|---|---|---|
| 0:00–0:20 | Title card, then ILO numbers | "Heat injures 23 million workers a year, mostly on ordinary hot days." |
| 0:20–0:45 | Day plan: Delhi, 13 May 2024, usual shift in the red | "A normal 9-to-5 puts this crew in Red and Black heat for 4 hours, and the rest rules mean they only get 5 h 50 m of work done." |
| 0:45–1:40 | Press **Plan safer shift**; counters 4 → 0, 5 h 50 → 8 h; scroll to crew card; switch to Hindi; Read aloud | "Same work, cooler hours." |
| 1:40–2:15 | Season replay preset; toggle "Show HeatShift plans" | "Over the whole month: 165 → 127 hours in Red/Black heat, 59 more hours of work." |
| 2:15–2:40 | How it works: formula, table, safety cap, tests | "Every number traces to a published table. The planner never adds danger hours." |
| 2:40–3:00 | Who it's for, what's next, URL | "Supervisors, unions, gig workers. Open it, type your city." |

## Final checklist
- [ ] Live URL works in an incognito window on desktop and phone
- [ ] Re-check the headline numbers on the live URL
- [ ] Native-speaker review of the Hindi/Marathi crew-card text
- [ ] Repository public, README links updated with live + video URLs
- [ ] Video uploaded (≤ 3 min), linked
- [ ] Team member listed; student ID ready for verification
- [ ] Submitted before **Dec 1, 22:00 IST** (hard deadline Dec 2, 06:30 IST)
