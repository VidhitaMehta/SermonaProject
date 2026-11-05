import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { rankMembersForTask } from '../lib/skillMatch';
import { User } from '../types';
import { Wand2 } from 'lucide-react';

interface Props {
  work: { title?: string; description?: string; recommendedSkills?: string[]; tags?: string[] };
  currentAssigneeId?: string | null;
  onPick: (member: User) => void;
  max?: number;
  compact?: boolean;
}

/** "Best fit" chips: team members whose skills match the work, least-loaded first. */
export const AssigneeSuggestions: React.FC<Props> = ({ work, currentAssigneeId, onPick, max = 3, compact }) => {
  const { teamMembers, tasks } = useWorkspace();
  const matches = rankMembersForTask(work, teamMembers, tasks).slice(0, max);

  if (matches.length === 0) return null;

  return (
    <div className={compact ? 'mt-2' : 'mt-1.5'}>
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        <Wand2 className="w-2.5 h-2.5 text-emerald-400" />
        Best fit by skills
      </div>
      <div className="flex flex-wrap gap-1">
        {matches.map(({ member, matchedSkills, openTasks }) => {
          const selected = member.id === currentAssigneeId;
          return (
            <button
              type="button"
              key={member.id}
              onClick={() => onPick(member)}
              title={`Matches: ${matchedSkills.join(', ')} · ${openTasks} open task(s)`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] transition-colors cursor-pointer ${
                selected
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200'
              }`}
            >
              <img src={member.avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
              <span className="font-semibold">{member.name.split(' ')[0]}</span>
              <span className="text-slate-500">
                {matchedSkills.slice(0, 2).join(', ')}
                {matchedSkills.length > 2 ? ` +${matchedSkills.length - 2}` : ''}
              </span>
              <span className="text-slate-600">· {openTasks} open</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
