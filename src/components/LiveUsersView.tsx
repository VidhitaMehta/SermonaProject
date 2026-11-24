import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, Wifi, UserPlus, MessageSquare, Activity, LogIn, LogOut, Eye, SmilePlus, CheckSquare, Moon } from 'lucide-react';
import {
  members,
  isOnline,
  lastSeen,
  visitsToday,
  onlineTimeline,
  recentActivity,
  initialsOf,
  colorOf,
  timeAgo,
  currentActivity,
  SimPerson,
} from '../lib/simulatedPlatform';
import { usePlatformSnapshot } from './PlatformPulse';

const serif = { fontFamily: "Baskerville, 'Palatino Linotype', Georgia, serif" };
const PAGE = 40;

type Filter = 'all' | 'online' | 'today';

const Avatar: React.FC<{ p: SimPerson; online?: boolean; size?: number }> = ({ p, online, size = 32 }) => (
  <span className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <span
      className="flex items-center justify-center rounded-full text-[11px] font-bold text-slate-950"
      style={{ width: size, height: size, background: colorOf(p.id) }}
    >
      {initialsOf(p.name)}
    </span>
    {online !== undefined && (
      <span
        className={`absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${online ? 'bg-emerald-400' : 'bg-slate-600'}`}
      />
    )}
  </span>
);

/** Live users: who is online right now, the last 24 hours, the visit history and every member. */
export const LiveUsersView: React.FC = () => {
  const snap = usePlatformSnapshot();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('online');
  const [shown, setShown] = useState(PAGE);

  const people = useMemo(() => members(now), [now]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .map((p) => {
        const online = isOnline(p, now);
        return { p, online, seen: lastSeen(p, now), visits: visitsToday(p, now), doing: online ? currentActivity(p, now) : null };
      })
      .filter((r) => (filter === 'online' ? r.online : filter === 'today' ? r.visits > 0 : true))
      .filter((r) => !q || `${r.p.name} ${r.p.team.name} ${r.p.role} ${r.p.city}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.online) - Number(a.online) || (b.seen ?? 0) - (a.seen ?? 0));
  }, [people, now, query, filter]);
  const timeline = useMemo(() => onlineTimeline(24, now), [now]);
  const feed = useMemo(() => recentActivity(4, now, 60), [now]);
  const peak = Math.max(1, ...timeline.map((t) => t.online));

  const stats = [
    { icon: Wifi, label: 'Online now', value: snap.onlineNow, accent: true },
    { icon: Users, label: 'Members', value: snap.totalUsers },
    { icon: Activity, label: 'Visitors today', value: snap.visitorsToday },
    { icon: MessageSquare, label: 'Messages today', value: snap.messagesToday },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl text-slate-100" style={serif}>Live users</h1>
            <p className="text-sm text-slate-400 mt-1">
              Who's on Sermona right now, across {snap.totalTeams.toLocaleString('en-IN')} teams.
            </p>
          </div>
          <span className="term text-[10px] uppercase tracking-[0.18em] text-slate-500 border border-slate-800 rounded-md px-2 py-1">
            Simulated demo activity
          </span>
        </header>

        {/* Headline numbers */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Icon className={`w-3.5 h-3.5 ${accent ? 'text-emerald-400' : ''}`} /> {label}
              </div>
              <div className={`mt-2 text-2xl ${accent ? 'text-emerald-300' : 'text-slate-100'}`} style={serif}>
                {value.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </section>

        {/* Last 24 hours */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base text-slate-100" style={serif}>Online over the last 24 hours</h2>
            <span className="term text-[10px] text-slate-500">peak {peak}</span>
          </div>
          <div className="flex items-end gap-1 h-28">
            {timeline.map((t, i) => (
              <div key={t.at} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div
                  className={`w-full rounded-t-sm transition-all duration-700 ${i === timeline.length - 1 ? 'bg-emerald-400' : 'bg-emerald-500/40 group-hover:bg-emerald-400/70'}`}
                  style={{ height: `${Math.max(2, (t.online / peak) * 100)}%` }}
                  title={`${new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${t.online} online`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 term text-[10px] text-slate-600">
            <span>24 h ago</span>
            <span>12 h ago</span>
            <span>now</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Members */}
          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex rounded-lg border border-slate-800 p-0.5">
                {(['online', 'today', 'all'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFilter(f);
                      setShown(PAGE);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs cursor-pointer ${filter === f ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {f === 'online' ? 'Online now' : f === 'today' ? 'Visited today' : 'Everyone'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShown(PAGE);
                  }}
                  placeholder="Search people, teams, roles or cities"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="term text-[11px] text-slate-500">{rows.length.toLocaleString('en-IN')} people</span>
            </div>

            <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/70">
              {rows.slice(0, shown).map(({ p, online, seen, visits, doing }) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/50 hover:bg-slate-850">
                  <Avatar p={p} online={online} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-slate-100 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {p.role} · {p.team.name} · {p.city}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-[11px] ${online ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {online ? (doing === 'Idle' ? 'Online · idle' : doing || 'Online') : seen ? `Last seen ${timeAgo(seen, now)}` : 'Not seen yet'}
                    </div>
                    <div className="term text-[10px] text-slate-600 hidden sm:block">
                      {visits} visit{visits === 1 ? '' : 's'} today · joined {new Date(p.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <div className="px-4 py-10 text-center text-xs text-slate-500">No one matches that search.</div>}
            </div>
            {rows.length > shown && (
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE)}
                className="mt-3 w-full rounded-lg border border-slate-800 py-2 text-xs text-slate-400 hover:text-slate-100 hover:border-slate-600 cursor-pointer"
              >
                Show more ({(rows.length - shown).toLocaleString('en-IN')} left)
              </button>
            )}
          </section>

          {/* Visit history */}
          <aside>
            <h2 className="text-base text-slate-100 mb-3" style={serif}>Visit history</h2>
            <ol className="rounded-2xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/70 max-h-[640px] overflow-y-auto">
              {feed.map((e) => (
                <li key={`${e.person.id}-${e.kind}-${e.at}`} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar p={e.person} size={26} />
                  <div className="min-w-0 flex-1 text-[12px] text-slate-300">
                    <span className="text-slate-100">{e.person.name.split(' ')[0]}</span>{' '}
                    {e.kind === 'joined'
                      ? `joined ${e.person.team.name}`
                      : e.kind === 'online'
                        ? 'came online'
                        : e.kind === 'offline'
                          ? 'went offline'
                          : e.text}
                    <div className="term text-[10px] text-slate-600">{timeAgo(e.at, now)}</div>
                  </div>
                  {e.kind === 'joined' ? (
                    <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  ) : e.kind === 'action' ? (
                    e.action === 'message' ? (
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    ) : e.action === 'react' ? (
                      <SmilePlus className="w-3.5 h-3.5 text-pink-400" />
                    ) : e.action === 'task' ? (
                      <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
                    ) : e.action === 'idle' ? (
                      <Moon className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                    )
                  ) : e.kind === 'online' ? (
                    <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </div>
  );
};
