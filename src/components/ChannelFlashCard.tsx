import React, { useEffect, useState } from 'react';
import { Crown, MessageSquare, ShieldCheck, CheckCircle2, Circle, Sparkles, ListChecks } from 'lucide-react';
import { useWorkspace, ChannelContributors } from '../context/WorkspaceContext';
import { parseDeadline } from '../lib/deadlines';
import type { Channel } from '../types';

const MAX_APPROVED = 5;
const MAX_AI = 3;

/** Nearest deadline first; tasks without a (readable) deadline go last. */
const byDeadline = <T extends { deadline: string | null }>(a: T, b: T) => {
  const da = parseDeadline(a.deadline)?.getTime() ?? Infinity;
  const db = parseDeadline(b.deadline)?.getTime() ?? Infinity;
  return da - db;
};

export default function ChannelFlashcard({ channel }: { channel: Channel }) {
  const { teamMembers, getChannelAdminId, tasks, channelAnalyses, getChannelContributors } = useWorkspace();

  const adminId = getChannelAdminId(channel);
  const adminName = teamMembers.find((m) => m.id === adminId)?.name ?? 'Workspace owner';
  const description = channel.description || channel.topic || 'No description yet';

  // Top contributor + total messages (works even if this channel was never opened)
  const [stats, setStats] = useState<ChannelContributors | null>(null);
  useEffect(() => {
    let alive = true;
    getChannelContributors(channel.id).then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  // Approved = on the Mission Board (AI-approved or added manually) and linked to this channel
  const approved = tasks.filter((t) => t.channelId === channel.id);
  const pending = approved.filter((t) => !t.completed && t.status !== 'completed').sort(byDeadline);
  const done = approved.filter((t) => t.completed || t.status === 'completed');
  const approvedList = [...pending, ...done];

  // AI-generated = proposed by the analysis, not yet approved
  const aiSuggested = [...(channelAnalyses[channel.id]?.proposedTasks || [])].sort(byDeadline);

  return (
    <div className="w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl text-[11px] text-slate-300 space-y-2.5">
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
          {!stats ? 'Loading…' : stats.top ? `${stats.top.name} (${stats.top.count})` : '—'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-slate-500">
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{stats ? `${stats.total} message${stats.total === 1 ? '' : 's'}` : 'Counting messages…'}</span>
      </div>

      {/* Task checklist */}
      <div className="pt-2 border-t border-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
          Tasks
          <span className="ml-auto font-normal text-slate-500">
            {done.length}/{approved.length} done
          </span>
        </div>

        {approvedList.length === 0 ? (
          <p className="text-slate-500 italic">No approved tasks yet.</p>
        ) : (
          <ul className="space-y-1">
            {approvedList.slice(0, MAX_APPROVED).map((t) => {
              const isDone = t.completed || t.status === 'completed';
              return (
                <li key={t.id} className="flex items-start gap-1.5">
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-px" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-px" />
                  )}
                  <span className={`flex-1 min-w-0 truncate ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {t.title}
                  </span>
                  {!isDone && t.deadline && <span className="text-[10px] text-amber-300/80 flex-shrink-0">{t.deadline}</span>}
                </li>
              );
            })}
            {approvedList.length > MAX_APPROVED && (
              <li className="text-slate-500 pl-5">+{approvedList.length - MAX_APPROVED} more</li>
            )}
          </ul>
        )}

        {aiSuggested.length > 0 && (
          <div className="pt-1.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/80">
              <Sparkles className="w-3 h-3" /> AI-suggested · awaiting approval
            </div>
            <ul className="space-y-1">
              {aiSuggested.slice(0, MAX_AI).map((t) => (
                <li key={t.taskId || t.id} className="flex items-start gap-1.5">
                  <Circle className="w-3.5 h-3.5 text-emerald-500/50 flex-shrink-0 mt-px" strokeDasharray="3 2" />
                  <span className="flex-1 min-w-0 truncate text-slate-400">{t.title}</span>
                  {t.deadline && <span className="text-[10px] text-slate-500 flex-shrink-0">{t.deadline}</span>}
                </li>
              ))}
              {aiSuggested.length > MAX_AI && <li className="text-slate-500 pl-5">+{aiSuggested.length - MAX_AI} more</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}