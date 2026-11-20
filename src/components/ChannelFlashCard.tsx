import { Crown, MessageSquare, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import type { Channel } from '../types';

export default function ChannelFlashcard({ channel }: { channel: Channel }) {
  const { messages, teamMembers, getChannelAdminId } = useWorkspace();

  const adminId = getChannelAdminId(channel);
  const adminName = teamMembers.find((m) => m.id === adminId)?.name ?? 'Workspace owner';

  const channelMessages = messages[channel.id] || [];
  const counts: Record<string, { name: string; count: number }> = {};
  for (const m of channelMessages) {
    counts[m.senderId] = { name: m.senderName, count: (counts[m.senderId]?.count || 0) + 1 };
  }
  const top = Object.values(counts).sort((a, b) => b.count - a.count)[0];

  const description = channel.description || channel.topic || 'No description yet';

  return (
    <div className="w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl text-[11px] text-slate-300 space-y-2.5">
      <div>
        <div className="font-semibold text-slate-100 text-xs">#{channel.name}</div>
        <p className="text-slate-400 mt-0.5 leading-snug">{description}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <span className="text-slate-500">Admin</span>
        <span className="ml-auto truncate text-slate-200">{adminName}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-slate-500">Top contributor</span>
        <span className="ml-auto truncate text-slate-200">
          {top ? `${top.name} (${top.count})` : '—'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-slate-500">
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{channelMessages.length} messages loaded</span>
      </div>
    </div>
  );
}