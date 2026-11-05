import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ChevronRight, CheckCircle2, AlertTriangle, FileCheck2, Radio } from 'lucide-react';
import { getDeadlineState, parseDeadline, formatRelative } from '../lib/deadlines';
import { Task, TaskStatus } from '../types';
import { Insignia } from './Insignia';

const STATUS_TAG: Record<TaskStatus, { label: string; cls: string }> = {
  backlog: { label: 'STANDBY', cls: 'border-slate-700 text-slate-500' },
  todo: { label: 'QUEUED', cls: 'border-teal-500/50 text-teal-500' },
  in_progress: { label: 'ACTIVE', cls: 'border-emerald-500/60 text-emerald-500' },
  review: { label: 'REVIEW', cls: 'border-purple-500/50 text-purple-400' },
  completed: { label: 'DONE', cls: 'border-signal/50 text-signal' },
};

const SectionHeader: React.FC<{ index: string; title: string; action?: React.ReactNode }> = ({ index, title, action }) => (
  <div className="flex items-end justify-between mb-3">
    <div>
      <div className="term text-[10px] text-emerald-500 tracking-[0.2em]">{index}</div>
      <h2 className="text-base font-bold uppercase tracking-wide text-slate-100">{title}</h2>
    </div>
    {action}
  </div>
);

/** Workspace overview — the "command centre" landing page. */
export const HomeView: React.FC = () => {
  const { currentUser, project, channels, messages, tasks, decisions, teamMembers, setActiveChannelId, setActiveTab } =
    useWorkspace();
  const now = new Date();
  const firstName = currentUser.name.split(' ')[0];

  const done = tasks.filter((t) => t.completed || t.status === 'completed').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const overdue = tasks.filter((t) => getDeadlineState(t, now) === 'overdue').length;
  const online = teamMembers.filter((m) => m.online || m.id === currentUser.id).length;

  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const taskList: Task[] = (myTasks.length > 0 ? myTasks : tasks)
    .slice()
    .sort((a, b) => Number(a.completed) - Number(b.completed))
    .slice(0, 6);

  const upcoming = tasks
    .filter((t) => !t.completed && t.status !== 'completed')
    .map((t) => ({ task: t, due: parseDeadline(t.deadline, now) }))
    .filter((x): x is { task: Task; due: Date } => x.due !== null)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, 5);
  const projectDue = parseDeadline(project.deadline, now);

  const memberById = new Map(teamMembers.map((m) => [m.id, m]));

  const openChannel = (id: string) => {
    setActiveChannelId(id);
    setActiveTab('channels');
  };

  const stats = [
    { label: 'Mission progress', value: `${pct}%`, tone: 'text-emerald-500' },
    { label: 'Decisions locked', value: String(decisions.length), tone: 'text-teal-500' },
    { label: 'Overdue', value: String(overdue), tone: overdue > 0 ? 'text-rose-400' : 'text-slate-500' },
    { label: 'Squad online', value: `${online}/${teamMembers.length}`, tone: 'text-signal' },
  ];

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Main column */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">
        {/* Status banner */}
        <section className="hud relative overflow-hidden rounded-xl border border-slate-750 bg-slate-950 px-7 py-6">
          {/* scan line */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-scan h-1/2 w-full bg-gradient-to-b from-transparent via-emerald-500/[0.06] to-transparent" />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="term text-[10px] uppercase tracking-[0.25em] text-emerald-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-signal animate-pulse" /> Status report · {now.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase()}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 mt-2">Welcome back, {firstName}.</h1>
              <p className="text-sm text-slate-400 mt-1">
                Operating in <span className="text-slate-200 font-semibold">{project.name}</span>
              </p>
              {/* progress bar */}
              <div className="mt-5 max-w-md">
                <div className="flex justify-between term text-[10px] text-slate-500 mb-1">
                  <span>MISSION PROGRESS</span>
                  <span className="text-emerald-500">{pct}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-sm overflow-hidden">
                  <div className="h-full bg-fun transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
            <div className="hidden md:block animate-float">
              <Insignia size={120} active />
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="lift rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <div className="term text-[10px] uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className={`text-2xl font-extrabold mt-1 ${s.tone}`}>{s.value}</div>
            </div>
          ))}
        </section>

        {/* Channels */}
        <section>
          <SectionHeader index="01" title="Channels" action={<span className="term text-[10px] text-slate-500">{channels.length} OPEN</span>} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {channels.map((c) => {
              const msgs = messages[c.id] || [];
              const last = msgs[msgs.length - 1];
              const senders = Array.from(new Set(msgs.map((m) => m.senderId)))
                .map((id) => memberById.get(id))
                .filter(Boolean)
                .slice(0, 5);
              return (
                <button
                  key={c.id}
                  onClick={() => openChannel(c.id)}
                  className="lift text-left p-4 rounded-lg border border-slate-800 bg-slate-900 cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    <span className="term text-sm font-semibold text-slate-100 truncate">#{c.name}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="border-t border-dashed border-slate-750 my-3" />
                  {senders.length > 0 && (
                    <div className="flex -space-x-1.5 mb-2.5">
                      {senders.map((m) => (
                        <img key={m!.id} src={m!.avatar} alt={m!.name} title={m!.name} className="w-6 h-6 rounded-md object-cover ring-2 ring-slate-900 bg-slate-800" />
                      ))}
                    </div>
                  )}
                  <div className="rounded-md bg-slate-950 border border-slate-800 px-3 py-2">
                    {last ? (
                      <>
                        <span className="term text-[10px] text-emerald-500">{last.senderName.toUpperCase()}</span>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{last.content.replace(/\*\*/g, '')}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 line-clamp-2">{c.topic || 'No transmissions yet.'}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Decisions */}
        <section>
          <SectionHeader
            index="02"
            title="Decision log"
            action={
              <button onClick={() => setActiveTab('decisions')} className="term text-[10px] uppercase tracking-wider text-emerald-500 hover:underline cursor-pointer">
                View all →
              </button>
            }
          />
          {decisions.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-slate-750 text-center text-sm text-slate-500">
              <Insignia size={48} className="mx-auto mb-2 opacity-60" tone="steel" />
              No decisions logged. Run <span className="text-emerald-500 font-semibold">Analyze</span> in a channel.
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.slice(0, 4).map((d) => {
                const ch = d.channelId ? channels.find((c) => c.id === d.channelId) : undefined;
                return (
                  <div key={d.id} className="lift flex items-center gap-4 p-3.5 rounded-lg border border-slate-800 bg-slate-900">
                    <span
                      className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 border ${
                        d.status === 'confirmed' ? 'border-signal/40 text-signal' : 'border-amber-500/40 text-amber-400'
                      }`}
                    >
                      <FileCheck2 className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-100 truncate">{d.title}</div>
                      <div className="term text-[10px] text-slate-500 truncate">
                        {d.confirmedBy ? `CONFIRMED BY ${d.confirmedBy.toUpperCase()}` : 'PROPOSED'}
                        {ch ? ` · #${ch.name}` : ''}
                      </div>
                    </div>
                    <span
                      className={`term px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase ${
                        d.status === 'confirmed' ? 'border-signal/50 text-signal' : 'border-slate-700 text-slate-500'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Right column */}
      <aside className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-950/60 overflow-y-auto px-5 py-6 space-y-8 hidden lg:block">
        <section>
          <SectionHeader
            index="03"
            title={myTasks.length > 0 ? 'My missions' : 'Missions'}
            action={
              <button onClick={() => setActiveTab('tasks')} className="term text-[10px] uppercase tracking-wider text-emerald-500 hover:underline cursor-pointer">
                Board →
              </button>
            }
          />
          {taskList.length === 0 ? (
            <p className="term text-xs text-slate-500">No missions assigned.</p>
          ) : (
            <div className="space-y-2">
              {taskList.map((t) => {
                const tag = STATUS_TAG[t.completed ? 'completed' : t.status];
                const isOverdue = getDeadlineState(t, now) === 'overdue';
                return (
                  <div
                    key={t.id}
                    className={`lift relative p-3 rounded-lg border bg-slate-900 overflow-hidden ${isOverdue ? 'border-rose-500/50' : 'border-slate-800'}`}
                  >
                    {isOverdue && <div className="hazard absolute left-0 top-0 bottom-0 w-1" />}
                    <div className="flex items-center justify-between gap-2">
                      <span className="term text-[10px] text-slate-500 truncate">{(t.assigneeName || 'UNASSIGNED').toUpperCase()}</span>
                      {t.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-signal flex-shrink-0" />
                      ) : (
                        <span className={`term px-1.5 py-0.5 rounded-sm border text-[9px] font-bold flex-shrink-0 ${tag.cls}`}>{tag.label}</span>
                      )}
                    </div>
                    <div className={`text-[13px] font-semibold mt-1.5 ${t.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                      {t.title}
                    </div>
                    {isOverdue && (
                      <div className="term flex items-center gap-1 text-[10px] text-rose-400 mt-1">
                        <AlertTriangle className="w-3 h-3" /> OVERDUE
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeader index="04" title="Deadlines" />
          <div className="space-y-2">
            {projectDue && (
              <div className="hud relative p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-950">
                <div className="term text-[10px] uppercase tracking-wider text-emerald-500">Project deadline</div>
                <div className="text-sm font-bold text-slate-100 mt-1">{project.name}</div>
                <div className={`term text-[11px] mt-0.5 ${projectDue < now ? 'text-rose-400' : 'text-slate-400'}`}>
                  {projectDue.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} ·{' '}
                  {projectDue < now ? `PASSED ${formatRelative(projectDue, now).toUpperCase()}` : formatRelative(projectDue, now).toUpperCase()}
                </div>
              </div>
            )}
            {upcoming.length === 0 && !projectDue && <p className="term text-xs text-slate-500">Nothing scheduled.</p>}
            {upcoming.map(({ task, due }) => {
              const late = due < now;
              return (
                <div key={task.id} className="lift p-3 rounded-lg border border-slate-800 bg-slate-900 flex gap-3">
                  <span
                    className={`w-10 h-10 rounded-md flex flex-col items-center justify-center flex-shrink-0 border term ${
                      late ? 'border-rose-500/50 text-rose-400' : 'border-amber-500/50 text-amber-400'
                    }`}
                  >
                    <span className="text-[8px] font-bold uppercase leading-none">{due.toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="text-sm font-extrabold leading-none mt-0.5">{due.getDate()}</span>
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-100 truncate">{task.title}</div>
                    <div className={`term text-[10px] ${late ? 'text-rose-400' : 'text-slate-400'}`}>
                      {due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {formatRelative(due, now).toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
};
