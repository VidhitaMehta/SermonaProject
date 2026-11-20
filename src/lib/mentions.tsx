import React from 'react';
import { User } from '../types';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ids of members tagged as "@Full Name" in the text. */
export const findMentions = (text: string, members: User[]): string[] =>
  members.filter((m) => m.name && text.includes(`@${m.name}`)).map((m) => m.id);

/** If the caret sits right after "@something", return what was typed after the @ and where the @ is. */
export const mentionAtCaret = (text: string, caret: number): { query: string; start: number } | null => {
  const match = text.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,30})$/);
  return match ? { query: match[1], start: caret - match[1].length - 1 } : null;
};

/** Render message text with @mentions highlighted (yours in amber, others in emerald). */
export const renderWithMentions = (text: string, members: User[], myId: string): React.ReactNode => {
  const names = members
    .map((m) => m.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length); // longest first so "Kashish Singla" beats "Kashish"
  if (names.length === 0 || !text.includes('@')) return text;
  const re = new RegExp(`@(${names.map(escapeRe).join('|')})`, 'g');
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const member = members.find((m) => m.name === match[1]);
    const isMe = member?.id === myId;
    parts.push(
      <span
        key={`${index}_${match[1]}`}
        className={`px-1 rounded font-semibold ${isMe ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}
      >
        @{match[1]}
      </span>
    );
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};
