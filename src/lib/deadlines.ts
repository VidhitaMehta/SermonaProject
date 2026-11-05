import { Task } from '../types';

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Deadlines come from people and from the AI as free text
 * ("Thursday, Oct 29 at 3:00 PM", "2026-11-15", "Nov 2"), so we try a few
 * formats. Returns null when the text can't be turned into a real date
 * (e.g. "next sprint") — those tasks are simply never flagged as overdue.
 */
export function parseDeadline(text: string | null | undefined, now: Date = new Date()): Date | null {
  if (!text) return null;
  const raw = text.trim();
  if (!raw) return null;

  // ISO dates and anything the JS engine already understands with a year in it
  if (/\d{4}/.test(raw)) {
    const direct = new Date(raw);
    if (!isNaN(direct.getTime())) return direct;
  }

  // "Oct 29", "October 29th, 2026", "Thursday, Oct 29 at 3:00 PM", "Oct 29 3pm"
  const m = raw.match(
    /([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?(?:,?\s*(?:at|@|by)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i
  );
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      const day = parseInt(m[2], 10);
      const year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
      let hour = 23;
      let minute = 59;
      if (m[4]) {
        hour = parseInt(m[4], 10);
        minute = m[5] ? parseInt(m[5], 10) : 0;
        const ampm = m[6]?.toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
      }
      const d = new Date(year, month, day, hour, minute);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export type DeadlineState = 'overdue' | 'due_soon' | 'on_track' | 'none' | 'done';

const DUE_SOON_MS = 48 * 60 * 60 * 1000;

export function getDeadlineState(task: Task, now: Date = new Date()): DeadlineState {
  if (task.completed || task.status === 'completed') return 'done';
  const due = parseDeadline(task.deadline, now);
  if (!due) return 'none';
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return 'overdue';
  if (diff <= DUE_SOON_MS) return 'due_soon';
  return 'on_track';
}

export function formatRelative(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.round(abs / (60 * 60 * 1000));
  const days = Math.round(abs / (24 * 60 * 60 * 1000));
  const unit = hours < 48 ? `${Math.max(hours, 1)}h` : `${days}d`;
  return diff < 0 ? `${unit} ago` : `in ${unit}`;
}
