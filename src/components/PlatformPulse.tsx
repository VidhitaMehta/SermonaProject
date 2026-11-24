import React, { useEffect, useRef, useState } from 'react';
import { snapshot, PlatformSnapshot } from '../lib/simulatedPlatform';

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

/** Refreshes the simulated platform numbers every 20 seconds. */
export const usePlatformSnapshot = (intervalMs = 20_000) => {
  const [snap, setSnap] = useState<PlatformSnapshot>(() => snapshot());
  useEffect(() => {
    const t = setInterval(() => setSnap(snapshot()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return snap;
};

/** Live platform-wide numbers (online now, people, teams, messages today). Click to open Live users. */
export const PlatformPulse: React.FC<{ className?: string; onOpen?: () => void }> = ({ className = '', onOpen }) => {
  const s = usePlatformSnapshot();
  const Wrapper = onOpen ? 'button' : 'div';
  return (
    <Wrapper
      {...(onOpen ? { type: 'button' as const, onClick: onOpen, title: 'See who is online' } : {})}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 text-left ${onOpen ? 'cursor-pointer hover:text-slate-200' : ''} ${className}`}
      aria-live="polite"
    >
      <span className="flex items-center gap-1.5 text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="term">
          <CountUp value={s.onlineNow} /> online now
        </span>
      </span>
      <span className="term">
        <span className="text-slate-200"><CountUp value={s.totalUsers} /></span> people
      </span>
      <span className="term">
        <span className="text-slate-200"><CountUp value={s.totalTeams} /></span> teams
      </span>
      <span className="term">
        <span className="text-slate-200"><CountUp value={s.messagesToday} /></span> messages today
      </span>
      {onOpen && <span className="term text-emerald-400">View live users →</span>}
    </Wrapper>
  );
};
