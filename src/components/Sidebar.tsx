import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Sparkles,
  Hash,
  Plus,
  Home,
  CheckSquare,
  FileCheck2,
  BarChart3,
  Users,
  ChevronDown,
  RotateCcw,
  Layers,
  FolderGit2,
  Check,
  X,
  Radio,
  Cpu,
} from 'lucide-react';
import { ViewTab } from '../types';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    teamMembers,
    project,
    channels,
    activeChannelId,
    setActiveChannelId,
    activeTab,
    setActiveTab,
    createChannel,
    createNewProject,
    resetToDemoData,
    firebaseStatus,
  } = useWorkspace();

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjTagline, setNewProjTagline] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    createChannel(newChannelName.trim(), newChannelTopic.trim());
    setNewChannelName('');
    setNewChannelTopic('');
    setIsChannelModalOpen(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createNewProject(newProjName.trim(), newProjTagline.trim(), newProjDesc.trim());
    setNewProjName('');
    setNewProjTagline('');
    setNewProjDesc('');
    setIsProjectModalOpen(false);
  };

  const navItems: { tab: ViewTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { tab: 'dashboard', label: 'Home & Metrics', icon: Home },
    { tab: 'channels', label: 'Channels', icon: Hash },
    { tab: 'tasks', label: 'Tasks Board', icon: CheckSquare },
    { tab: 'decisions', label: 'Decisions Log', icon: FileCheck2 },
    { tab: 'insights', label: 'AI Insights', icon: BarChart3 },
    { tab: 'team', label: 'Team & Roster', icon: Users },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950/95 border-r border-slate-800/80 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-sm">
            C
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 tracking-tight text-base font-['Plus_Jakarta_Sans']">
                CollabAI
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Talk → Organize → Execute</p>
          </div>
        </div>
      </div>

      {/* Workspace Selector Dropdown */}
      <div className="p-3 border-b border-slate-800/70">
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 text-left transition-colors group cursor-pointer"
        >
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Workspace
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate block group-hover:text-white">
              {project.name}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 flex-shrink-0" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Core Nav */}
        <div className="space-y-0.5">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Channels Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pt-2 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Channels
            </span>
            <button
              onClick={() => setIsChannelModalOpen(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Add new channel"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {channels.map((chan) => {
              const isSelected = activeChannelId === chan.id && activeTab === 'channels';
              return (
                <button
                  key={chan.id}
                  onClick={() => {
                    setActiveChannelId(chan.id);
                    setActiveTab('channels');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                    <span className="truncate">{chan.name}</span>
                  </div>
                  {chan.unreadCount && chan.unreadCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {chan.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hackathon Demo Quick Reset */}
        <div className="pt-2 px-1">
          <button
            onClick={resetToDemoData}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
            title="Reload ML Capstone Sample Data"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* User Profile Bar & User Switcher */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 relative">
        <button
          onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/80 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-emerald-400 truncate font-mono">
                {currentUser.role}
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
        </button>

        {/* User Switcher Dropdown */}
        {isUserSwitcherOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 p-2 rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl z-30 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Switch Active User</span>
              <span className="text-[9px] text-slate-400 font-normal">Demo</span>
            </div>
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  setCurrentUser(member);
                  setIsUserSwitcherOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  currentUser.id === member.id
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                  <div className="text-left truncate">
                    <div className="font-medium truncate">{member.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{member.role}</div>
                  </div>
                </div>
                {currentUser.id === member.id && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setIsChannelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-emerald-400" />
              Create Channel
            </h3>
            <form onSubmit={handleCreateChannel} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Channel Name
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-xs">#</span>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. hyperparameter-tuning"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Topic / Purpose
                </label>
                <input
                  type="text"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="e.g. Optuna search bounds & logs"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsProjectModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <FolderGit2 className="w-5 h-5 text-emerald-400" />
              New Project Workspace
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Autonomous Agent Evaluation"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={newProjTagline}
                  onChange={(e) => setNewProjTagline(e.target.value)}
                  placeholder="e.g. Multi-agent benchmark suite"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Goals, deliverables, hackathon track..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
