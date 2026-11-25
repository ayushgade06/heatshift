import type { Place, PlanOptions, Workload } from './types';
import { WORKLOADS } from './science/heatCategory';
import { LANGS, type Lang } from './i18n/strings';

export interface Inputs {
  workload: Workload;
  requiredHours: number; // 1–12, step 0.5
  usualStart: number;
  usualEnd: number;
  windowStart: number;
  windowEnd: number;
  maxBlocks: 1 | 2;
}

export const DEFAULT_INPUTS: Inputs = {
  workload: 'moderate',
  requiredHours: 8,
  usualStart: 9,
  usualEnd: 17,
  windowStart: 6,
  windowEnd: 19,
  maxBlocks: 2,
};

export const toPlanOptions = (i: Inputs): PlanOptions => ({
  workload: i.workload,
  requiredWorkMin: Math.round(i.requiredHours * 60),
  windowStart: i.windowStart,
  windowEnd: i.windowEnd,
  maxBlocks: i.maxBlocks,
  minBlockHours: 2,
  baseline: { start: i.usualStart, end: i.usualEnd },
});

export interface Shared {
  place?: Place;
  inputs: Partial<Inputs>;
  lang?: Lang;
  date?: string; // YYYY-MM-DD, historical day
}

/** Strip control characters and cap length (used for place names in URLs and share text). */
export const clean = (s: string, max = 80) => s.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);

export function encodeInputs(s: { place: Place | null; inputs: Inputs; lang: Lang; date?: string }): string {
  const q = new URLSearchParams();
  if (s.place) {
    q.set('place', clean(s.place.name));
    if (s.place.country) q.set('country', clean(s.place.country));
    q.set('lat', s.place.lat.toFixed(4));
    q.set('lon', s.place.lon.toFixed(4));
    q.set('tz', s.place.timezone);
  }
  const i = s.inputs;
  q.set('load', i.workload);
  q.set('hours', String(i.requiredHours));
  q.set('usual', `${i.usualStart}-${i.usualEnd}`);
  q.set('window', `${i.windowStart}-${i.windowEnd}`);
  q.set('blocks', String(i.maxBlocks));
  if (s.date) q.set('date', s.date);
  if (s.lang !== 'en') q.set('lang', s.lang);
  return q.toString();
}

const int = (v: string | null, lo: number, hi: number) => {
  if (v === null || !/^\d{1,2}$/.test(v)) return undefined;
  const n = Number(v);
  return n >= lo && n <= hi ? n : undefined;
};

const range = (v: string | null, lo: number, hi: number) => {
  const m = v?.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!m) return undefined;
  const a = int(m[1], lo, hi);
  const b = int(m[2], lo, hi);
  return a !== undefined && b !== undefined && a < b ? [a, b] : undefined;
};

/** Parse a query string. Anything invalid is dropped, never trusted. */
export function decodeInputs(search: string): Shared {
  const q = new URLSearchParams(search);
  const out: Shared = { inputs: {} };

  const lat = Number(q.get('lat'));
  const lon = Number(q.get('lon'));
  const name = q.get('place');
  if (name && q.get('lat') && q.get('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    const tz = q.get('tz') ?? 'auto';
    out.place = { name: clean(name), country: clean(q.get('country') ?? ''), lat, lon, timezone: /^[\w/+-]{1,40}$/.test(tz) ? tz : 'auto' };
  }

  const load = q.get('load');
  if (load && (WORKLOADS as string[]).includes(load)) out.inputs.workload = load as Workload;
  const hours = Number(q.get('hours'));
  if (q.get('hours') && hours >= 1 && hours <= 12 && Number.isInteger(hours * 2)) out.inputs.requiredHours = hours;
  const usual = range(q.get('usual'), 0, 24);
  if (usual) [out.inputs.usualStart, out.inputs.usualEnd] = usual;
  const win = range(q.get('window'), 0, 24);
  if (win) [out.inputs.windowStart, out.inputs.windowEnd] = win;
  const blocks = q.get('blocks');
  if (blocks === '1' || blocks === '2') out.inputs.maxBlocks = Number(blocks) as 1 | 2;

  const date = q.get('date');
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) out.date = date;
  const lang = q.get('lang');
  if (lang && (LANGS as readonly string[]).includes(lang)) out.lang = lang as Lang;
  return out;
}
