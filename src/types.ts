export type Workload = 'easy' | 'moderate' | 'heavy' | 'veryHeavy';
export type Category = 0 | 1 | 2 | 3 | 4 | 5;

export interface Place {
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lon: number;
  timezone: string;
}

export interface HourPoint {
  time: string; // local ISO 'YYYY-MM-DDTHH:00' (Open-Meteo with timezone=auto)
  hour: number; // 0-23
  tempC: number | null;
  rh: number | null;
  wbgtC: number | null;
  category: Category | null;
}

export interface PlanOptions {
  workload: Workload;
  requiredWorkMin: number;
  windowStart: number; // hour, inclusive
  windowEnd: number; // hour, exclusive
  maxBlocks: 1 | 2;
  minBlockHours: number;
  baseline: { start: number; end: number }; // usual shift, end exclusive
}

export interface Block {
  start: number;
  end: number;
  endsAt?: string;
}

export interface PlanMetrics {
  clockHours: number;
  effectiveWorkMin: number;
  restMin: number;
  hoursCat4plus: number;
  heatDose: number;
  waterL: number;
}

export interface PerHour {
  hour: number;
  category: Category;
  wbgtC: number;
  workMin: number;
  restMin: number;
  waterL: number;
}

export interface Plan {
  blocks: Block[];
  metrics: PlanMetrics;
  feasible: boolean;
  perHour: PerHour[];
}

export interface DayResult {
  date: string;
  hours: HourPoint[];
  baseline: Plan;
  recommended: Plan;
}

export interface SeasonSummary {
  days: DayResult[];
  baselineCat4plusHours: number;
  planCat4plusHours: number;
  baselineDose: number;
  planDose: number;
  baselineOverCat4Days: number;
  baselineWorkMin: number;
  planWorkMin: number;
  infeasibleDays: string[];
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
}
