import { useEffect, useState } from 'react';
import { Check, Copy, Droplet, Printer, Share2, Square, Volume2 } from 'lucide-react';
import type { Plan, Workload } from '../types';
import { hhmm } from '../planner/plan';
import { LANG_TAGS, t, type Lang } from '../i18n/strings';
import { clean } from '../share';
import { blockLabel } from './HeatStrip';

export const fmtDate = (lang: Lang, iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Intl.DateTimeFormat(`${LANG_TAGS[lang]}-u-nu-latn`, { ...opts, timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** Consecutive plan hours that need rest, grouped by identical work/rest pattern. */
export function breakRuns(plan: Plan) {
  const runs: { from: number; to: number; work: number; rest: number }[] = [];
  for (const h of plan.perHour) {
    if (h.restMin < 0.5) continue;
    const full = h.workMin + h.restMin;
    const work = Math.round((h.workMin / full) * 60);
    const last = runs.at(-1);
    if (last && last.to === h.hour && last.work === work) last.to = h.hour + 1;
    else runs.push({ from: h.hour, to: h.hour + 1, work, rest: 60 - work });
  }
  return runs;
}

/** Highest hourly water need across the plan, in litres (conservative). */
export const hourlyWaterL = (plan: Plan) => Math.max(0, ...plan.perHour.map((h) => (h.waterL * 60) / (h.workMin + h.restMin)));

export interface CrewCardData {
  lang: Lang;
  place: string;
  date: string;
  workload: Workload;
  plan: Plan;
}

const litres = (lang: Lang, l: number) => new Intl.NumberFormat(`${LANG_TAGS[lang]}-u-nu-latn`, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(l);

/** Plain-text version for WhatsApp / clipboard / speech. Kept under 1000 chars. */
export function crewText({ lang, place, date, workload, plan }: CrewCardData): string {
  const lines = [
    `${t(lang, 'cardShareIntro', { place: clean(place, 60), date: fmtDate(lang, date) })} (${t(lang, `wl_${workload}`)})`,
    `${t(lang, 'cardWorkHours')}: ${plan.blocks.map(blockLabel).join(', ')}`,
  ];
  const runs = breakRuns(plan);
  if (runs.length) {
    lines.push(`${t(lang, 'cardBreaks')}:`);
    for (const r of runs.slice(0, 4)) lines.push(`- ${t(lang, 'cardPattern', { time: `${hhmm(r.from)}–${hhmm(r.to)}`, work: r.work, rest: r.rest })}`);
  }
  lines.push(t(lang, 'cardWater', { litres: litres(lang, hourlyWaterL(plan)) }));
  lines.push(`${t(lang, 'cardSignsTitle')} ${t(lang, 'cardSigns')}`);
  lines.push(t(lang, 'cardAction'));
  lines.push(t(lang, 'cardDisclaimer'));
  return lines.join('\n').slice(0, 1000);
}

function useVoice(lang: Lang) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const tag = LANG_TAGS[lang].toLowerCase();
      const vs = speechSynthesis.getVoices();
      setVoice(vs.find((v) => v.lang.toLowerCase().replace('_', '-') === tag) ?? vs.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null);
    };
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
    return () => speechSynthesis.removeEventListener('voiceschanged', pick);
  }, [lang]);
  return voice;
}

export function CrewCard(d: CrewCardData) {
  const { lang, plan } = d;
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voice = useVoice(lang);
  const text = crewText(d);
  const runs = breakRuns(plan);

  useEffect(() => () => void (typeof speechSynthesis !== 'undefined' && speechSynthesis.cancel()), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the WhatsApp link still works */
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t(lang, 'cardTitle'), text });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const speak = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text.replace(/–/g, ' to ').replace(/^- /gm, ''));
    u.lang = LANG_TAGS[lang];
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <article className="crew" aria-labelledby="crew-title" lang={LANG_TAGS[lang]}>
      <header>
        <div>
          <h2 id="crew-title">{t(lang, 'cardTitle')}</h2>
          <p className="meta">
            {d.place}, {fmtDate(lang, d.date)}. {t(lang, 'inputsTitle')}: {t(lang, `wl_${d.workload}`)}
          </p>
        </div>
        <div className="crew-actions">
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer aria-hidden /> {t(lang, 'print')}
          </button>
          <button type="button" className="btn" onClick={share}>
            <Share2 aria-hidden /> {t(lang, 'share')}
          </button>
          <button type="button" className="btn" onClick={copy} aria-live="polite">
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {t(lang, copied ? 'copied' : 'copy')}
          </button>
          {voice && (
            <button type="button" className="btn" onClick={speak} aria-pressed={speaking}>
              {speaking ? <Square aria-hidden /> : <Volume2 aria-hidden />} {t(lang, speaking ? 'stopReading' : 'readAloud')}
            </button>
          )}
        </div>
      </header>

      <section>
        <h3>{t(lang, 'cardWorkHours')}</h3>
        <div className="times">
          {plan.blocks.map((b) => (
            <span key={b.start} className="time">
              {blockLabel(b)}
            </span>
          ))}
        </div>
      </section>

      <div className="grid2">
        <section>
          <h3>{t(lang, 'cardBreaks')}</h3>
          {runs.length ? (
            <ul>
              {runs.map((r) => (
                <li key={r.from}>{t(lang, 'cardPattern', { time: `${hhmm(r.from)}–${hhmm(r.to)}`, work: r.work, rest: r.rest })}</li>
              ))}
            </ul>
          ) : (
            <p>{t(lang, 'cardNoBreaks')}</p>
          )}
        </section>
        <section>
          <h3>
            <Droplet aria-hidden className="inline-icon" /> {t(lang, 'cardWaterTitle')}
          </h3>
          <p>{t(lang, 'cardWater', { litres: litres(lang, hourlyWaterL(plan)) })}</p>
        </section>
        <section className="danger">
          <h3>{t(lang, 'cardSignsTitle')}</h3>
          <p>{t(lang, 'cardSigns')}</p>
          <p>
            <b>{t(lang, 'cardAction')}</b>
          </p>
        </section>
        <section>
          <p>{t(lang, 'cardAcclim')}</p>
        </section>
      </div>
      <footer>{t(lang, 'cardDisclaimer')}</footer>
    </article>
  );
}
