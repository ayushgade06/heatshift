import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Place, SunTimes, HourPoint } from './types';
import { getArchive, getForecast, type WeatherResult } from './api/openMeteo';
import { groupByDate, planDay } from './planner/plan';
import { DEFAULT_INPUTS, decodeInputs, encodeInputs, toPlanOptions, type Inputs } from './share';
import { LANG_NAMES, LANG_TAGS, LANGS, t, type Lang } from './i18n/strings';
import { PlaceSearch } from './components/PlaceSearch';
import { Logo, Tabs } from './components/ui';
import { TodayView, type DayData } from './views/TodayView';
import { WeekView } from './views/WeekView';
import { SeasonView, type SeasonState } from './views/SeasonView';
import { MethodologyView } from './views/MethodologyView';
import { DELHI, DEMO_DAY } from './presets';

type Tab = 'today' | 'week' | 'season' | 'how';


export type ForecastState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ok'; data: WeatherResult; savedAt?: string };

const STORE_KEY = 'heatshift:last-forecast';
const samePlace = (a: Place, b: Place) => Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;

function saveForecast(place: Place, data: WeatherResult) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ place, data, savedAt: new Date().toISOString() }));
  } catch {
    /* storage unavailable: offline fallback simply won't exist */
  }
}
function loadSavedForecast(place: Place): { data: WeatherResult; savedAt: string } | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    return s && samePlace(s.place, place) ? s : null;
  } catch {
    return null;
  }
}

interface History {
  place: Place;
  date: string;
  hours: HourPoint[];
  sun?: SunTimes;
  source: 'live' | 'snapshot';
  fetchedAt?: string;
}

const initial = decodeInputs(window.location.search);

export default function App() {
  const [lang, setLang] = useState<Lang>(initial.lang ?? 'en');
  const [tab, setTab] = useState<Tab>('today');
  const [place, setPlace] = useState<Place | null>(initial.place ?? null);
  const [inputs, setInputs] = useState<Inputs>({ ...DEFAULT_INPUTS, ...initial.inputs });
  const [forecast, setForecast] = useState<ForecastState>({ status: 'idle' });
  const [selDate, setSelDate] = useState<string | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [historyState, setHistoryState] = useState<{ loading: boolean; error?: string; date?: string }>({ loading: false });
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [season, setSeason] = useState<SeasonState>({ status: 'idle' });
  const [reload, setReload] = useState(0);

  const options = useMemo(() => toPlanOptions(inputs), [inputs]);

  useEffect(() => {
    document.documentElement.lang = LANG_TAGS[lang];
  }, [lang]);

  // Forecast for the chosen place, with an offline fallback to the last saved forecast.
  useEffect(() => {
    if (!place) return;
    let live = true;
    setForecast({ status: 'loading' });
    getForecast(place)
      .then((data) => {
        if (!live) return;
        setForecast({ status: 'ok', data });
        saveForecast(place, data);
      })
      .catch((e: Error) => {
        if (!live) return;
        const saved = loadSavedForecast(place);
        setForecast(saved ? { status: 'ok', data: saved.data, savedAt: saved.savedAt } : { status: 'error', error: e.message });
      });
    return () => {
      live = false;
    };
  }, [place, reload]);

  const loadHistoryDay = useCallback(async (p: Place, date: string) => {
    setHistoryState({ loading: true, date });
    try {
      const r = await getArchive(p, date, date);
      setHistory({ place: p, date, hours: r.hours, sun: r.sun[date], source: r.source, fetchedAt: r.fetchedAt });
      setHistoryState({ loading: false });
    } catch (e) {
      setHistoryState({ loading: false, error: (e as Error).message, date });
    }
  }, []);

  // Deep link to a historical day (?date=…)
  useEffect(() => {
    if (initial.place && initial.date) loadHistoryDay(initial.place, initial.date);
  }, [loadHistoryDay]);

  const forecastDays = useMemo(() => {
    if (forecast.status !== 'ok') return [];
    const by = groupByDate(forecast.data.hours);
    return Object.keys(by)
      .sort()
      .map((d) => planDay(by[d], options));
  }, [forecast, options]);

  const activeHistory = history && place && samePlace(history.place, place) ? history : null;
  const date = activeHistory?.date ?? selDate ?? forecastDays[0]?.date ?? null;

  const day: DayData | null = useMemo(() => {
    if (activeHistory) {
      return { kind: 'history', date: activeHistory.date, result: planDay(activeHistory.hours, options), sun: activeHistory.sun, source: activeHistory.source, fetchedAt: activeHistory.fetchedAt };
    }
    const r = forecastDays.find((d) => d.date === date);
    if (!r || forecast.status !== 'ok') return null;
    return { kind: 'forecast', date: r.date, result: r, sun: forecast.data.sun[r.date], savedAt: forecast.savedAt };
  }, [activeHistory, forecastDays, date, options, forecast]);

  const dayKey = place && date ? `${place.lat},${place.lon},${date}` : '';

  // Keep the URL shareable (no personal data: place + job inputs only).
  useEffect(() => {
    if (!place) return;
    const qs = encodeInputs({ place, inputs, lang, date: activeHistory?.date });
    window.history.replaceState(null, '', `?${qs}`);
  }, [place, inputs, lang, activeHistory]);

  const choosePlace = (p: Place) => {
    setPlace(p);
    setHistory(null);
    setHistoryState({ loading: false });
    setSelDate(null);
    setTab((tb) => (tb === 'how' ? 'today' : tb));
  };

  const runDemo = () => {
    setPlace(DELHI);
    setSelDate(null);
    setTab('today');
    loadHistoryDay(DELHI, DEMO_DAY);
  };

  const openSeasonDay = (d: string) => {
    if (season.status !== 'ok') return;
    setHistory({ place: season.place, date: d, hours: season.data.hours.filter((h) => h.time.startsWith(d)), sun: season.data.sun[d], source: season.data.source, fetchedAt: season.data.fetchedAt });
    setTab('today');
    window.scrollTo({ top: 0 });
  };

  const runSeason = async (p: Place, start: string, end: string) => {
    setSeason({ status: 'loading', place: p, start, end });
    try {
      const data = await getArchive(p, start, end);
      setSeason({ status: 'ok', place: p, start, end, data });
    } catch (e) {
      setSeason({ status: 'error', place: p, start, end, error: (e as Error).message });
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: t(lang, 'tabToday') },
    { id: 'week', label: t(lang, 'tabWeek') },
    { id: 'season', label: t(lang, 'tabSeason') },
    { id: 'how', label: t(lang, 'tabHow') },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <a className="wordmark" href="./" aria-label="HeatShift home">
          <Logo />
          <b>HeatShift</b>
          <small>{t(lang, 'tagline')}</small>
        </a>
        <PlaceSearch lang={lang} onSelect={choosePlace} />
        <label className="sr-only" htmlFor="lang">
          {t(lang, 'language')}
        </label>
        <select id="lang" className="lang-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {LANG_NAMES[l]}
            </option>
          ))}
        </select>
      </header>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <main id="view" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'today' && (
          <TodayView
            lang={lang}
            place={place}
            inputs={inputs}
            onInputs={(p) => setInputs((i) => ({ ...i, ...p }))}
            forecast={forecast}
            forecastDays={forecastDays}
            day={day}
            historyState={historyState}
            onPickDate={(d) => {
              setHistory(null);
              setSelDate(d);
            }}
            revealed={revealedKey === dayKey && !!dayKey}
            onReveal={() => setRevealedKey(dayKey)}
            onRetry={() => (historyState.error && place && historyState.date ? loadHistoryDay(place, historyState.date) : setReload((n) => n + 1))}
            onDemo={runDemo}
            onPlace={choosePlace}
          />
        )}
        {tab === 'week' && (
          <WeekView
            lang={lang}
            place={place}
            forecast={forecast}
            days={forecastDays}
            options={options}
            onOpen={(d) => {
              setHistory(null);
              setSelDate(d);
              setTab('today');
            }}
            onRetry={() => setReload((n) => n + 1)}
          />
        )}
        {tab === 'season' && <SeasonView lang={lang} place={place} inputs={inputs} onInputs={(p) => setInputs((i) => ({ ...i, ...p }))} season={season} onRun={runSeason} onOpenDay={openSeasonDay} onPlace={choosePlace} />}
        {tab === 'how' && <MethodologyView />}
      </main>

      <footer className="footer">
        <span>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            {t(lang, 'footerData')}
          </a>
        </span>
        <span>{t(lang, 'footerAdvice')}</span>
      </footer>
    </div>
  );
}
