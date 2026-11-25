import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import type { Place, Workload } from '../types';
import type { ArchiveResult } from '../api/openMeteo';
import { groupByDate, hhmm } from '../planner/plan';
import { summarizeSeason } from '../planner/season';
import { fmtDuration, t, type Lang } from '../i18n/strings';
import { toPlanOptions, type Inputs } from '../share';
import { WORKLOADS } from '../science/heatCategory';
import { DELHI, DEMO_SEASON } from '../presets';
import { DayHeatmap } from '../components/DayHeatmap';
import { fmtDate } from '../components/CrewCard';
import { Banner, Counter } from '../components/ui';

export type SeasonState =
  | { status: 'idle' }
  | { status: 'loading'; place: Place; start: string; end: string }
  | { status: 'error'; place: Place; start: string; end: string; error: string }
  | { status: 'ok'; place: Place; start: string; end: string; data: ArchiveResult };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Archive data lags real time by a few days. */
export const latestArchiveDate = (now = new Date()) => iso(new Date(now.getTime() - 5 * DAY));

export function validateRange(start: string, end: string, now = new Date()): string | null {
  if (!start || !end) return 'Pick a start and end date.';
  if (start > end) return 'The start date must be on or before the end date.';
  if (start < '1940-01-01') return 'Historical data starts in 1940.';
  if (end > latestArchiveDate(now)) return `Historical data is available up to ${latestArchiveDate(now)}.`;
  const days = (Date.parse(end) - Date.parse(start)) / DAY + 1;
  if (days > 31) return `Pick at most 31 days (this range has ${days}).`;
  return null;
}

export function SeasonView({ lang, place, inputs, onInputs, season, onRun, onOpenDay, onPlace }: {
  lang: Lang;
  place: Place | null;
  inputs: Inputs;
  onInputs: (p: Partial<Inputs>) => void;
  season: SeasonState;
  onRun: (p: Place, start: string, end: string) => void;
  onOpenDay: (d: string) => void;
  onPlace: (p: Place) => void;
}) {
  const [start, setStart] = useState(season.status !== 'idle' ? season.start : DEMO_SEASON.start);
  const [end, setEnd] = useState(season.status !== 'idle' ? season.end : DEMO_SEASON.end);
  const [showPlan, setShowPlan] = useState(false);
  const [touched, setTouched] = useState(false);
  const target = place ?? DELHI;
  const invalid = validateRange(start, end);

  const options = useMemo(() => toPlanOptions(inputs), [inputs]);
  const summary = useMemo(() => (season.status === 'ok' ? summarizeSeason(groupByDate(season.data.hours), options) : null), [season, options]);

  const run = () => {
    setTouched(true);
    if (!invalid) onRun(target, start, end);
  };
  const preset = () => {
    setStart(DEMO_SEASON.start);
    setEnd(DEMO_SEASON.end);
    setShowPlan(false);
    if (!place || Math.abs(place.lat - DELHI.lat) > 0.05 || Math.abs(place.lon - DELHI.lon) > 0.05) onPlace(DELHI);
    onRun(DELHI, DEMO_SEASON.start, DEMO_SEASON.end);
  };

  const dur = (m: number) => fmtDuration(lang, m);
  const sp = season.status !== 'idle' ? season : null;

  return (
    <section>
      <div className="view-head">
        <h1>{t(lang, 'tabSeason')}</h1>
        <p>Run HeatShift on real past weather to see how much Red/Black heat a fixed shift would have meant, and how much a planned shift avoids. Every number below is computed from Open-Meteo historical data.</p>
      </div>

      <div className="season-controls">
        <button type="button" className="btn btn-primary" onClick={preset}>
          <History aria-hidden /> Delhi heatwave, May 2024
        </button>
        <span className="hint" style={{ alignSelf: 'center' }}>
          or
        </span>
        <label>
          Place
          <span className="input static">{target.name}</span>
        </label>
        <label htmlFor="season-start">
          Start
          <input id="season-start" className="input" type="date" value={start} min="1940-01-01" max={latestArchiveDate()} onChange={(e) => setStart(e.target.value)} aria-invalid={touched && !!invalid} />
        </label>
        <label htmlFor="season-end">
          End
          <input id="season-end" className="input" type="date" value={end} min="1940-01-01" max={latestArchiveDate()} onChange={(e) => setEnd(e.target.value)} aria-invalid={touched && !!invalid} />
        </label>
        <label htmlFor="season-wl">
          {t(lang, 'workload')}
          <select id="season-wl" className="input" value={inputs.workload} onChange={(e) => onInputs({ workload: e.target.value as Workload })}>
            {WORKLOADS.map((w) => (
              <option key={w} value={w}>
                {t(lang, `wl_${w}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={run} disabled={season.status === 'loading'}>
          {season.status === 'loading' && <span className="spinner" aria-hidden />} Run replay
        </button>
      </div>
      {touched && invalid && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="error">{invalid}</Banner>
        </div>
      )}
      <p className="hint" style={{ marginBottom: 16 }}>
        Using your job settings: {dur(inputs.requiredHours * 60)} of work, usual shift {hhmm(inputs.usualStart)}–{hhmm(inputs.usualEnd)}, allowed {hhmm(inputs.windowStart)}–{hhmm(inputs.windowEnd)}. Change them on the {t(lang, 'tabToday')} tab.
      </p>

      {season.status === 'idle' && <p className="hint">Pick the preset or a date range to start.</p>}
      {season.status === 'loading' && <div className="skeleton" style={{ height: 240 }} aria-busy="true" />}
      {season.status === 'error' && (
        <Banner
          kind="error"
          action={
            <button type="button" className="btn" onClick={() => onRun(season.place, season.start, season.end)}>
              {t(lang, 'retry')}
            </button>
          }
        >
          {season.error}
        </Banner>
      )}

      {season.status === 'ok' && summary && sp && (
        <>
          {season.data.source === 'snapshot' && season.data.fetchedAt && (
            <div style={{ marginBottom: 16 }}>
              <Banner kind="info">{t(lang, 'snapshotBadge', { date: fmtDate(lang, season.data.fetchedAt) })}</Banner>
            </div>
          )}
          <p style={{ fontSize: '1.125rem', maxWidth: '70ch', marginBottom: 16 }}>
            {[sp.place.name, sp.place.country].filter(Boolean).join(', ')}, {fmtDate(lang, sp.start)} to {fmtDate(lang, sp.end)}: the usual {hhmm(inputs.usualStart)}–{hhmm(inputs.usualEnd)} shift spent <b>{summary.baselineCat4plusHours} hours in Red/Black heat</b>. HeatShift plans needed <b>{summary.planCat4plusHours}</b>
            {summary.planWorkMin > summary.baselineWorkMin + 1 ? (
              <>
                {' '}
                and got <b>{dur(summary.planWorkMin - summary.baselineWorkMin)} more work</b> done within the rest rules.
              </>
            ) : (
              '.'
            )}
          </p>
          <div className="season-totals">
            <div className="metric">
              <h3>{t(lang, 'mRedBlack')}</h3>
              <div className="values">
                <span className="before">{summary.baselineCat4plusHours}</span>
                <span className="arrow" aria-hidden>
                  →
                </span>
                <Counter value={summary.planCat4plusHours} className="after good" />
              </div>
            </div>
            <div className="metric">
              <h3>{t(lang, 'mWork')}</h3>
              <div className="values">
                <span className="before">{Math.round(summary.baselineWorkMin / 60)} h</span>
                <span className="arrow" aria-hidden>
                  →
                </span>
                <Counter value={summary.planWorkMin / 60} format={(n) => `${Math.round(n)} h`} className="after good" />
              </div>
            </div>
            <div className="metric">
              <h3>Days the usual shift hit Red/Black</h3>
              <div className="values">
                <span className="after">
                  {summary.baselineOverCat4Days} / {summary.days.length}
                </span>
              </div>
            </div>
            <div className="metric">
              <h3>Days the full job could not fit safely</h3>
              <div className="values">
                <span className="after">
                  {summary.infeasibleDays.length} / {summary.days.length}
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <label className="toggle">
                <input type="checkbox" checked={showPlan} onChange={(e) => setShowPlan(e.target.checked)} /> Show HeatShift plans
              </label>
              <span className="hint">Select a day to open it in the {t(lang, 'tabToday')}. White underline: usual shift.</span>
            </div>
            <div className="panel-scroll">
              <DayHeatmap lang={lang} days={summary.days} from={options.windowStart} to={options.windowEnd} showPlan={showPlan} usual={options.baseline} onOpen={onOpenDay} dateFmt={{ weekday: 'short', day: 'numeric', month: 'short' }} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

