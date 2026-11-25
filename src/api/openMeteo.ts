import type { HourPoint, Place, SunTimes } from '../types';
import { wbgtBoM } from '../science/wbgt';
import { categoryFromWbgtC } from '../science/heatCategory';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const HOURLY = 'temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation';

export interface OpenMeteoResponse {
  timezone?: string;
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
  };
  daily?: { time: string[]; sunrise: string[]; sunset: string[] };
}

export interface WeatherResult {
  hours: HourPoint[];
  sun: Record<string, SunTimes>;
}

const cache = new Map<string, Promise<unknown>>();

async function getJson<T>(url: string): Promise<T> {
  let p = cache.get(url);
  if (!p) {
    p = (async () => {
      let res: Response;
      try {
        res = await fetch(url);
      } catch {
        throw new ApiError('Network error: could not reach Open-Meteo.');
      }
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) throw new ApiError(body?.reason ?? `Open-Meteo returned HTTP ${res.status}.`);
      return body;
    })();
    cache.set(url, p);
    p.catch(() => cache.delete(url)); // don't cache failures
  }
  return p as Promise<T>;
}

/** Zip Open-Meteo hourly arrays into hour points with WBGT + category. Null-safe. */
export function toHourPoints(r: OpenMeteoResponse): HourPoint[] {
  const h = r.hourly;
  if (!h) return [];
  return h.time.map((time, i) => {
    const tempC = h.temperature_2m[i] ?? null;
    const rh = h.relative_humidity_2m[i] ?? null;
    const wbgtC = tempC === null || rh === null ? null : wbgtBoM(tempC, rh);
    return { time, hour: Number(time.slice(11, 13)), tempC, rh, wbgtC, category: wbgtC === null ? null : categoryFromWbgtC(wbgtC) };
  });
}

export function toSun(r: OpenMeteoResponse): Record<string, SunTimes> {
  const out: Record<string, SunTimes> = {};
  r.daily?.time.forEach((d, i) => (out[d] = { sunrise: r.daily!.sunrise[i], sunset: r.daily!.sunset[i] }));
  return out;
}

const parse = (r: OpenMeteoResponse): WeatherResult => ({ hours: toHourPoints(r), sun: toSun(r) });

interface GeoResult {
  results?: { name: string; country?: string; admin1?: string; latitude: number; longitude: number; timezone?: string }[];
}

export async function geocode(q: string, lang = 'en'): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=${lang}&format=json`;
  const r = await getJson<GeoResult>(url);
  return (r.results ?? []).map((g) => ({
    name: g.name,
    country: g.country ?? '',
    admin1: g.admin1,
    lat: g.latitude,
    lon: g.longitude,
    timezone: g.timezone ?? 'auto',
  }));
}

const coords = (p: Place) => `latitude=${p.lat.toFixed(4)}&longitude=${p.lon.toFixed(4)}`;

export async function getForecast(p: Place): Promise<WeatherResult> {
  const url = `https://api.open-meteo.com/v1/forecast?${coords(p)}&hourly=${HOURLY}&daily=sunrise,sunset&timezone=auto&forecast_days=7`;
  return parse(await getJson<OpenMeteoResponse>(url));
}

export interface Snapshot {
  source_url: string;
  fetched_at: string;
  attribution: string;
  lat: number;
  lon: number;
  start: string;
  end: string;
  data: OpenMeteoResponse;
}

export type ArchiveResult = WeatherResult & { source: 'live' | 'snapshot'; fetchedAt?: string };

export const SNAPSHOT_URL = '/demo/delhi-2024-05.json';

/** True when a request can be honestly answered by the snapshot: same place (±0.05°), dates inside its range. */
export function snapshotMatches(s: Pick<Snapshot, 'lat' | 'lon' | 'start' | 'end'>, p: Place, start: string, end: string): boolean {
  return Math.abs(s.lat - p.lat) <= 0.05 && Math.abs(s.lon - p.lon) <= 0.05 && start >= s.start && end <= s.end;
}

export async function getArchive(p: Place, start: string, end: string, loadSnapshot: () => Promise<Snapshot> = defaultSnapshot): Promise<ArchiveResult> {
  const url = `https://archive-api.open-meteo.com/v1/archive?${coords(p)}&start_date=${start}&end_date=${end}&hourly=${HOURLY}&daily=sunrise,sunset&timezone=auto`;
  try {
    return { ...parse(await getJson<OpenMeteoResponse>(url)), source: 'live' };
  } catch (err) {
    const snap = await loadSnapshot().catch(() => null);
    if (!snap || !snapshotMatches(snap, p, start, end)) throw err;
    console.warn('Open-Meteo archive failed; using bundled snapshot.', err);
    const all = parse(snap.data);
    const inRange = (d: string) => d >= start && d <= end;
    return {
      hours: all.hours.filter((h) => inRange(h.time.slice(0, 10))),
      sun: Object.fromEntries(Object.entries(all.sun).filter(([d]) => inRange(d))),
      source: 'snapshot',
      fetchedAt: snap.fetched_at,
    };
  }
}

async function defaultSnapshot(): Promise<Snapshot> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new ApiError('Snapshot unavailable');
  return res.json();
}

/** Clear the in-memory request cache (tests, manual retry). */
export const clearCache = () => cache.clear();
