// Prints the season-replay numbers the app computes from the bundled Delhi snapshot.
// Used to record demo numbers in NOTES.md. Run: npx tsx scripts/probe.ts
import { readFileSync } from 'node:fs';
import { toHourPoints } from '../src/api/openMeteo';
import { groupByDate } from '../src/planner/plan';
import { summarizeSeason } from '../src/planner/season';

const s = JSON.parse(readFileSync('public/demo/delhi-2024-05.json', 'utf8'));
const by = groupByDate(toHourPoints(s.data));
for (const workload of ['easy', 'moderate', 'heavy', 'veryHeavy'] as const) {
  const r = summarizeSeason(by, { workload, requiredWorkMin: 480, windowStart: Number(process.env.WS ?? 6), windowEnd: Number(process.env.WE ?? 19), maxBlocks: 2, minBlockHours: 2, baseline: { start: 9, end: 17 } });
  console.log(workload, { baseline: r.baselineCat4plusHours, plan: r.planCat4plusHours, daysOver: r.baselineOverCat4Days, infeasible: r.infeasibleDays.length, dose: [Math.round(r.baselineDose), Math.round(r.planDose)] });
  for (const d of r.days.filter((x) => ['2024-05-01', '2024-05-15', '2024-05-29'].includes(x.date))) {
    console.log(' ', d.date, d.hours.slice(5, 20).map((h) => h.category).join(''), JSON.stringify(d.recommended.blocks), `cat4 ${d.baseline.metrics.hoursCat4plus}->${d.recommended.metrics.hoursCat4plus}`, `work ${Math.round(d.baseline.metrics.effectiveWorkMin)}->${Math.round(d.recommended.metrics.effectiveWorkMin)}`);
  }
}
