import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS, decodeInputs, encodeInputs } from './share';

const place = { name: 'Delhi', country: 'India', lat: 28.65195, lon: 77.23149, timezone: 'Asia/Kolkata' };

describe('share URL', () => {
  it('round-trips inputs, place, date and language', () => {
    const inputs = { ...DEFAULT_INPUTS, workload: 'heavy' as const, requiredHours: 6.5, maxBlocks: 1 as const };
    const d = decodeInputs(encodeInputs({ place, inputs, lang: 'hi', date: '2024-05-13' }));
    expect(d.inputs).toEqual(inputs);
    expect(d.place).toEqual({ ...place, lat: Number(place.lat.toFixed(4)), lon: Number(place.lon.toFixed(4)) });
    expect(d.lang).toBe('hi');
    expect(d.date).toBe('2024-05-13');
  });

  it('drops invalid or hostile values', () => {
    const d = decodeInputs('?load=nuclear&hours=99&usual=17-9&window=6-30&blocks=3&lang=xx&date=tomorrow&lat=500&lon=1&place=x');
    expect(d.inputs).toEqual({});
    expect(d.place).toBeUndefined();
    expect(d.lang).toBeUndefined();
    expect(d.date).toBeUndefined();
  });

  it('strips control characters from place names', () => {
    const d = decodeInputs('?place=Del%0Ahi%00&lat=28&lon=77');
    expect(d.place?.name).toBe('Delhi');
  });
});
