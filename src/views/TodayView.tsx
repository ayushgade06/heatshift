import { ShieldCheck, RotateCcw } from 'lucide-react';
import type { DayResult, Place, SunTimes } from '../types';
import { fmtDuration, t, type Lang } from '../i18n/strings';
import type { Inputs } from '../share';
import type { ForecastState } from '../App';
import { PRESETS } from '../presets';
import { InputsPanel } from '../components/InputsPanel';
import { HeatStrip, blockEnd } from '../components/HeatStrip';
import { CrewCard, fmtDate } from '../components/CrewCard';
import { placeLabel } from '../components/PlaceSearch';
import { Banner, Counter } from '../components/ui';

export type DayData =
  | { kind: 'forecast'; date: string; result: DayResult; sun?: SunTimes; savedAt?: string }
  | { kind: 'history'; date: string; result: DayResult; sun?: SunTimes; source: 'live' | 'snapshot'; fetchedAt?: string };


/** Best forecast day: fewest plan Red/Black hours, then lowest dose; feasible days first. */
export function bestDay(days: DayResult[]): DayResult | null {
  const ok = days.filter((d) => d.recommended.feasible);
  const pool = ok.length ? ok : days;
  return pool.reduce<DayResult | null>((b, d) => (!b || d.recommended.metrics.hoursCat4plus < b.recommended.metrics.hoursCat4plus || (d.recommended.metrics.hoursCat4plus === b.recommended.metrics.hoursCat4plus && d.recommended.metrics.heatDose < b.recommended.metrics.heatDose) ? d : b), null);
}

function EmptyState({ lang, onDemo, onPlace }: { lang: Lang; onDemo: () => void; onPlace: (p: Place) => void }) {
  // Decorative illustration of the heat ruler (not data).
  const sample = [3, 3, 3, 2, 2, 2, 0, 2, 3, 4, 5, 5, 5, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
  return (
    <section className="empty">
      <div className="preview" aria-hidden>
        {sample.map((c, i) => (
          <i key={i} className={`cat-${c}`} />
        ))}
      </div>
      <h1>{t(lang, 'emptyTitle')}</h1>
      <p>{t(lang, 'emptyBody')}</p>
      <div className="presets">
        <button type="button" className="btn btn-primary btn-hero" onClick={onDemo}>
          {t(lang, 'tryDemo')}
        </button>
      </div>
      <div className="presets">
        <span>{t(lang, 'orTry')}</span>
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="btn" onClick={() => onPlace(p)}>
            {p.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="ruler-panel" aria-busy="true">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 68 }} />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, before, after, fmt, better, revealed, cap }: { label: string; before: number; after: number; fmt: (n: number) => string; better: 'lower' | 'higher'; revealed: boolean; cap?: string }) {
  const improved = better === 'lower' ? after < before : after > before;
  const worse = better === 'lower' ? after > before : after < before;
  return (
    <div className="metric">
      <h3>{label}</h3>
      <div className="values" aria-live="polite">
        {revealed ? (
          <>
            <span className="before">{fmt(before)}</span>
            <span className="arrow" aria-hidden>
              →
            </span>
            <span className="sr-only">to</span>
            <Counter value={after} format={fmt} className={`after ${improved ? 'good' : worse ? 'bad' : ''}`} />
          </>
        ) : (
          <span className="after">{fmt(before)}</span>
        )}
      </div>
      {cap && <p className="cap">{cap}</p>}
    </div>
  );
}

export function TodayView(p: {
  lang: Lang;
  place: Place | null;
  inputs: Inputs;
  onInputs: (patch: Partial<Inputs>) => void;
  forecast: ForecastState;
  forecastDays: DayResult[];
  day: DayData | null;
  historyState: { loading: boolean; error?: string };
  onPickDate: (d: string) => void;
  revealed: boolean;
  onReveal: () => void;
  onRetry: () => void;
  onDemo: () => void;
  onPlace: (pl: Place) => void;
}) {
  const { lang, place, day, revealed } = p;
  if (!place) return <EmptyState lang={lang} onDemo={p.onDemo} onPlace={p.onPlace} />;

  const loading = p.historyState.loading || (!day && p.forecast.status === 'loading');
  const error = p.historyState.error ?? (!day && p.forecast.status === 'error' ? p.forecast.error : null);
  const r = day?.result;
  const usual = { start: p.inputs.usualStart, end: p.inputs.usualEnd };
  const plan = r && revealed ? r.recommended : null;
  const dur = (n: number) => fmtDuration(lang, n);

  const best = bestDay(p.forecastDays);
  let infeasibleMsg: string | null = null;
  if (r && revealed && !r.recommended.feasible) {
    const work = dur(r.recommended.metrics.effectiveWorkMin);
    if (!r.recommended.blocks.length) infeasibleMsg = t(lang, 'nothingFits');
    else if (day?.kind === 'forecast' && best && best.date !== day.date && best.recommended.feasible) infeasibleMsg = t(lang, 'infeasible', { work, bestDay: fmtDate(lang, best.date, { weekday: 'long', day: 'numeric', month: 'short' }) });
    else infeasibleMsg = t(lang, 'infeasibleNoDay', { work });
  }

  const sunrise = day?.sun ? Number(day.sun.sunrise.slice(11, 13)) + Number(day.sun.sunrise.slice(14, 16)) / 60 : null;
  const sunset = day?.sun ? Number(day.sun.sunset.slice(11, 13)) + Number(day.sun.sunset.slice(14, 16)) / 60 : null;
  const dark = !!plan && sunrise !== null && sunset !== null && plan.blocks.some((b) => b.start < sunrise - 0.01 || blockEnd(b) > sunset + 0.01);

  return (
    <div className="workspace">
      <InputsPanel lang={lang} inputs={p.inputs} onChange={p.onInputs} />

      <div className="results">
        <div className="day-head">
          <div>
            <p>
              {day?.kind === 'history' ? t(lang, 'historyFor') : t(lang, 'forecastFor')}
              {day && (
                <>
                  : <span className="when">{fmtDate(lang, day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </>
              )}
            </p>
            <h1 title={placeLabel(place)}>{[place.name, place.country].filter(Boolean).join(', ')}</h1>
          </div>
          {day?.kind === 'history' && p.forecastDays.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => p.onPickDate(p.forecastDays[0].date)}>
              <RotateCcw size={16} aria-hidden /> {t(lang, 'backToForecast')}
            </button>
          )}
          {day?.kind === 'forecast' && p.forecastDays.length > 1 && (
            <div className="day-chips" role="group" aria-label={t(lang, 'tabWeek')}>
              {p.forecastDays.map((d) => {
                const c = Math.max(-1, ...d.hours.filter((h) => h.hour >= p.inputs.windowStart && h.hour < p.inputs.windowEnd).map((h) => h.category ?? -1));
                return (
                  <button key={d.date} type="button" className="day-chip" aria-pressed={d.date === day.date} onClick={() => p.onPickDate(d.date)}>
                    <span>{fmtDate(lang, d.date, { weekday: 'short' })}</span>
                    <b>{fmtDate(lang, d.date, { day: 'numeric' })}</b>
                    <i className={`dot cat-${c < 0 ? 'null' : c}`} aria-hidden title={`max ${c}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {day?.kind === 'history' && day.source === 'snapshot' && day.fetchedAt && (
          <Banner kind="info">{t(lang, 'snapshotBadge', { date: fmtDate(lang, day.fetchedAt) })}</Banner>
        )}
        {day?.kind === 'forecast' && day.savedAt && <Banner kind="warn">{t(lang, 'staleBanner', { date: fmtDate(lang, day.savedAt) })}</Banner>}
        {error && (
          <Banner
            kind="error"
            action={
              <button type="button" className="btn" onClick={p.onRetry}>
                {t(lang, 'retry')}
              </button>
            }
          >
            {error}
          </Banner>
        )}

        {loading && <Skeleton />}
        {r && !loading && (
          <>
            <HeatStrip lang={lang} hours={r.hours} sun={day?.sun} windowStart={p.inputs.windowStart} windowEnd={p.inputs.windowEnd} usual={usual} plan={plan} />

            {!revealed ? (
              <div className="plan-cta">
                <button type="button" className="btn btn-primary btn-hero" onClick={p.onReveal}>
                  <ShieldCheck aria-hidden /> {t(lang, 'planButton')}
                </button>
              </div>
            ) : (
              <p className="hint">{t(lang, 'replanNote')}</p>
            )}

            <div className="metrics">
              <Metric label={t(lang, 'mRedBlack')} before={r.baseline.metrics.hoursCat4plus} after={r.recommended.metrics.hoursCat4plus} fmt={(n) => `${Math.round(n)} ${t(lang, 'hoursShort')}`} better="lower" revealed={revealed} />
              <Metric
                label={t(lang, 'mWork')}
                before={r.baseline.metrics.effectiveWorkMin}
                after={r.recommended.metrics.effectiveWorkMin}
                fmt={dur}
                better="higher"
                revealed={revealed}
                cap={`/ ${dur(p.inputs.requiredHours * 60)}`}
              />
              <Metric label={t(lang, 'mRest')} before={r.baseline.metrics.restMin} after={r.recommended.metrics.restMin} fmt={dur} better="lower" revealed={revealed} />
            </div>

            {infeasibleMsg && <Banner kind="warn">{infeasibleMsg}</Banner>}
            {dark && <Banner kind="warn">{t(lang, 'darkWarn')}</Banner>}

            {plan && plan.blocks.length > 0 && <CrewCard lang={lang} place={place.name} date={r.date} workload={p.inputs.workload} plan={plan} />}
          </>
        )}
      </div>
    </div>
  );
}
