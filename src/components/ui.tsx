import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';

export function Banner({ kind, children, action }: { kind: 'info' | 'warn' | 'error'; children: ReactNode; action?: ReactNode }) {
  const Icon = kind === 'error' ? OctagonAlert : kind === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden />
      <div>{children}</div>
      {action}
    </div>
  );
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Number that tweens from its previous value (instant under reduced motion). */
export function Counter({ value, format = (n) => String(Math.round(n)), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value || prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{format(shown)}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const n = (i + d + tabs.length) % tabs.length;
    refs.current[n]?.focus();
    onChange(tabs[n].id);
  };
  return (
    <nav className="tabs" role="tablist" aria-label="Views">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls="view"
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  // Five stepped bars, cool → hot: the heat-flag ladder.
  const c = ['#e3e8ec', '#2b7445', '#f0c02e', '#c42d26', '#141414'];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      {c.map((fill, i) => (
        <rect key={i} x={i * 4} y={16 - i * 3.5} width="3.4" height={4 + i * 3.5} rx="0.6" fill={fill} stroke={i === 0 ? '#aeb5ab' : 'none'} strokeWidth="0.5" />
      ))}
    </svg>
  );
}
