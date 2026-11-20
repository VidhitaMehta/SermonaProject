import React, { useEffect, useId, useState } from 'react';

interface Props {
  name: string;
  label: string;
  hint?: string;
  onSave: (name: string) => Promise<void>;
}

export const RenameForm: React.FC<Props> = ({ name, label, hint, onSave }) => {
  const id = useId();
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(name); }, [name]);

  return (
    <form className="space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      if (saving) return;
      setSaving(true);
      setError('');
      setSaved(false);
      try {
        await onSave(draft);
        setSaved(true);
      } catch (failure) {
        const code = (failure as { code?: string }).code;
        setError(code === 'permission-denied'
          ? 'Firebase denied this change. Sign in as the workspace owner and check the published rules.'
          : failure instanceof Error ? failure.message : 'Could not save the name. Please retry.');
      } finally {
        setSaving(false);
      }
    }}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-200">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          value={draft}
          maxLength={100}
          required
          disabled={saving}
          aria-describedby={`${id}-hint ${id}-status`}
          aria-invalid={Boolean(error)}
          onChange={(event) => { setDraft(event.target.value); setError(''); setSaved(false); }}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
        />
        <button type="submit" disabled={saving || !draft.trim() || draft.trim() === name} className="rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-40">{saving ? 'Saving…' : 'Save name'}</button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-slate-400">{hint}</p>
      <p id={`${id}-status`} role="status" className={`text-xs ${error ? 'text-rose-400' : 'text-emerald-400'}`}>{error || (saved ? 'Name saved.' : '')}</p>
    </form>
  );
};
