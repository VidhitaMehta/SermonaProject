import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Users, Mail, Edit2, Check, X, AlertTriangle, Link2 } from 'lucide-react';
import { getDeadlineState } from '../lib/deadlines';

export const TeamView: React.FC = () => {
  const { teamMembers, currentUser, setCurrentUser, tasks, mode, updateMyProfile, inviteLink, addToast, isProjectOwner, removeMember } =
    useWorkspace();
  const isCloud = mode === 'cloud';

  const [editing, setEditing] = useState(false);
  const [roleInput, setRoleInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const startEdit = () => {
    setRoleInput(currentUser.role || '');
    setSkillsInput((currentUser.skills || []).join(', '));
    setEditing(true);
  };

  const saveEdit = () => {
    updateMyProfile({
      role: roleInput,
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setEditing(false);
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      addToast({ type: 'success', title: 'Invite link copied', message: 'Teammates join after signing in with it.' });
    } catch {
      addToast({ type: 'info', title: 'Invite link', message: inviteLink });
    }
  };

  // Show the current user first
  const ordered = [...teamMembers].sort((a, b) =>
    a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : a.name.localeCompare(b.name)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            <span className="uppercase tracking-wide">Squad Roster &amp; Skills</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {teamMembers.length} Members
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Skills listed here power assignee suggestions for AI-extracted and manual tasks.
          </p>
        </div>
        {isCloud && inviteLink && (
          <button
            onClick={copyInvite}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" /> Copy invite link
          </button>
        )}
      </div>

      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ordered.map((member) => {
            const memberTasks = tasks.filter(
              (t) => t.assigneeId === member.id || (!t.assigneeId && t.assigneeName === member.name)
            );
            const completedCount = memberTasks.filter((t) => t.completed || t.status === 'completed').length;
            const overdueCount = memberTasks.filter((t) => getDeadlineState(t) === 'overdue').length;
            const pct = memberTasks.length > 0 ? Math.round((completedCount / memberTasks.length) * 100) : 0;
            const isCurrentUser = currentUser.id === member.id;
            const openTasks = memberTasks.filter((t) => !(t.completed || t.status === 'completed'));

            return (
              <div
                key={member.id}
                className={`p-5 rounded-2xl border bg-slate-950/80 shadow-md space-y-4 transition-all ${
                  isCurrentUser ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                      />
                      {isCloud && (
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                            member.online || isCurrentUser ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                          title={member.online || isCurrentUser ? 'Online' : 'Offline'}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100 truncate">{member.name}</h3>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-400 font-mono block truncate">{member.role}</span>
                      {member.email && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {member.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {isCurrentUser && !editing && (
                    <button
                      onClick={startEdit}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-[11px] font-medium text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  )}
                  {!isCurrentUser && !isCloud && (
                    <button
                      onClick={() => setCurrentUser(member)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-[11px] font-medium text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Switch to User
                    </button>
                  )}
                  {!isCurrentUser && isCloud && isProjectOwner && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${member.name} from this workspace? They will lose access.`)) {
                          removeMember(member.id);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg border border-rose-500/40 text-[11px] font-medium text-rose-400 hover:bg-rose-950 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Skills (editable for yourself) */}
                {isCurrentUser && editing ? (
                  <div className="space-y-2 p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Role</label>
                      <input
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        placeholder="e.g. Backend Developer"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                        Skills (comma separated)
                      </label>
                      <input
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="e.g. Python, React, Figma, Data Cleaning"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditing(false)}
                        className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(member.skills || []).length > 0 ? (
                      member.skills!.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        {isCurrentUser ? 'Add your skills so tasks can be matched to you.' : 'No skills listed yet.'}
                      </span>
                    )}
                  </div>
                )}

                {/* Workload & progress */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Open</span>
                      <span className="text-base font-bold text-slate-200">{openTasks.length}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Done</span>
                      <span className="text-base font-bold text-emerald-400">{completedCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Overdue</span>
                      <span className={`text-base font-bold ${overdueCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {overdueCount}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" title={`${pct}% of assigned tasks done`}>
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Open responsibilities */}
                {openTasks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Active Responsibilities:
                    </span>
                    <div className="space-y-1">
                      {openTasks.slice(0, 3).map((t) => {
                        const overdue = getDeadlineState(t) === 'overdue';
                        return (
                          <div
                            key={t.id}
                            className={`flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/60 border ${
                              overdue ? 'border-rose-500/40' : 'border-slate-850'
                            }`}
                          >
                            <span className="truncate text-slate-300 flex items-center gap-1.5">
                              {overdue && <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />}
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
                        );
                      })}
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
