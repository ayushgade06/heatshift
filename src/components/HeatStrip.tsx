import type { Block, HourPoint, Plan, SunTimes } from '../types';
import { hhmm } from '../planner/plan';
import { t, type Lang } from '../i18n/strings';

const pct = (h: number) => `${(h / 24) * 100}%`;

/** Fractional end hour of a block ("10:40" → 10.67). */
export const blockEnd = (b: Block) => (b.endsAt ? Number(b.endsAt.slice(0, 2)) + Number(b.endsAt.slice(3)) / 60 : b.end);
export const blockLabel = (b: Block) => `${hhmm(b.start)}–${b.endsAt ?? hhmm(b.end)}`;
const sunHour = (iso?: string) => (iso ? Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60 : null);

export function catName(lang: Lang, c: number | null) {
  return c === null ? t(lang, 'noData') : t(lang, `cat${c}` as 'cat0');
}

function Bars({ blocks, kind, label }: { blocks: Block[]; kind: 'usual' | 'plan'; label: string }) {
  return (
    <>
      {blocks.map((b, i) => (
        <div key={`${b.start}-${i}`} className={`bar bar-${kind}`} style={{ left: pct(b.start), width: `calc(${pct(blockEnd(b) - b.start)} - 2px)` }} title={`${label}: ${blockLabel(b)}`}>
          {blockEnd(b) - b.start < 3 ? `${String(b.start).padStart(2, "0")}–${b.endsAt ?? String(b.end).padStart(2, "0")}` : blockLabel(b)}
        </div>
      ))}
    </>
  );
}

export function HeatStrip({ lang, hours, sun, windowStart, windowEnd, usual, plan }: { lang: Lang; hours: HourPoint[]; sun?: SunTimes; windowStart: number; windowEnd: number; usual: Block; plan: Plan | null }) {
  const byHour = new Map(hours.map((h) => [h.hour, h]));
  const rise = sunHour(sun?.sunrise);
  const set = sunHour(sun?.sunset);
  return (
    <div className="ruler-panel">
      <div className="ruler-scroll" tabIndex={-1}>
        <div className="ruler">
          <span aria-hidden style={{ gridArea: '1 / 1' }} />
          <div className="track ticks" aria-hidden style={{ gridArea: '1 / 2' }}>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h}>{hhmm(h)}</span>
            ))}
          </div>

          <span className="row-label" style={{ gridArea: '2 / 1' }}>
            {t(lang, 'heatLevel')}
          </span>
          <div className="track" style={{ gridArea: '2 / 2' }}>
            <ol className="track cells" style={{ gridColumn: '1 / -1' }} aria-label={t(lang, 'heatLevel')}>
              {Array.from({ length: 24 }, (_, h) => {
                const p = byHour.get(h);
                const c = p?.category ?? null;
                const out = h < windowStart || h >= windowEnd;
                const label = `${hhmm(h)}, ${t(lang, 'heatLevel').toLowerCase()} ${c ?? '–'} (${catName(lang, c)})${p?.wbgtC != null ? `, WBGT ${p.wbgtC.toFixed(1)} °C` : ''}${p?.tempC != null ? `, air ${p.tempC.toFixed(0)} °C` : ''}`;
                return (
                  <li key={h} tabIndex={0} className={`cell cat-${c ?? 'null'}${out ? ' out' : ''}`} aria-label={label} title={label}>
                    <span className="n">{c ?? '–'}</span>
                    <span className="c">{p?.wbgtC != null ? `${p.wbgtC.toFixed(0)}°` : ''}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          <span className="row-label" style={{ gridArea: '3 / 1' }}>
            {t(lang, 'legendUsual')}
          </span>
          <div className="track lane" style={{ gridArea: '3 / 2' }}>
            <Bars blocks={[usual]} kind="usual" label={t(lang, 'legendUsual')} />
          </div>

          <span className="row-label" style={{ color: 'var(--shade-ink)', gridArea: '4 / 1' }}>
            {t(lang, 'legendPlan')}
          </span>
          <div className="track lane" aria-live="polite" style={{ gridArea: '4 / 2' }}>
            {plan && <Bars key={plan.blocks.map(blockLabel).join()} blocks={plan.blocks} kind="plan" label={t(lang, 'legendPlan')} />}
            {!plan && <span className="lane-empty">—</span>}
          </div>

          <div className="sun-layer" aria-hidden>
            {rise !== null && (
              <div className="sun-mark" style={{ left: pct(rise) }}>
                <span>
                  {t(lang, 'sunrise')} {sun!.sunrise.slice(11, 16)}
                </span>
              </div>
            )}
            {set !== null && (
              <div className="sun-mark" style={{ left: pct(set) }}>
                <span>
                  {t(lang, 'sunset')} {sun!.sunset.slice(11, 16)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="ruler-legend" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((c) => (
          <span key={c} className="swatch">
            <i className={`cat-${c}`} />
            {c} {catName(lang, c)}
          </span>
        ))}
        <span className="swatch">
          <i className="cat-null" /> {t(lang, 'noData')}
        </span>
        <span>° = estimated WBGT (°C)</span>
      </div>
    </div>
  );
}
