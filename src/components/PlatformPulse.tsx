import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PlatformStats {
  totalUsers?: number;
  totalTeams?: number;
  onlineNow?: number;
  messagesToday?: number;
}

/** Number that counts up smoothly when it changes. */
const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString('en-IN')}</>;
};

/**
 * Live platform-wide numbers (people, teams, online now, messages today) from `stats/platform`.
 * Hidden when the numbers aren't available (local demo mode, or the stats doc doesn't exist).
 */
export const PlatformPulse: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      doc(db, 'stats', 'platform'),
      (snap) => setStats(snap.exists() ? (snap.data() as PlatformStats) : null),
      () => setStats(null) // e.g. rules not published yet: just hide
    );
  }, []);

  if (!stats?.totalUsers) return null;
  const items: [string, number | undefined][] = [
    ['people', stats.totalUsers],
    ['teams', stats.totalTeams],
    ['messages today', stats.messagesToday],
  ];
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 ${className}`} aria-live="polite">
      <span className="flex items-center gap-1.5 text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="term">
          <CountUp value={stats.onlineNow || 0} /> online now
        </span>
      </span>
      {items.map(([label, value]) =>
        value ? (
          <span key={label} className="term">
            <span className="text-slate-200">
              <CountUp value={value} />
            </span>{' '}
            {label}
          </span>
        ) : null
      )}
    </div>
  );
};
