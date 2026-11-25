import { afterEach, describe, expect, it, vi } from 'vitest';
import archive from './__fixtures__/archive-delhi-2024-05-29.json';
import withNulls from './__fixtures__/archive-with-nulls.json'; // real response with two values nulled by hand
import geo from './__fixtures__/geocode-darwin.json';
import errorBody from './__fixtures__/error.json';
import { ApiError, clearCache, geocode, getArchive, getForecast, snapshotMatches, toHourPoints, type Snapshot } from './openMeteo';
import type { Place } from '../types';

const delhi: Place = { name: 'Delhi', country: 'India', lat: 28.65195, lon: 77.23149, timezone: 'Asia/Kolkata' };

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearCache();
});

describe('toHourPoints', () => {
  it('parses a real archive response', () => {
    const hours = toHourPoints(archive);
    expect(hours).toHaveLength(24);
    expect(hours[14].time).toBe('2024-05-29T14:00');
    expect(hours[14].hour).toBe(14);
    expect(hours[14].wbgtC).toBeGreaterThan(30);
    expect(hours[14].category).toBe(5);
  });
  it('nulls propagate to wbgt and category', () => {
    const hours = toHourPoints(withNulls);
    expect(hours[3]).toMatchObject({ tempC: null, wbgtC: null, category: null });
    expect(hours[4]).toMatchObject({ rh: null, wbgtC: null, category: null });
    expect(hours[5].category).not.toBeNull();
  });
});

describe('client', () => {
  it('geocode maps results', async () => {
    mockFetch(geo);
    const places = await geocode('Darwin');
    expect(places[0]).toMatchObject({ name: 'Darwin', country: 'Australia' });
    expect(typeof places[0].lat).toBe('number');
  });

  it('geocode with no results → []', async () => {
    mockFetch({ generationtime_ms: 0.1 });
    expect(await geocode('zzzqqq')).toEqual([]);
  });

  it('error body yields ApiError with the reason', async () => {
    mockFetch(errorBody, 400);
    await expect(getForecast(delhi)).rejects.toThrow(new ApiError(errorBody.reason));
  });

  it('network failure yields ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fail'))));
    await expect(getForecast(delhi)).rejects.toBeInstanceOf(ApiError);
  });

  it('caches identical requests', async () => {
    const fn = mockFetch(archive);
    await getForecast(delhi);
    await getForecast(delhi);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('snapshot fallback', () => {
  const snap: Snapshot = {
    source_url: 'x',
    fetched_at: '2026-11-26T00:00:00Z',
    attribution: 'Open-Meteo',
    lat: 28.65195,
    lon: 77.23149,
    start: '2024-05-29',
    end: '2024-05-29',
    data: archive,
  };

  it('matching rules', () => {
    expect(snapshotMatches(snap, delhi, '2024-05-29', '2024-05-29')).toBe(true);
    expect(snapshotMatches(snap, { ...delhi, lat: 28.75 }, '2024-05-29', '2024-05-29')).toBe(false);
    expect(snapshotMatches(snap, delhi, '2024-05-28', '2024-05-29')).toBe(false);
  });

  it('uses snapshot only when the live archive fails and the request matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('down'))));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await getArchive(delhi, '2024-05-29', '2024-05-29', async () => snap);
    expect(r.source).toBe('snapshot');
    expect(r.fetchedAt).toBe(snap.fetched_at);
    expect(r.hours).toHaveLength(24);
    await expect(getArchive({ ...delhi, lat: 10 }, '2024-05-29', '2024-05-29', async () => snap)).rejects.toBeInstanceOf(ApiError);
  });

  it('live archive is labelled live', async () => {
    mockFetch(archive);
    const r = await getArchive(delhi, '2024-05-29', '2024-05-29', async () => snap);
    expect(r.source).toBe('live');
  });
});
