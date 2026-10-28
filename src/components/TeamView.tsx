import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Users, Mail, CheckCircle2, Clock, Sparkles, UserCheck } from 'lucide-react';

export const TeamView: React.FC = () => {
  const { teamMembers, currentUser, setCurrentUser, tasks } = useWorkspace();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
          <Users className="w-5 h-5 text-emerald-400" />
          <span>Team Roster & Responsibilities</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {teamMembers.length} Members
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Hackathon capstone project team members, specialized roles, and real-time workload distribution.
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMembers.map((member) => {
            const memberTasks = tasks.filter(
              (t) => t.assigneeId === member.id || t.assigneeName === member.name
            );
            const completedCount = memberTasks.filter((t) => t.completed).length;
            const isCurrentUser = currentUser.id === member.id;

            return (
              <div
                key={member.id}
                className={`p-5 rounded-2xl border bg-slate-950/80 shadow-md space-y-4 transition-all ${
                  isCurrentUser ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100">{member.name}</h3>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-400 font-mono block">{member.role}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </span>
                    </div>
                  </div>

                  {!isCurrentUser && (
                    <button
                      onClick={() => setCurrentUser(member)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-[11px] font-medium text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Switch to User
                    </button>
                  )}
                </div>

                {/* Workload Stats */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Assigned Tasks
                    </span>
                    <span className="text-base font-bold text-slate-200">{memberTasks.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Completed
                    </span>
                    <span className="text-base font-bold text-emerald-400">{completedCount}</span>
                  </div>
                </div>

                {/* Recent Assigned Tasks Preview */}
                {memberTasks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Active Responsibilities:
                    </span>
                    <div className="space-y-1">
                      {memberTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-850"
                        >
                          <span className={`truncate text-slate-300 ${t.completed ? 'line-through text-slate-500' : ''}`}>
                            {t.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ml-2 flex-shrink-0 ${
                              t.priority === 'urgent'
                                ? 'bg-rose-500/20 text-rose-300'
                                : t.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
