import { useId } from 'react';
import type { Workload } from '../types';
import { WORKLOADS } from '../science/heatCategory';
import { hhmm } from '../planner/plan';
import { t, type Lang } from '../i18n/strings';
import type { Inputs } from '../share';

const HOURS = Array.from({ length: 25 }, (_, h) => h);

function HourRange({ lang, legend, start, end, onChange }: { lang: Lang; legend: string; start: number; end: number; onChange: (s: number, e: number) => void }) {
  const id = useId();
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="pair">
        <label htmlFor={`${id}-s`}>
          {t(lang, 'from')}
          <select id={`${id}-s`} className="input" value={start} onChange={(e) => onChange(Number(e.target.value), end)}>
            {HOURS.slice(0, end).map((h) => (
              <option key={h} value={h}>
                {hhmm(h)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-e`}>
          {t(lang, 'to')}
          <select id={`${id}-e`} className="input" value={end} onChange={(e) => onChange(start, Number(e.target.value))}>
            {HOURS.slice(start + 1).map((h) => (
              <option key={h} value={h}>
                {hhmm(h)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

export function InputsPanel({ lang, inputs, onChange }: { lang: Lang; inputs: Inputs; onChange: (patch: Partial<Inputs>) => void }) {
  const id = useId();
  const step = (d: number) => onChange({ requiredHours: Math.min(12, Math.max(1, inputs.requiredHours + d)) });
  return (
    <aside className="inputs" aria-label={t(lang, 'inputsTitle')}>
      <h2>{t(lang, 'inputsTitle')}</h2>

      <fieldset className="field">
        <legend>{t(lang, 'workload')}</legend>
        <div className="segmented four">
          {WORKLOADS.map((w: Workload) => (
            <label key={w}>
              <input type="radio" name={`${id}-wl`} value={w} checked={inputs.workload === w} onChange={() => onChange({ workload: w })} />
              <span>{t(lang, `wl_${w}`)}</span>
            </label>
          ))}
        </div>
        <p className="hint">{t(lang, `wlHint_${inputs.workload}`)}</p>
      </fieldset>

      <div className="field">
        <span className="label" id={`${id}-hl`}>
          {t(lang, 'hoursNeeded')}
        </span>
        <div className="stepper" role="group" aria-labelledby={`${id}-hl`}>
          <button type="button" onClick={() => step(-0.5)} disabled={inputs.requiredHours <= 1} aria-label="−30 min">
            −
          </button>
          <output aria-live="polite">
            {Math.floor(inputs.requiredHours)}
            {inputs.requiredHours % 1 ? ':30' : ''} {t(lang, 'hoursShort')}
          </output>
          <button type="button" onClick={() => step(0.5)} disabled={inputs.requiredHours >= 12} aria-label="+30 min">
            +
          </button>
        </div>
      </div>

      <HourRange lang={lang} legend={t(lang, 'usualShift')} start={inputs.usualStart} end={inputs.usualEnd} onChange={(s, e) => onChange({ usualStart: s, usualEnd: e })} />
      <HourRange lang={lang} legend={t(lang, 'allowedHours')} start={inputs.windowStart} end={inputs.windowEnd} onChange={(s, e) => onChange({ windowStart: s, windowEnd: e })} />

      <fieldset className="field">
        <legend>{t(lang, 'blocks')}</legend>
        <div className="segmented">
          {([1, 2] as const).map((n) => (
            <label key={n}>
              <input type="radio" name={`${id}-b`} value={n} checked={inputs.maxBlocks === n} onChange={() => onChange({ maxBlocks: n })} />
              <span>{t(lang, n === 1 ? 'oneBlock' : 'twoBlocks')}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </aside>
  );
}
