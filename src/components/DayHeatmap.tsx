import type { DayResult } from '../types';
import { hhmm } from '../planner/plan';
import { t, type Lang } from '../i18n/strings';
import { fmtDate } from './CrewCard';
import { blockEnd, blockLabel, catName } from './HeatStrip';

/** Days × hours grid. With plans on, hours outside the plan fade; the usual shift has a white underline. */
export function DayHeatmap({ lang, days, from, to, showPlan, usual, best, onOpen, dateFmt = { weekday: 'short', day: 'numeric', month: 'short' } }: {
  lang: Lang;
  days: DayResult[];
  from: number;
  to: number;
  showPlan: boolean;
  usual: { start: number; end: number };
  best?: string | null;
  onOpen?: (date: string) => void;
  dateFmt?: Intl.DateTimeFormatOptions;
}) {
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const cols = { '--cols': hours.length } as React.CSSProperties;
  return (
    <div className={`heatmap${showPlan ? " plans" : ""}`} role="table" aria-label="Heat level by day and hour">
      <div className="heatmap-row" style={cols} role="row">
        <span role="columnheader" className="sr-only">
          Day
        </span>
        <span aria-hidden />
        {hours.map((h) => (
          <span key={h} className="hm-head" role="columnheader">
            {h % 2 === from % 2 ? hhmm(h).slice(0, 2) : ''}
          </span>
        ))}
        <span className="hm-side" role="columnheader">
          {t(lang, 'mRedBlack')}
        </span>
      </div>
      {days.map((d) => {
        const byHour = new Map(d.hours.map((h) => [h.hour, h]));
        const inPlan = (h: number) => d.recommended.blocks.some((b) => h >= b.start && h < Math.ceil(blockEnd(b)));
        const planText = d.recommended.blocks.map(blockLabel).join(', ') || '—';
        const label = `${fmtDate(lang, d.date)}. ${t(lang, 'mRedBlack')}: ${d.baseline.metrics.hoursCat4plus} → ${d.recommended.metrics.hoursCat4plus}. ${t(lang, 'legendPlan')}: ${planText}`;
        return (
          <div
            key={d.date}
            role="row"
            className={`heatmap-row${onOpen ? ' clickable' : ''}${best === d.date ? ' best' : ''}`}
            style={cols}
            tabIndex={onOpen ? 0 : undefined}
            aria-label={label}
            title={label}
            onClick={() => onOpen?.(d.date)}
            onKeyDown={(e) => {
              if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onOpen(d.date);
              }
            }}
          >
            <span className="hm-label" role="rowheader">
              {fmtDate(lang, d.date, dateFmt)}
            </span>
            {hours.map((h) => {
              const c = byHour.get(h)?.category ?? null;
              const cls = [`hm-cell`, `cat-${c ?? 'null'}`, showPlan && inPlan(h) ? 'in-plan' : '', h >= usual.start && h < usual.end ? 'in-usual' : ''].join(' ');
              return (
                <span key={h} role="cell" className={cls} aria-label={`${hhmm(h)} ${catName(lang, c)}`}>
                  {c ?? ''}
                </span>
              );
            })}
            <span className="hm-side" role="cell">
              {d.baseline.metrics.hoursCat4plus} → <b>{showPlan ? d.recommended.metrics.hoursCat4plus : '·'}</b>
              {!d.recommended.feasible && showPlan ? ' *' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
