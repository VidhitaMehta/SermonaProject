import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { CHANNEL_THEMES, getChannelTheme } from '../data/channelThemes';
import type { ChannelTheme } from '../types';

export const ChannelThemePicker: React.FC = () => {
  const { channels, activeChannelId, setChannelTheme, mode } = useWorkspace();
  const selected = getChannelTheme(channels.find((channel) => channel.id === activeChannelId)?.theme);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const chooseTheme = async (theme: ChannelTheme | null) => {
    setSaving(true);
    setStatus('');
    try {
      const saved = await setChannelTheme(activeChannelId, theme);
      setStatus(saved ? `${getChannelTheme(theme)?.name ?? 'Default'} theme saved for this channel.` : 'Theme could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="channel-theme-picker" aria-label="Channel appearance">
      <div className="theme-options">
          <div className="theme-picker-heading">
            <div><strong>Channel theme</strong><p>Choose a theme for #{channels.find((channel) => channel.id === activeChannelId)?.name}. {mode === 'cloud' ? 'Shared with everyone in this channel.' : 'Remembered on this device.'}</p></div>
            {saving && <Loader2 size={13} className="animate-spin" aria-label="Saving theme" />}
            <button type="button" className="theme-reset" disabled={saving || !selected} onClick={() => chooseTheme(null)}>Reset</button>
          </div>
          <div className="theme-card-grid" role="group" aria-label="Choose a channel theme">
            {CHANNEL_THEMES.map((theme) => (
              <button type="button" key={theme.id} className={`theme-card theme-preview-${theme.id}`} aria-pressed={selected?.id === theme.id} disabled={saving} onClick={() => chooseTheme(theme.id)}>
                <span className="theme-preview" aria-hidden="true"><span className="theme-emblem">{theme.symbol}</span><span className="theme-preview-lines"><i /><i /><i /></span><span className="theme-swatches">{theme.colors.map((color) => <i key={color} style={{ background: color }} />)}</span></span>
                <span className="theme-card-label">{theme.name}{selected?.id === theme.id && <Check size={14} aria-label="Selected" />}</span>
                <span className="theme-card-description">{theme.description}</span>
              </button>
            ))}
          </div>
      </div>
      <p className="theme-save-status" role="status">{status}</p>
    </section>
  );
};
