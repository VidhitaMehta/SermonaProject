import React, { useState } from 'react';
import { Portal } from './Portal';
import { useWorkspace } from '../context/WorkspaceContext';
import { Plus, LayoutGrid, Crosshair, FileCheck2, Radar, Users, RotateCcw, X, UserPlus, Trash2, ChevronRight } from 'lucide-react';
import { ViewTab } from '../types';
import ChannelFlashcard from './ChannelFlashCard';
/** Little 4-bar "signal strength" indicator used for online status. */
const SignalBars: React.FC<{ online: boolean }> = ({ online }) => (
  <span className="flex items-end gap-[2px] h-3" title={online ? 'Online' : 'Offline'}>
    {[4, 7, 10, 12].map((h, i) => (
      <span
        key={h}
        className={`w-[3px] rounded-[1px] ${online ? 'bg-signal' : i === 0 ? 'bg-slate-600' : 'bg-slate-800'}`}
        style={{ height: h }}
      />
    ))}
  </span>
);

/** Second column: workspace header, navigation, channels and people. */
export const Sidebar: React.FC = () => {
  const {
    currentUser,
    teamMembers,
    project,
    channels,
    activeChannelId,
    setActiveChannelId,
    activeTab,
    setActiveTab,
    createChannel,
    resetToDemoData,
    mode,
    inviteLink,
    addToast,
    deleteChannel,
    isProjectOwner,
  } = useWorkspace();
  const isCloud = mode === 'cloud';

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    createChannel(newChannelName.trim(), newChannelTopic.trim());
    setNewChannelName('');
    setNewChannelTopic('');
    setIsChannelModalOpen(false);
  };

  const copyInvite = async () => {
    if (!inviteLink) {
      addToast({ type: 'info', title: 'Demo mode', message: 'Invite links work once Firebase is connected.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      addToast({ type: 'success', title: 'Invite link copied', message: 'Send it to teammates — they join after signing in.' });
    } catch {
      addToast({ type: 'info', title: 'Invite link', message: inviteLink });
    }
  };

  const navItems: { tab: ViewTab; label: string; icon: React.ElementType }[] = [
    { tab: 'dashboard', label: 'Overview', icon: LayoutGrid },
    { tab: 'tasks', label: 'Mission Board', icon: Crosshair },
    { tab: 'decisions', label: 'Decision Log', icon: FileCheck2 },
    { tab: 'insights', label: 'Intel', icon: Radar },
    { tab: 'team', label: 'Squad', icon: Users },
  ];

  const people = [...teamMembers].sort(
    (a, b) =>
      Number(b.online || b.id === currentUser.id) - Number(a.online || a.id === currentUser.id) ||
      a.name.localeCompare(b.name)
  );
  const onlineCount = people.filter((m) => m.online || m.id === currentUser.id).length;

  const sectionTitle = 'term px-3 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500';

  return (
    <aside className="glass rounded-2xl w-60 flex-shrink-0 flex flex-col h-full select-none">
      {/* Workspace header */}
      <div className="hud relative mx-3 mt-3 px-3 pt-3 pb-3 rounded-lg bg-slate-950 border border-slate-800">
        <div className="term text-[9px] uppercase tracking-[0.2em] text-emerald-500">// workspace</div>
        <h2 className="text-sm font-bold text-slate-100 truncate mt-0.5" title={project.name}>
          {project.name}
        </h2>
        {project.tagline && <p className="text-[11px] text-slate-500 truncate">{project.tagline}</p>}
        <button
          onClick={copyInvite}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 term text-[10px] uppercase tracking-wider text-slate-300 hover:border-emerald-500 hover:text-emerald-500 transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Recruit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {/* Navigation */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all cursor-pointer ${
                  isActive ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-emerald-500" />}
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Channels */}
        <div>
          <div className="flex items-center justify-between pr-2">
            <span className={sectionTitle}>Channels</span>
            <button
              onClick={() => setIsChannelModalOpen(true)}
              className="p-1 -mt-1.5 rounded text-slate-500 hover:text-emerald-500 hover:bg-slate-800 transition-colors cursor-pointer"
              title="New channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0.5 mt-1">
            {channels.map((chan) => {
              const isSelected = activeChannelId === chan.id && activeTab === 'channels';
              const canDelete = isProjectOwner && channels.length > 1;
              return (
                <div key={chan.id} className="relative group/chan">
               <div className="hidden group-hover/chan:block absolute left-full top-0 z-50 pl-2">
               <ChannelFlashcard channel={chan} />
               </div>
                  <button
                    onClick={() => {
                      setActiveChannelId(chan.id);
                      setActiveTab('channels');
                    }}
                    className={`term w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[12px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850 border border-transparent'
                    } ${canDelete ? 'pr-8' : ''}`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isSelected ? 'text-emerald-500' : 'text-slate-600'}`} />
                      <span className="truncate">{chan.name}</span>
                      {isSelected && <span className="w-1.5 h-3 bg-emerald-500 animate-blink" />}
                    </span>
                    {!isSelected && chan.unreadCount && chan.unreadCount > 0 ? (
                      <span className="min-w-[20px] h-4 px-1 rounded-sm text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center justify-center group-hover/chan:hidden">
                        {chan.unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete #${chan.name} and all its messages? This cannot be undone.`)) {
                          deleteChannel(chan.id);
                        }
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/chan:opacity-100 transition-opacity cursor-pointer text-slate-500 hover:text-rose-400 hover:bg-rose-950"
                      title={`Delete #${chan.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* People */}
        <div>
          <div className="flex items-center justify-between pr-3">
            <span className={sectionTitle}>Squad</span>
            <span className="term text-[10px] text-signal -mt-1.5">
              {onlineCount}/{people.length} online
            </span>
          </div>
          <div className="space-y-0.5 mt-1">
            {people.map((m) => {
              const online = Boolean(m.online || m.id === currentUser.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveTab('team')}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-slate-850 text-left cursor-pointer"
                >
                  <img
                    src={m.avatar}
                    alt=""
                    className={`w-8 h-8 rounded-md object-cover bg-slate-800 flex-shrink-0 ${online ? 'ring-1 ring-signal/60' : 'opacity-60 grayscale'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-slate-200 truncate">
                      {m.name}
                      {m.id === currentUser.id && <span className="text-slate-500 font-normal"> (you)</span>}
                    </span>
                    <span className="term block text-[10px] text-slate-500 truncate">{m.role}</span>
                  </span>
                  <SignalBars online={online} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!isCloud && (
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={resetToDemoData}
            className="term w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-slate-500 hover:text-slate-100 hover:bg-slate-850 text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset demo data
          </button>
        </div>
      )}

      {/* New Channel Modal */}
      {isChannelModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up">
            <div className="hud relative bg-slate-900 rounded-xl max-w-sm w-full p-6 shadow-2xl">
              <button onClick={() => setIsChannelModalOpen(false)} className="absolute top-5 right-5 text-slate-500 hover:text-slate-100">
                <X className="w-4 h-4" />
              </button>
              <div className="term text-[10px] uppercase tracking-[0.2em] text-emerald-500">// new channel</div>
              <h3 className="text-base font-bold text-slate-100 mb-4 mt-0.5">Open a channel</h3>
              <form onSubmit={handleCreateChannel} className="space-y-3">
                <div>
                  <label className="term text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Channel name</label>
                  <div className="relative">
                    <span className="term absolute left-3 top-2.5 text-emerald-500 text-sm">&gt;</span>
                    <input
                      type="text"
                      required
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="frontend"
                      className="term w-full pl-7 pr-3 py-2.5 rounded-md bg-slate-950 border border-slate-750 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="term text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Topic / purpose</label>
                  <input
                    type="text"
                    value={newChannelTopic}
                    onChange={(e) => setNewChannelTopic(e.target.value)}
                    placeholder="UI work and reviews"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-950 border border-slate-750 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsChannelModalOpen(false)} className="px-3 py-2 rounded-md text-xs text-slate-500 hover:text-slate-100">
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
    </aside>
  );
};
