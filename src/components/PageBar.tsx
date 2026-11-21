import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ViewTab } from '../types';

const TITLES: Partial<Record<ViewTab, string>> = {
  dashboard: 'Overview',
  tasks: 'Mission Board',
  decisions: 'Decision Log',
  team: 'Squad',
  insights: 'Intel',
  'channel-settings': 'Workspace management',
  channels: 'Channels',
};

/** Thin bar above every page: Back to the home cards, the page name, and (in channels) a channel switcher. */
export const PageBar: React.FC<{ onBack: () => void; onOpenAI?: () => void }> = ({ onBack, onOpenAI }) => {
  const { activeTab, isChannelGuest, channels, activeChannelId, setActiveChannelId, unreadCounts } = useWorkspace();
  const tab: ViewTab = isChannelGuest ? 'channels' : activeTab;

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-950/40 flex-shrink-0 min-w-0">
      {!isChannelGuest && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-300 cursor-pointer flex-shrink-0"
          title="Back to home"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Home</span>
        </button>
      )}

      {tab === 'channels' ? (
        <div className="flex gap-1.5 overflow-x-auto min-w-0 flex-1 [scrollbar-width:none]">
          {channels.map((c) => {
            const unread = unreadCounts[c.id] ?? c.unreadCount ?? 0;
            const active = c.id === activeChannelId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveChannelId(c.id)}
                className={`term flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer ${
                  active
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-600'
                }`}
              >
                #{c.name}
                {!active && unread > 0 && (
                  <span className="min-w-[18px] h-4 px-1 rounded text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <h1 className="text-lg text-slate-100 truncate flex-1" style={{ fontFamily: "Baskerville, 'Palatino Linotype', Georgia, serif" }}>
          {TITLES[tab] || ''}
        </h1>
      )}

      {/* On small screens the AI Review panel opens as a sheet from here */}
      {tab === 'channels' && onOpenAI && (
        <button
          type="button"
          onClick={onOpenAI}
          className="lg:hidden flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 cursor-pointer flex-shrink-0"
        >
          <Sparkles size={14} /> AI
        </button>
      )}
    </div>
  );
};
