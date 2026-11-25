import type { Block, Category, DayResult, HourPoint, PerHour, Plan, PlanOptions } from '../types';
import { QT_TO_L, workRest } from '../science/heatCategory';

/** WBGT (°C) where category 1 starts (78 °F). Heat dose counts degree-hours above it. */
export const DOSE_BASE_C = 25.6;

interface Slot {
  hour: number;
  category: Category;
  wbgtC: number;
  workMin: number;
  restMin: number;
  waterL: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const hhmm = (hour: number, min = 0) => `${pad(hour + Math.floor(min / 60))}:${pad(min % 60)}`;

/** Per-hour slots for a day, indexed by local hour. Hours without data are null. */
function slotsFor(hours: HourPoint[], o: PlanOptions): (Slot | null)[] {
  const slots: (Slot | null)[] = Array(24).fill(null);
  for (const h of hours) {
    if (h.category === null || h.wbgtC === null) continue;
    const wr = workRest(h.category, o.workload);
    slots[h.hour] = {
      hour: h.hour,
      category: h.category,
      wbgtC: h.wbgtC,
      workMin: wr.workMin,
      restMin: wr.restMin,
      waterL: wr.waterQt * QT_TO_L,
    };
  }
  return slots;
}

/**
 * Evaluate blocks in time order. With `trim`, stop as soon as the required work
 * is done: the final hour may be partial and blocks after it are dropped.
 */
function evaluate(slots: (Slot | null)[], blocks: Block[], requiredWorkMin: number, trim: boolean): Plan {
  const perHour: PerHour[] = [];
  const used: Block[] = [];
  let work = 0;
  let rest = 0;
  let clock = 0;
  let cat4 = 0;
  let dose = 0;
  let water = 0;
  let done = false;

  for (const b of blocks) {
    if (done) break;
    const ub: Block = { start: b.start, end: b.start };
    for (let h = b.start; h < b.end; h++) {
      const s = slots[h];
      ub.end = h + 1;
      if (!s) continue; // only possible for the baseline; planner blocks never contain gaps
      const remaining = requiredWorkMin - work;
      const frac = trim && s.workMin > 0 && remaining < s.workMin ? remaining / s.workMin : 1;
      const w = s.workMin * frac;
      const r = s.restMin * frac;
      work += w;
      rest += r;
      clock += frac;
      if (s.category >= 4) cat4++;
      dose += Math.max(0, s.wbgtC - DOSE_BASE_C) * frac;
      water += s.waterL * frac;
      perHour.push({ hour: h, category: s.category, wbgtC: s.wbgtC, workMin: w, restMin: r, waterL: s.waterL * frac });
      if (trim && work >= requiredWorkMin - 1e-9) {
        if (frac < 1) ub.endsAt = hhmm(h, Math.round(frac * 60));
        done = true;
        break;
      }
    }
    used.push(ub);
  }

  return {
    blocks: used,
    feasible: work >= requiredWorkMin - 1e-9,
    perHour,
    metrics: {
      clockHours: clock,
      effectiveWorkMin: work,
      restMin: rest,
      hoursCat4plus: cat4,
      heatDose: dose,
      waterL: water,
    },
  };
}

/** Lexicographic objective: Cat4+ hours → heat dose (0.1) → clock hours → block count → earliest start. */
function better(a: Plan, b: Plan): boolean {
  const ka = [a.metrics.hoursCat4plus, Math.round(a.metrics.heatDose * 10), Math.round(a.metrics.clockHours * 60), a.blocks.length, a.blocks[0].start];
  const kb = [b.metrics.hoursCat4plus, Math.round(b.metrics.heatDose * 10), Math.round(b.metrics.clockHours * 60), b.blocks.length, b.blocks[0].start];
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i];
  return false;
}

/** All gap-free blocks of whole hours inside the window, each ≥ minBlockHours. */
function candidateBlocks(slots: (Slot | null)[], o: PlanOptions): Block[] {
  const out: Block[] = [];
  for (let s = o.windowStart; s < o.windowEnd; s++) {
    for (let e = s + 1; e <= o.windowEnd; e++) {
      if (!slots[e - 1]) break;
      if (e - s >= o.minBlockHours) out.push({ start: s, end: e });
    }
  }
  return out;
}

const emptyPlan = (): Plan => ({
  blocks: [],
  feasible: false,
  perHour: [],
  metrics: { clockHours: 0, effectiveWorkMin: 0, restMin: 0, hoursCat4plus: 0, heatDose: 0, waterL: 0 },
});

export function planDay(hours: HourPoint[], o: PlanOptions): DayResult {
  const slots = slotsFor(hours, o);
  const singles = candidateBlocks(slots, o);
  const baseline = evaluate(slots, [{ start: o.baseline.start, end: o.baseline.end }], o.requiredWorkMin, false);

  // Safety cap: a plan never has more Red/Black hours than the usual shift, so best effort
  // can't add danger-hours just to squeeze in more work. Deviation from §16.2; see NOTES.md.
  const cat4Cap = baseline.metrics.hoursCat4plus;

  // ponytail: brute force over ≤2 blocks (≤ ~25k pairs, <10 ms); switch to DP if >2 blocks are ever needed.
  let bestFeasible: Plan | null = null;
  let bestEffort: Plan | null = null;
  const consider = (blocks: Block[]) => {
    const p = evaluate(slots, blocks, o.requiredWorkMin, true);
    if (p.metrics.hoursCat4plus > cat4Cap) return;
    if (p.feasible) {
      if (!bestFeasible || better(p, bestFeasible)) bestFeasible = p;
    } else if (!bestFeasible) {
      const w = Math.round(p.metrics.effectiveWorkMin);
      const bw = bestEffort ? Math.round(bestEffort.metrics.effectiveWorkMin) : -1;
      if (!bestEffort || w > bw || (w === bw && better(p, bestEffort))) bestEffort = p;
    }
  };

  for (const a of singles) consider([a]);
  if (o.maxBlocks === 2) {
    for (const a of singles) for (const b of singles) if (b.start >= a.end + 1) consider([a, b]);
  }

  const date = hours[0]?.time.slice(0, 10) ?? '';
  return { date, hours, baseline, recommended: bestFeasible ?? bestEffort ?? emptyPlan() };
}

/** Group hour points by local date (YYYY-MM-DD). */
export function groupByDate(hours: HourPoint[]): Record<string, HourPoint[]> {
  const out: Record<string, HourPoint[]> = {};
  for (const h of hours) (out[h.time.slice(0, 10)] ??= []).push(h);
  return out;
}
