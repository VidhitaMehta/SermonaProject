import React from 'react';
import {
  Crosshair,
  FileCheck2,
  Users,
  ArrowRight,
  Hash,
  Settings2,
  Radar,
  Wifi,
  RotateCcw,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { PlatformPulse } from './PlatformPulse';
import { ViewTab } from '../types';

const serif = { fontFamily: "Baskerville, 'Palatino Linotype', Georgia, serif" };

/**
 * Home screen after login. Four navigation cards (Channels, Mission Board, Decision Log, Squad)
 * and workspace tools. Every page has a Back button that returns here.
 */
export const HomeHub: React.FC = () => {
  const {
    currentUser,
    project,
    tasks,
    decisions,
    teamMembers,
    channels,
    setActiveTab,
    isProjectOwner,
    getChannelAdminId,
    mode,
    resetToDemoData,
  } = useWorkspace();
  const done = tasks.filter((t) => t.completed || t.status === 'completed').length;
  const openTasks = tasks.length - done;
  const mine = tasks.filter((t) => t.assigneeId === currentUser.id && !t.completed && t.status !== 'completed').length;
  const locked = decisions.filter((d) => d.status === 'confirmed').length;
  const online = teamMembers.filter((m) => m.online || m.id === currentUser.id);
  const firstName = currentUser.name.split(' ')[0] || 'there';
  const canManage = isProjectOwner || channels.some((c) => getChannelAdminId(c) === currentUser.id);

  const cards: { tab: ViewTab; icon: React.ElementType; title: string; text: string; stat: string }[] = [
    {
      tab: 'channel-list',
      icon: Hash,
      title: 'Channels',
      text: 'Choose a channel and catch up with your team’s conversations.',
      stat: `${channels.length} channel${channels.length === 1 ? '' : 's'}`,
    },
    {
      tab: 'tasks',
      icon: Crosshair,
      title: 'Mission Board',
      text: 'Every task born from your conversations, traced to its message.',
      stat: `${openTasks} open${mine ? ` · ${mine} yours` : ''}`,
    },
    {
      tab: 'decisions',
      icon: FileCheck2,
      title: 'Decision Log',
      text: 'What the team agreed on, and where it was decided.',
      stat: `${locked} decision${locked === 1 ? '' : 's'} locked`,
    },
    {
      tab: 'team',
      icon: Users,
      title: 'Squad',
      text: 'Your teammates, who is online and who fits each task.',
      stat: `${online.length}/${teamMembers.length} online`,
    },
  ];

  return (
    <div className="sermona-home flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
      <div className="home-constellation" aria-hidden="true"><span/><span/><span/><span/><span/></div>
      <div className="home-content mx-auto max-w-6xl space-y-8">
        {/* Greeting + workspace tools */}
        <header className="home-greeting flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="home-orbital" aria-hidden="true"><i/><i/><i/><span>S</span></div>
          <div>
            <p className="home-workspace term text-[10px] uppercase tracking-[0.25em] text-emerald-500"><span/> {project.name}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl text-slate-100" style={serif}>
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 text-sm text-slate-400">Your people. Your ideas. A little more possibility.</p>
            <PlatformPulse className="mt-3" onOpen={() => setActiveTab('visitors')} />
          </div>
          <div className="home-tools flex flex-wrap gap-2">
            {canManage && (
              <button
                onClick={() => setActiveTab('channel-settings')}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-emerald-500 cursor-pointer"
              >
                <Settings2 size={14} /> Workspace management
              </button>
            )}
            <button
              onClick={() => setActiveTab('insights')}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-emerald-500 cursor-pointer"
            >
              <Radar size={14} /> Intel
            </button>
            <button
              onClick={() => setActiveTab('visitors')}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
            >
              <Wifi size={14} /> Live users
            </button>
            {mode === 'local' && (
              <button
                onClick={resetToDemoData}
                className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <RotateCcw size={14} /> Reset demo data
              </button>
            )}
          </div>
        </header>

        {/* The four cards */}
        <section aria-label="Explore your workspace" className="home-destinations grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <button
                key={c.tab}
                type="button"
                onClick={() => setActiveTab(c.tab)}
                data-destination={c.tab}
                className="home-destination group text-left flex flex-col gap-3 rounded-2xl border border-slate-750 bg-slate-900 p-5 min-h-[190px] sm:min-h-[230px] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/60 hover:bg-slate-850 animate-fade-up"
                style={{ animationDelay: `${80 + i * 90}ms` }}
              >
                <span className="home-card-art" aria-hidden="true"><svg viewBox="0 0 240 95" fill="none">
                  {c.tab === 'channel-list' ? <><path d="M18 30h87v30H65L51 74V60H18ZM128 15h90v30h-28l-13 13V45h-49Z"/><path d="M32 41h57M32 49h32m78-22h59"/></> :
                  c.tab === 'tasks' ? <><circle cx="175" cy="44" r="32"/><circle cx="175" cy="44" r="21"/><circle cx="175" cy="44" r="9"/><path d="m175 44 34-29M22 30h75M22 46h55M22 62h66"/></> :
                  c.tab === 'decisions' ? <><path d="M116 12h66l18 18v51h-84ZM182 12v20h18M131 46l9 9 17-18m-26 31h52M22 35h55m-42 14h55"/></> :
                  <><circle cx="122" cy="44" r="17"/><circle cx="66" cy="44" r="11"/><circle cx="178" cy="44" r="11"/><path d="M96 85V74q26-27 52 0v11M48 73v-9q18-18 36 0m76 0q18-18 36 0v9M82 44h23m34 0h28"/></>}
                </svg></span>
                <span className="home-card-number" aria-hidden="true">0{i + 1}</span>
                <span className="home-card-icon w-11 h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-xl text-slate-100" style={serif}>
                  {c.title}
                </span>
                <span className="text-[13px] leading-relaxed text-slate-400">{c.text}</span>
                {c.tab === 'team' && teamMembers.length > 0 && (
                  <span className="flex -space-x-2">
                    {teamMembers.slice(0, 6).map((m) => (
                      <img
                        key={m.id}
                        src={m.avatar}
                        alt={m.name}
                        title={m.name}
                        className={`w-7 h-7 rounded-full object-cover ring-2 ring-slate-900 bg-slate-800 ${
                          online.some((o) => o.id === m.id) ? '' : 'opacity-50 grayscale'
                        }`}
                      />
                    ))}
                  </span>
                )}
                <span className="mt-auto flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="term text-[11px] text-emerald-300">{c.stat}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-emerald-400" />
                </span>
              </button>
            );
          })}
        </section>
        <div className="home-signoff" aria-hidden="true"><span/><p>The art of organised thought</p><span/></div>
      </div>
    </div>
  );
};
