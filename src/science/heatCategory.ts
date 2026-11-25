import type { Category, Workload } from '../types';
import { cToF } from './wbgt';

/** Lower WBGT bound (°F) of categories 1..5, as published in TB MED 507 (2022), Table 1. */
export const CATEGORY_LOWER_F = [78, 82, 85, 88, 90] as const;

export const WORKLOADS: Workload[] = ['easy', 'moderate', 'heavy', 'veryHeavy'];

export interface WorkRestCell {
  work: number; // minutes of work per hour (60 = no limit)
  waterQt: number; // US quarts per hour
}

/**
 * US Army TB MED 507 (rev. 12 Apr 2022), Table 1: work/rest and water intake
 * for activities up to 4 hours. Category 0 (< 78 °F) is not in the table; we
 * treat it as no limit with ½ qt/h. Single source of truth: the methodology
 * page renders this constant.
 */
export const WORK_REST_TABLE: Record<Category, Record<Workload, WorkRestCell>> = {
  0: { easy: { work: 60, waterQt: 0.5 }, moderate: { work: 60, waterQt: 0.5 }, heavy: { work: 60, waterQt: 0.5 }, veryHeavy: { work: 60, waterQt: 0.5 } },
  1: { easy: { work: 60, waterQt: 0.5 }, moderate: { work: 60, waterQt: 0.75 }, heavy: { work: 40, waterQt: 0.75 }, veryHeavy: { work: 20, waterQt: 1 } },
  2: { easy: { work: 60, waterQt: 0.5 }, moderate: { work: 60, waterQt: 0.75 }, heavy: { work: 30, waterQt: 1 }, veryHeavy: { work: 15, waterQt: 1 } },
  3: { easy: { work: 60, waterQt: 0.75 }, moderate: { work: 60, waterQt: 0.75 }, heavy: { work: 30, waterQt: 1 }, veryHeavy: { work: 10, waterQt: 1 } },
  4: { easy: { work: 60, waterQt: 0.75 }, moderate: { work: 50, waterQt: 0.75 }, heavy: { work: 20, waterQt: 1 }, veryHeavy: { work: 10, waterQt: 1 } },
  5: { easy: { work: 60, waterQt: 1 }, moderate: { work: 20, waterQt: 1 }, heavy: { work: 15, waterQt: 1 }, veryHeavy: { work: 10, waterQt: 1 } },
};

export const QT_TO_L = 0.946353;

export function categoryFromWbgtC(wbgtC: number): Category {
  // Round to 0.01 °F so float noise at the published boundaries can't flip a category.
  const f = Math.round(cToF(wbgtC) * 100) / 100;
  let cat = 0;
  for (const lower of CATEGORY_LOWER_F) if (f >= lower) cat++;
  return cat as Category;
}

export function workRest(cat: Category, load: Workload): { workMin: number; restMin: number; waterQt: number } {
  const { work, waterQt } = WORK_REST_TABLE[cat][load];
  return { workMin: work, restMin: 60 - work, waterQt };
}

export const CATEGORY_FLAG = ['none', 'white', 'green', 'yellow', 'red', 'black'] as const;
