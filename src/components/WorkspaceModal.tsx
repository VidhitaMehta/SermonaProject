import React, { useState } from 'react';
import { Portal } from './Portal';
import { useWorkspace } from '../context/WorkspaceContext';
import { X, FolderPlus, LogIn } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'create' | 'join';
}

/** "+" in the workspace rail: create a new workspace or join one with an invite link. */
export const WorkspaceModal: React.FC<Props> = ({ isOpen, onClose, initialTab = 'create' }) => {
  const { createNewProject, joinProject, mode } = useWorkspace();
  const [tab, setTab] = useState<'create' | 'join'>(initialTab);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [invite, setInvite] = useState('');
  const [joining, setJoining] = useState(false);

  React.useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const reset = () => {
    setName('');
    setTagline('');
    setDescription('');
    setDeadline('');
    setInvite('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createNewProject(
      name.trim(),
      tagline.trim(),
      description.trim(),
      deadline ? new Date(`${deadline}T23:59:00`).toISOString() : null
    );
    reset();
    onClose();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite.trim()) return;
    setJoining(true);
    const ok = await joinProject(invite);
    setJoining(false);
    if (ok) {
      reset();
      onClose();
    }
  };

  const input =
    'w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-750 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15';

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1640]/30 backdrop-blur-md animate-fade-up">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden animate-pop-in">
        <div className="hazard h-1.5" />
        <div className="p-6">
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-500 hover:text-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-slate-100">Add a workspace</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Workspaces are like Discord servers or WhatsApp groups — each has its own channels and members.
          </p>

          <div className="mt-4 grid grid-cols-2 p-1 rounded-xl bg-slate-950 text-xs font-semibold">
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors cursor-pointer ${
                  tab === t ? 'bg-slate-800 text-emerald-500 shadow-sm' : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                {t === 'create' ? <FolderPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                {t === 'create' ? 'Create new' : 'Join with invite'}
              </button>
            ))}
          </div>

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Workspace name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Capstone Team 7" className={input} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tagline</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Smart attendance system" className={input} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Goals, deliverables…" className={`${input} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Deadline (optional)</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={input} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer">
                Create workspace
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Invite link</label>
                <input
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="http://…/?project=proj_…"
                  className={input}
                  disabled={mode !== 'cloud'}
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {mode === 'cloud'
                    ? 'Ask a member to click “Invite” in their workspace and send you the link.'
                    : 'Joining needs Firebase — it is not available in local demo mode.'}
                </p>
              </div>
              <button
                type="submit"
                disabled={joining || mode !== 'cloud'}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
              >
                {joining ? 'Joining…' : 'Join workspace'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
};
