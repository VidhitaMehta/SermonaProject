import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Plus, LogOut, Check, UserCog } from 'lucide-react';
import { WorkspaceModal } from './WorkspaceModal';
import { Insignia } from './Insignia';

const TONES = ['amber', 'cyan', 'steel', 'olive', 'red', 'violet'] as const;

/** Each workspace gets a stable badge colour based on its name. */
export const workspaceTone = (name: string) =>
  TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

export const workspaceInitials = (name: string) =>
  name
    .split(/[\s:_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || 'W';

/**
 * Left rail: one insignia per workspace the user belongs to (like Discord servers),
 * a "+" to create/join, and the user's avatar at the bottom.
 */
export const WorkspaceRail: React.FC = () => {
  const { mode, project, myProjects, switchProject, currentUser, teamMembers, setCurrentUser, signOutUser, setActiveTab } =
    useWorkspace();
  const isCloud = mode === 'cloud';
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const workspaces = isCloud && myProjects.length > 0 ? myProjects : [{ id: project.id, name: project.name }];

  return (
    <nav className="glass-dark rounded-2xl w-[76px] flex-shrink-0 h-full flex flex-col items-center py-4 gap-1 select-none">
      {/* Brand */}
      <div className="mb-1 hover:animate-wiggle" title="Sermona">
        <Insignia size={46} active />
      </div>
      <span className="term text-[8px] text-slate-600 mb-3">SERMONA</span>

      {/* Workspaces */}
      <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-3 pt-2 border-t border-slate-800">
        {workspaces.map((w) => {
          const active = w.id === project.id;
          return (
            <button
              key={w.id}
              onClick={() => switchProject(w.id)}
              className="relative w-full flex flex-col items-center gap-1 group cursor-pointer"
              title={w.name}
            >
              <span
                className={`absolute left-0 top-3 w-[3px] bg-emerald-500 transition-all ${
                  active ? 'h-7 opacity-100' : 'h-2 opacity-0 group-hover:opacity-60'
                }`}
              />
              <span className={`transition-transform ${active ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`}>
                <Insignia size={44} label={workspaceInitials(w.name)} tone={workspaceTone(w.name)} active={active} />
              </span>
              <span className={`term text-[9px] uppercase leading-tight max-w-[66px] truncate ${active ? 'text-emerald-500' : 'text-slate-500'}`}>
                {w.name}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setModalOpen(true)}
          className="w-11 h-11 rounded-lg border-2 border-dashed border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-500 hover:rotate-90 flex items-center justify-center transition-all cursor-pointer mt-1"
          title="Create or join a workspace"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Me */}
      <div className="relative pt-3 border-t border-slate-800 w-full flex justify-center">
        <button onClick={() => setMenuOpen(!menuOpen)} className="relative cursor-pointer" title={currentUser.name}>
          <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-600 bg-slate-800" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-signal border-2 border-slate-950" />
        </button>

        {menuOpen && (
          <div className="absolute bottom-0 left-full ml-3 w-64 p-2 rounded-xl bg-slate-900 border border-slate-750 shadow-2xl z-40 animate-pop-in">
            <div className="px-2 py-1.5">
              <div className="text-sm font-semibold text-slate-100 truncate">{currentUser.name}</div>
              <div className="term text-[10px] text-slate-500 truncate">{currentUser.email || currentUser.role}</div>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                setActiveTab('team');
              }}
              className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" /> Edit my role & skills
            </button>

            {isCloud ? (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOutUser();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            ) : (
              <>
                <div className="term px-2 pt-2 text-[9px] uppercase tracking-wider text-slate-500">// switch operator (demo)</div>
                {teamMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCurrentUser(m);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <img src={m.avatar} alt="" className="w-6 h-6 rounded-md object-cover bg-slate-800" />
                      <span className="truncate">{m.name}</span>
                    </span>
                    {m.id === currentUser.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <WorkspaceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </nav>
  );
};
