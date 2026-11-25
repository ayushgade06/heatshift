import type { HourPoint, PlanOptions, SeasonSummary } from '../types';
import { planDay } from './plan';

export function summarizeSeason(byDay: Record<string, HourPoint[]>, o: PlanOptions): SeasonSummary {
  const days = Object.keys(byDay)
    .sort()
    .map((d) => planDay(byDay[d], o));
  const s: SeasonSummary = {
    days,
    baselineCat4plusHours: 0,
    planCat4plusHours: 0,
    baselineDose: 0,
    planDose: 0,
    baselineOverCat4Days: 0,
    baselineWorkMin: 0,
    planWorkMin: 0,
    infeasibleDays: [],
  };
  for (const d of days) {
    s.baselineCat4plusHours += d.baseline.metrics.hoursCat4plus;
    s.planCat4plusHours += d.recommended.metrics.hoursCat4plus;
    s.baselineDose += d.baseline.metrics.heatDose;
    s.planDose += d.recommended.metrics.heatDose;
    s.baselineWorkMin += d.baseline.metrics.effectiveWorkMin;
    s.planWorkMin += d.recommended.metrics.effectiveWorkMin;
    if (d.baseline.metrics.hoursCat4plus > 0) s.baselineOverCat4Days++;
    if (!d.recommended.feasible) s.infeasibleDays.push(d.date);
  }
  return s;
}

/** Percentage reduction from `before` to `after` (0 when before is 0). */
export const reductionPct = (before: number, after: number) => (before > 0 ? Math.round((1 - after / before) * 100) : 0);
