import type { DayResult, Place, PlanOptions } from '../types';
import { t, type Lang } from '../i18n/strings';
import type { ForecastState } from '../App';
import { DayHeatmap } from '../components/DayHeatmap';
import { fmtDate } from '../components/CrewCard';
import { Banner } from '../components/ui';
import { bestDay } from './TodayView';

export function WeekView({ lang, place, forecast, days, options, onOpen, onRetry }: { lang: Lang; place: Place | null; forecast: ForecastState; days: DayResult[]; options: PlanOptions; onOpen: (d: string) => void; onRetry: () => void }) {
  if (!place) return <p className="hint">{t(lang, 'emptyBody')}</p>;
  const best = bestDay(days);
  return (
    <section>
      <div className="view-head">
        <h1>
          {t(lang, 'tabWeek')}: {place.name}
        </h1>
        {best && (
          <p>
            {t(lang, 'bestDay')}: <b>{fmtDate(lang, best.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b>. Each row shows the hours you allow work. Hours outside the HeatShift plan are faded. Select a day to open its plan.
          </p>
        )}
      </div>
      {forecast.status === 'loading' && <p className="hint">{t(lang, 'loading')}</p>}
      {forecast.status === 'error' && (
        <Banner
          kind="error"
          action={
            <button type="button" className="btn" onClick={onRetry}>
              {t(lang, 'retry')}
            </button>
          }
        >
          {forecast.error}
        </Banner>
      )}
      {forecast.status === 'ok' && forecast.savedAt && <Banner kind="warn">{t(lang, 'staleBanner', { date: fmtDate(lang, forecast.savedAt) })}</Banner>}
      {days.length > 0 && (
        <div className="panel panel-scroll">
          <DayHeatmap lang={lang} days={days} from={options.windowStart} to={options.windowEnd} showPlan usual={options.baseline} best={best?.date} onOpen={onOpen} />
          <p className="hint" style={{ marginTop: 8 }}>
            ★ {t(lang, 'bestDay')}. * The full job does not fit that day without adding Red/Black hours.
          </p>
        </div>
      )}
    </section>
  );
}
