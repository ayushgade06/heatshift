import { describe, expect, it } from 'vitest';
import { cToF, vaporPressureHpa, wbgtBoM } from './wbgt';
import { categoryFromWbgtC, workRest } from './heatCategory';

const fToC = (f: number) => ((f - 32) * 5) / 9;

describe('wbgt', () => {
  it('vapour pressure at 30 °C / 50 %', () => {
    expect(Math.abs(vaporPressureHpa(30, 50) - 21.2)).toBeLessThanOrEqual(0.1);
  });
  it('BoM WBGT at 30 °C / 50 %', () => {
    expect(Math.abs(wbgtBoM(30, 50) - 29.3)).toBeLessThanOrEqual(0.1);
  });
  it('converts C to F', () => {
    expect(cToF(100)).toBe(212);
    expect(cToF(0)).toBe(32);
  });
});

describe('heat category', () => {
  it.each([
    [77.9, 0],
    [78, 1],
    [81.9, 1],
    [82, 2],
    [84.9, 2],
    [85, 3],
    [88, 4],
    [89.9, 4],
    [90, 5],
    [100, 5],
  ])('%s °F → category %s', (f, cat) => {
    expect(categoryFromWbgtC(fToC(f))).toBe(cat);
  });

  it('work/rest lookup', () => {
    expect(workRest(4, 'moderate')).toEqual({ workMin: 50, restMin: 10, waterQt: 0.75 });
    expect(workRest(0, 'veryHeavy')).toEqual({ workMin: 60, restMin: 0, waterQt: 0.5 });
    expect(workRest(5, 'heavy')).toEqual({ workMin: 15, restMin: 45, waterQt: 1 });
  });
});
