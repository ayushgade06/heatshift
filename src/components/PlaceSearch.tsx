import { useEffect, useId, useRef, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';
import type { Place } from '../types';
import { geocode } from '../api/openMeteo';
import { t, type Lang } from '../i18n/strings';

export const placeLabel = (p: Place) => [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : '', p.country].filter(Boolean).join(', ');

export function PlaceSearch({ lang, onSelect, search = geocode }: { lang: Lang; onSelect: (p: Place) => void; search?: typeof geocode }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const id = useId();
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const mine = ++seq.current;
    const h = setTimeout(async () => {
      try {
        const r = await search(term, lang === 'mr' ? 'en' : lang);
        if (mine !== seq.current) return;
        setResults(r);
        setActive(0);
        setError(null);
        setOpen(true);
      } catch (e) {
        if (mine === seq.current) setError((e as Error).message);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [q, lang, search]);

  const choose = (p: Place) => {
    onSelect(p);
    setQ('');
    setResults(null);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!results?.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        onSelect({ name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, country: '', lat, lon, timezone: 'auto' });
      },
      () => setLocating(false), // denied: silently fall back to search
      { timeout: 10000 },
    );
  };

  const expanded = open && results !== null;
  return (
    <div className="search">
      <label htmlFor={`${id}-q`} className="sr-only">
        {t(lang, 'searchLabel')}
      </label>
      <div className="search-row">
        <div className="search-input-wrap">
          <Search aria-hidden />
          <input
            id={`${id}-q`}
            className="input"
            type="search"
            role="combobox"
            autoComplete="off"
            aria-expanded={expanded}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={expanded && results?.length ? `${id}-opt-${active}` : undefined}
            placeholder={t(lang, 'searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => results && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>
        {'geolocation' in navigator && (
          <button type="button" className="btn locate" onClick={locate} title={t(lang, 'useMyLocation')} aria-label={t(lang, 'useMyLocation')} disabled={locating}>
            {locating ? <span className="spinner" aria-hidden /> : <LocateFixed aria-hidden />}
          </button>
        )}
      </div>
      {expanded && (
        <ul className="listbox" role="listbox" id={`${id}-list`} aria-label={t(lang, 'searchLabel')}>
          {results.length === 0 && <li className="empty">{t(lang, 'noPlace')}</li>}
          {results.map((p, i) => (
            <li
              key={`${p.lat},${p.lon}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              onMouseEnter={() => setActive(i)}
            >
              <span>{p.name}</span>
              <small>{[p.admin1, p.country].filter(Boolean).join(', ')}</small>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="hint" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
