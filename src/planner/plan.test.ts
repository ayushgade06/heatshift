import { describe, expect, it } from 'vitest';
import type { Category, HourPoint, PlanOptions } from '../types';
import { planDay } from './plan';
import { summarizeSeason } from './season';

// WBGT (°C) per category used by fixtures: comfortably inside each band.
const WBGT_FOR: Record<Category, number> = { 0: 20, 1: 26.5, 2: 28.5, 3: 30, 4: 31.6, 5: 34 };

function day(cats: (Category | null)[], date = '2024-05-29'): HourPoint[] {
  return cats.map((c, h) => ({
    time: `${date}T${String(h).padStart(2, '0')}:00`,
    hour: h,
    tempC: c === null ? null : 30,
    rh: c === null ? null : 40,
    wbgtC: c === null ? null : WBGT_FOR[c],
    category: c,
  }));
}

const opts = (p: Partial<PlanOptions> = {}): PlanOptions => ({
  workload: 'moderate',
  requiredWorkMin: 480,
  windowStart: 6,
  windowEnd: 19,
  maxBlocks: 2,
  minBlockHours: 2,
  baseline: { start: 9, end: 17 },
  ...p,
});

const allZero = () => Array<Category>(24).fill(0);
const midday5 = () => allZero().map((c, h) => (h >= 11 && h <= 15 ? 5 : c)) as Category[];

describe('planDay', () => {
  it('1. all category 0 → single 06–14 block, earliest start wins', () => {
    const r = planDay(day(allZero()), opts());
    expect(r.recommended.blocks).toEqual([{ start: 6, end: 14 }]);
    expect(r.recommended.metrics.hoursCat4plus).toBe(0);
    expect(r.recommended.feasible).toBe(true);
  });

  it('2. midday black hours → zero Cat4+ split plan; baseline has 5 and falls short', () => {
    const r = planDay(day(midday5()), opts());
    expect(r.recommended.metrics.hoursCat4plus).toBe(0);
    expect(r.recommended.feasible).toBe(true);
    expect(r.recommended.blocks).toHaveLength(2);
    expect(r.recommended.blocks[0].end).toBeLessThanOrEqual(11);
    expect(r.recommended.blocks[1].start).toBeGreaterThanOrEqual(16);
    expect(r.baseline.metrics.hoursCat4plus).toBe(5);
    expect(r.baseline.metrics.effectiveWorkMin).toBeLessThan(480);
  });

  it('3. single block only → minimises Cat4+ hours (matches brute-force reference)', () => {
    const hours = day(midday5());
    const r = planDay(hours, opts({ maxBlocks: 1 }));
    // Reference: try every 1-block window start, extend until 480 work-min, take min Cat4+.
    let ref = Infinity;
    for (let s = 6; s < 19; s++) {
      let work = 0;
      let cat4 = 0;
      for (let h = s; h < 19 && work < 480; h++) {
        const c = hours[h].category!;
        work += c === 5 ? 20 : 60;
        if (c >= 4) cat4++;
      }
      if (work >= 480) ref = Math.min(ref, cat4);
    }
    expect(r.recommended.feasible).toBe(true);
    expect(r.recommended.metrics.hoursCat4plus).toBe(ref);
    expect(r.recommended.blocks).toHaveLength(1);
  });

  it('4. window too short → infeasible best effort maximising work', () => {
    const r = planDay(day(allZero()), opts({ windowStart: 6, windowEnd: 10 }));
    expect(r.recommended.feasible).toBe(false);
    expect(r.recommended.metrics.effectiveWorkMin).toBe(240);
  });

  it('5. trim rule: 6.5 h → ends 12:30', () => {
    const r = planDay(day(allZero()), opts({ requiredWorkMin: 390 }));
    expect(r.recommended.blocks).toEqual([{ start: 6, end: 13, endsAt: '12:30' }]);
    expect(r.recommended.metrics.effectiveWorkMin).toBeCloseTo(390);
  });

  it('best effort never adds Red/Black hours to squeeze in work', () => {
    // Every window hour is black; baseline 09–17 has 8 such hours and delivers 160 min.
    const cats = allZero().map((c, h) => (h >= 6 && h < 19 ? 5 : c)) as Category[];
    const r = planDay(day(cats), opts());
    expect(r.recommended.feasible).toBe(false);
    expect(r.recommended.metrics.hoursCat4plus).toBeLessThanOrEqual(8);
    expect(r.recommended.metrics.effectiveWorkMin).toBeGreaterThanOrEqual(r.baseline.metrics.effectiveWorkMin);
  });

  it('6. null hours are never inside a block', () => {
    const cats: (Category | null)[] = allZero();
    cats[8] = null;
    cats[14] = null;
    const r = planDay(day(cats), opts({ requiredWorkMin: 300 }));
    for (const b of r.recommended.blocks) {
      for (let h = b.start; h < b.end; h++) expect(cats[h]).not.toBeNull();
    }
    expect(r.recommended.feasible).toBe(true);
  });

  it('property: plan Cat4+ ≤ baseline Cat4+ on every day; feasible baseline ⇒ feasible plan', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const cats = Array.from({ length: 24 }, () => Math.floor(rnd() * 6) as Category);
      const o = opts({ workload: (['easy', 'moderate', 'heavy', 'veryHeavy'] as const)[i % 4], requiredWorkMin: 60 + Math.floor(rnd() * 6) * 60 });
      const r = planDay(day(cats), o);
      // Safety cap holds on every day, feasible or not.
      expect(r.recommended.metrics.hoursCat4plus).toBeLessThanOrEqual(r.baseline.metrics.hoursCat4plus);
      if (r.baseline.feasible) expect(r.recommended.feasible).toBe(true);
    }
  });

  it('7. performance: 1000 random days in < 2 s', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const days = Array.from({ length: 1000 }, () => day(Array.from({ length: 24 }, () => Math.floor(rnd() * 6) as Category)));
    const t = performance.now();
    for (const d of days) planDay(d, opts());
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe('summarizeSeason', () => {
  it('aggregates equal the sum over days', () => {
    const byDay = {
      '2024-05-01': day(allZero(), '2024-05-01'),
      '2024-05-02': day(midday5(), '2024-05-02'),
      '2024-05-03': day(Array<Category>(24).fill(5), '2024-05-03'),
    };
    const s = summarizeSeason(byDay, opts());
    const sum = (f: (d: (typeof s.days)[number]) => number) => s.days.reduce((a, d) => a + f(d), 0);
    expect(s.days.map((d) => d.date)).toEqual(['2024-05-01', '2024-05-02', '2024-05-03']);
    expect(s.baselineCat4plusHours).toBe(sum((d) => d.baseline.metrics.hoursCat4plus));
    expect(s.planCat4plusHours).toBe(sum((d) => d.recommended.metrics.hoursCat4plus));
    expect(s.baselineDose).toBeCloseTo(sum((d) => d.baseline.metrics.heatDose));
    expect(s.planDose).toBeCloseTo(sum((d) => d.recommended.metrics.heatDose));
    expect(s.baselineOverCat4Days).toBe(2);
    expect(s.infeasibleDays).toEqual(['2024-05-03']);
    expect(s.baselineWorkMin).toBeCloseTo(sum((d) => d.baseline.metrics.effectiveWorkMin));
    expect(s.planWorkMin).toBeCloseTo(sum((d) => d.recommended.metrics.effectiveWorkMin));
  });
});
