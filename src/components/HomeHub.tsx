import React, { useState } from 'react';
import {
  LayoutGrid,
  Crosshair,
  FileCheck2,
  Users,
  ArrowRight,
  Hash,
  Plus,
  Trash2,
  Settings2,
  Radar,
  RotateCcw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Portal } from './Portal';
import { PlatformPulse } from './PlatformPulse';
import { ViewTab } from '../types';

const serif = { fontFamily: "Baskerville, 'Palatino Linotype', Georgia, serif" };

/**
 * Home screen after login. Four big cards (Overview, Mission Board, Decision Log, Squad)
 * plus the channel list and workspace tools. Every page has a Back button that returns here.
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
    setActiveChannelId,
    createChannel,
    deleteChannel,
    isProjectOwner,
    isChannelGuest,
    getChannelAdminId,
    unreadCounts,
    mode,
    resetToDemoData,
  } = useWorkspace();
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');

  const done = tasks.filter((t) => t.completed || t.status === 'completed').length;
  const openTasks = tasks.length - done;
  const mine = tasks.filter((t) => t.assigneeId === currentUser.id && !t.completed && t.status !== 'completed').length;
  const locked = decisions.filter((d) => d.status === 'confirmed').length;
  const online = teamMembers.filter((m) => m.online || m.id === currentUser.id);
  const firstName = currentUser.name.split(' ')[0] || 'there';
  const canManage = isProjectOwner || channels.some((c) => getChannelAdminId(c) === currentUser.id);

  const cards: { tab: ViewTab; icon: React.ElementType; title: string; text: string; stat: string }[] = [
    {
      tab: 'dashboard',
      icon: LayoutGrid,
      title: 'Overview',
      text: 'Progress, deadlines and what needs you today.',
      stat: tasks.length ? `${Math.round((done / tasks.length) * 100)}% complete` : 'Fresh start',
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

  const openChannel = (id: string) => {
    setActiveChannelId(id);
    setActiveTab('channels');
  };

  const submitChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createChannel(name.trim(), topic.trim());
    setName('');
    setTopic('');
    setShowNewChannel(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Greeting + workspace tools */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="term text-[10px] uppercase tracking-[0.25em] text-emerald-500">// {project.name}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl text-slate-100" style={serif}>
              Welcome back, {firstName}.
            </h1>
            <p className="mt-1 text-sm text-slate-400">Where would you like to go?</p>
            <PlatformPulse className="mt-3" />
          </div>
          <div className="flex flex-wrap gap-2">
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
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <button
                key={c.tab}
                type="button"
                onClick={() => setActiveTab(c.tab)}
                className="group text-left flex flex-col gap-3 rounded-2xl border border-slate-750 bg-slate-900 p-5 min-h-[190px] sm:min-h-[230px] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/60 hover:bg-slate-850 animate-fade-up"
                style={{ animationDelay: `${80 + i * 90}ms` }}
              >
                <span className="w-11 h-11 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 transition-transform duration-300 group-hover:scale-110">
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

        {/* Channels */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl text-slate-100" style={serif}>
              Channels
            </h2>
            {!isChannelGuest && (
              <button
                onClick={() => setShowNewChannel(true)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
              >
                <Plus size={14} /> New channel
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map((chan) => {
              const unread = unreadCounts[chan.id] ?? chan.unreadCount ?? 0;
              const ct = tasks.filter((t) => t.channelId === chan.id);
              const ctDone = ct.filter((t) => t.completed || t.status === 'completed').length;
              const adminName = teamMembers.find((m) => m.id === getChannelAdminId(chan))?.name;
              const canDelete = isProjectOwner && channels.length > 1;
              return (
                <div key={chan.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => openChannel(chan.id)}
                    className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/70 p-4 cursor-pointer transition-colors hover:border-emerald-500/50 hover:bg-slate-850"
                  >
                    <span className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="term text-sm text-slate-100 truncate">{chan.name}</span>
                      {unread > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block text-xs text-slate-400 line-clamp-2 min-h-[2rem]">
                      {chan.topic || chan.description || 'No description yet'}
                    </span>
                    <span className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>
                        {ctDone}/{ct.length} tasks done
                      </span>
                      {adminName && (
                        <span className="flex items-center gap-1 truncate">
                          <ShieldCheck className="w-3 h-3" /> {adminName}
                        </span>
                      )}
                    </span>
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete #${chan.name} and all its messages? This cannot be undone.`)) deleteChannel(chan.id);
                      }}
                      className="absolute right-2 bottom-2 p-1.5 rounded-md text-slate-600 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-950 cursor-pointer transition-opacity"
                      title={`Delete #${chan.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* New channel modal */}
      {showNewChannel && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up">
            <div className="hud relative bg-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl">
              <button onClick={() => setShowNewChannel(false)} className="absolute top-5 right-5 text-slate-500 hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
              <div className="term text-[10px] uppercase tracking-[0.2em] text-emerald-500">// new channel</div>
              <h3 className="text-base font-bold text-slate-100 mb-4 mt-0.5">Open a channel</h3>
              <form onSubmit={submitChannel} className="space-y-3">
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="frontend"
                  className="term w-full px-3 py-2.5 rounded-md bg-slate-950 border border-slate-750 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="UI work and reviews"
                  className="w-full px-3 py-2.5 rounded-md bg-slate-950 border border-slate-750 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowNewChannel(false)} className="px-3 py-2 rounded-md text-xs text-slate-500 hover:text-slate-100">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};
