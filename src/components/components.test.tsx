import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { PlaceSearch } from './PlaceSearch';
import { crewText } from './CrewCard';
import { TodayView } from '../views/TodayView';
import { toHourPoints } from '../api/openMeteo';
import { groupByDate, planDay } from '../planner/plan';
import { DEFAULT_INPUTS, toPlanOptions } from '../share';
import { fmtDuration } from '../i18n/strings';
import type { Place } from '../types';

const places: Place[] = [
  { name: 'Delhi', country: 'India', lat: 28.65, lon: 77.23, timezone: 'Asia/Kolkata' },
  { name: 'Delhi', country: 'United States', lat: 42.28, lon: -74.92, timezone: 'America/New_York' },
];

describe('PlaceSearch', () => {
  it('selects a result with the keyboard', async () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const search = vi.fn(async () => places);
    render(<PlaceSearch lang="en" onSelect={onSelect} search={search} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Delhi' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(search).toHaveBeenCalledWith('Delhi', 'en');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toMatch(/opt-1$/);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(places[1]);
    vi.useRealTimers();
  });
});

// Real Open-Meteo data: Delhi, May 2024 (bundled snapshot).
const snap = JSON.parse(readFileSync('public/demo/delhi-2024-05.json', 'utf8'));
const day13 = groupByDate(toHourPoints(snap.data))['2024-05-13'];
const result = planDay(day13, toPlanOptions(DEFAULT_INPUTS));

describe('TodayView', () => {
  it('shows before/after values equal to planDay output', () => {
    const noop = () => {};
    render(
      <TodayView
        lang="en"
        place={places[0]}
        inputs={DEFAULT_INPUTS}
        onInputs={noop}
        forecast={{ status: 'idle' }}
        forecastDays={[]}
        day={{ kind: 'history', date: '2024-05-13', result, source: 'snapshot', fetchedAt: snap.fetched_at }}
        historyState={{ loading: false }}
        onPickDate={noop}
        revealed
        onReveal={noop}
        onRetry={noop}
        onDemo={noop}
        onPlace={noop}
      />,
    );
    const metrics = document.querySelectorAll('.metric');
    const red = within(metrics[0] as HTMLElement);
    expect(red.getByText(`${result.baseline.metrics.hoursCat4plus} h`)).toBeTruthy();
    expect(red.getByText(`${result.recommended.metrics.hoursCat4plus} h`)).toBeTruthy();
    const work = within(metrics[1] as HTMLElement);
    expect(work.getByText(fmtDuration('en', result.baseline.metrics.effectiveWorkMin))).toBeTruthy();
    expect(work.getByText(fmtDuration('en', result.recommended.metrics.effectiveWorkMin))).toBeTruthy();
    // The demo day's headline, computed from real data:
    expect(result.baseline.metrics.hoursCat4plus).toBeGreaterThan(result.recommended.metrics.hoursCat4plus);
    expect(screen.getByText(/Cached Open-Meteo data/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Crew heat plan' })).toBeTruthy();
  });
});

describe('crewText', () => {
  it.each(['en', 'hi', 'mr', 'es'] as const)('%s: ≤ 1000 chars with times, water and disclaimer', (lang) => {
    const text = crewText({ lang, place: 'Delhi', date: '2024-05-13', workload: 'moderate', plan: result.recommended });
    expect(text.length).toBeLessThanOrEqual(1000);
    expect(text).toContain('06:00');
    expect(text).toMatch(/0[.,]7/); // ¾ qt ≈ 0.7 L
    expect(text).toContain('Open-Meteo');
    expect(text).not.toMatch(/\{\w+\}|undefined/);
  });
});
