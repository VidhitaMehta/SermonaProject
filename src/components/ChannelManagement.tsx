import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Hash, ShieldCheck, UserPlus } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { getChannelTheme } from '../data/channelThemes';
import { ChannelThemePicker } from './ChannelThemePicker';
import type { Channel } from '../types';

/** Each channel gets its own mounted panel so pending invites stay with that channel. */
const ChannelSettingsPanel: React.FC<{ channel: Channel }> = ({ channel }) => {
  const {
    currentUser, project, teamMembers, mode, isProjectOwner,
    getChannelAdminId, setChannelAdmin, createRecruitInvite, setActiveTab, addToast,
  } = useWorkspace();
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const adminId = getChannelAdminId(channel);
  const admin = teamMembers.find((member) => member.id === adminId);
  const isChannelAdmin = adminId === currentUser.id;
  const candidates = teamMembers.filter((member) => mode === 'local' || project.members.includes(member.id) || member.id === project.ownerId);
  const recruits = teamMembers.filter((member) => channel.members?.includes(member.id) && !project.members.includes(member.id));
  const theme = getChannelTheme(channel.theme);

  return (
    <div data-channel-theme={theme?.id} className="management-detail rounded-xl border border-slate-800 bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 p-6">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-emerald-400"><Hash size={13} /> Channel settings</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">#{channel.name}</h2>
          <button onClick={() => setActiveTab('channels')} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-emerald-500">Open chat →</button>
        </div>
        <p className="mt-2 text-sm text-slate-400">{channel.topic || 'Manage the people and appearance of this channel.'}</p>
      </header>

      <section className="space-y-4 border-b border-slate-800 p-6" aria-labelledby="channel-leader-title">
        <div>
          <h3 id="channel-leader-title" className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16} className="text-emerald-400" /> Channel admin</h3>
          <p className="mt-1 text-xs text-slate-400">{admin?.name || 'Workspace owner'} manages this channel. Each channel has one admin.</p>
        </div>
        {isProjectOwner && (
          <div>
            <p className="mb-3 text-xs text-slate-400">Choose a team member to transfer the role.</p>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Assign channel admin">
              {candidates.map((member) => (
                <button
                  key={member.id}
                  aria-pressed={member.id === adminId}
                  disabled={savingAdmin || member.id === adminId}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left text-xs transition-colors disabled:cursor-default ${member.id === adminId ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 hover:border-emerald-500'} ${savingAdmin ? 'opacity-60' : ''}`}
                  onClick={async () => {
                    setSavingAdmin(true);
                    try {
                      await setChannelAdmin(channel.id, member.id);
                    } finally {
                      setSavingAdmin(false);
                    }
                  }}
                >
                  <img src={member.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{member.name}</span><span className="text-[10px] text-slate-400">{member.id === adminId ? 'Current admin' : 'Make channel admin'}</span></span>
                  {member.id === adminId && <Check size={15} className="text-emerald-400" />}
                </button>
              ))}
            </div>
            {savingAdmin && <p role="status" className="mt-2 text-xs text-slate-400">Saving admin…</p>}
          </div>
        )}
      </section>

      <section className="space-y-3 border-b border-slate-800 p-6" aria-labelledby="channel-recruit-title">
        <h3 id="channel-recruit-title" className="flex items-center gap-2 text-sm font-bold"><UserPlus size={16} className="text-emerald-400" /> Channel recruitment</h3>
        <p className="text-xs text-slate-400">Recruit people to #{channel.name}. Links expire after 7 days.</p>
        {isChannelAdmin ? (
          <>
            <button disabled={creatingInvite} className="rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50" onClick={async () => {
              setCreatingInvite(true);
              setInvite('');
              setError('');
              try {
                const link = await createRecruitInvite(channel.id);
                if (link) setInvite(link);
                else setError('Invite could not be generated. Please try again.');
              } catch (failure) {
                setError(failure instanceof Error ? failure.message : 'Could not create invite.');
              } finally {
                setCreatingInvite(false);
              }
            }}>{creatingInvite ? 'Generating invite…' : 'Recruit to channel'}</button>
            {invite && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 flex-1 text-xs text-slate-400">Invite link
                  <input readOnly value={invite} onFocus={(event) => event.target.select()} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100" />
                </label>
                <button className="flex items-center gap-2 rounded-lg border border-slate-700 p-3 text-xs" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(invite);
                    addToast({ type: 'success', title: 'Invite copied', message: 'Share this channel invite with your teammate.' });
                  } catch {
                    setError('Select the link and press Ctrl+C to copy it.');
                  }
                }}><Copy size={13} /> Copy link</button>
              </div>
            )}
            {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
          </>
        ) : <p className="text-xs text-slate-400">Only {admin?.name || 'the channel admin'} can create this channel’s invites.</p>}
        <div className="pt-2">
          <h4 className="mb-2 text-xs font-semibold">Channel recruits · {recruits.length}</h4>
          {recruits.length === 0 ? <p className="text-xs text-slate-500">No channel-only recruits yet. Workspace members also have access.</p> : (
            <ul className="flex flex-wrap gap-2">{recruits.map((member) => <li key={member.id} className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs"><img src={member.avatar} alt="" className="h-6 w-6 rounded-full" />{member.name}</li>)}</ul>
          )}
        </div>
      </section>

      {isChannelAdmin ? <ChannelThemePicker key={channel.id} /> : (
        <section className="space-y-1 p-6"><h3 className="text-sm font-bold">Channel theme</h3><p className="text-xs text-slate-400">{theme?.name || 'Sermona default'} · Only the channel admin can change the theme.</p></section>
      )}
    </div>
  );
};

export const ChannelManagement: React.FC = () => {
  const { channels, activeChannelId, setActiveChannelId, setActiveTab, isProjectOwner, getChannelAdminId, currentUser } = useWorkspace();
  const manageable = channels.filter((channel) => isProjectOwner || getChannelAdminId(channel) === currentUser.id);
  const selected = manageable.find((channel) => channel.id === activeChannelId) || manageable[0];
  useEffect(() => {
    if (selected && selected.id !== activeChannelId) setActiveChannelId(selected.id);
  }, [selected?.id, activeChannelId, setActiveChannelId]);

  return (
    <div className="h-full min-w-0 flex-1 overflow-y-auto p-5 lg:p-8">
      <header className="mb-7">
        <button onClick={() => setActiveTab('channels')} className="mb-4 flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400"><ArrowLeft size={14} /> Back to chats</button>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-emerald-400">Team leader workspace</p>
        <h1 className="text-3xl font-bold tracking-tight">Channel management</h1>
        <p className="mt-2 text-sm text-slate-400">Choose a channel to manage its admin, recruits, invites and appearance.</p>
      </header>
      {selected ? (
        <div className="management-layout grid items-start gap-5">
          <nav aria-label="Choose channel settings" className="grid gap-2">
            {manageable.map((channel) => (
              <button key={channel.id} aria-current={selected.id === channel.id ? 'page' : undefined} onClick={() => setActiveChannelId(channel.id)} className={`rounded-xl border p-4 text-left ${selected.id === channel.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}`}>
                <span className="block truncate text-sm font-semibold">#{channel.name}</span>
                <span className="mt-1 block text-[10px] text-slate-400">{channels.length > 0 && getChannelAdminId(channel) === currentUser.id ? 'You are the admin' : 'Manage channel'}</span>
              </button>
            ))}
          </nav>
          {selected.id === activeChannelId && <ChannelSettingsPanel key={selected.id} channel={selected} />}
        </div>
      ) : <p className="rounded-xl border border-slate-800 p-6 text-sm text-slate-400">This page is available to workspace owners and channel admins. No channels are available to manage.</p>}
    </div>
  );
};
