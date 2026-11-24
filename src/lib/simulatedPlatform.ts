/**
 * Simulated platform activity, computed entirely in the browser (no Firebase, no server).
 *
 * Everything is deterministic: it is derived from the clock and fixed seeds, so every visitor
 * sees the same people, teams, sessions and numbers at the same moment, and the history is stable.
 * People "join" gradually between LAUNCH and GROWTH_END, so the platform keeps growing over time.
 */

// ---------- deterministic hashing ----------
const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296; // 0..1
};
const pickBy = <T,>(list: T[], key: string): T => list[Math.floor(hashStr(key) * list.length)];

// ---------- the simulated world ----------
const FIRST = ['Aarav','Ishita','Rohan','Meher','Kabir','Tanya','Arjun','Diya','Vihaan','Ananya','Aditya','Saanvi','Reyansh','Myra','Krish','Aadhya','Vivaan','Kiara','Ayaan','Navya','Dhruv','Riya','Arnav','Sara','Yash','Pari','Kunal','Nisha','Manav','Simran','Harsh','Jasleen','Ritvik','Gauri','Pranav','Avni','Siddharth','Tara','Rudra','Mahi','Nikhil','Isha','Parth','Anvi','Laksh','Sanya','Om','Zoya','Kartik','Trisha','Dev','Aisha','Shaurya','Inaaya','Varun','Prisha','Neel','Khushi','Agastya','Sneha'];
const LAST = ['Sharma','Verma','Gupta','Singh','Kaur','Malhotra','Bansal','Arora','Sethi','Mehta','Kapoor','Chopra','Jain','Agarwal','Bhatia','Khanna','Gill','Sandhu','Grewal','Saini','Garg','Mittal','Goyal','Rana','Thakur','Nair','Iyer','Reddy','Das','Mishra'];
const ROLES = ['Frontend Developer','Backend Developer','ML Engineer','Product Designer','QA & DevOps','Project Coordinator','Full-stack Developer','Data Analyst'];
const CITIES = ['Patiala','Chandigarh','Delhi','Ludhiana','Mohali','Jaipur','Pune','Bengaluru','Mumbai','Noida'];
const TEAM_A = ['Campus','Smart','Green','Health','Study','Quick','Open','Bright','Safe','Fin','Agri','Eco','Code','Civic','Food','Travel','Skill','Mind','Hire','Event'];
const TEAM_B = ['Connect','Track','Sense','Hub','Pulse','Mate','Flow','Lens','Bridge','Nest','Desk','Loop','Grid','Path','Board','Wave','Spark','Kit','Link','Map'];

// Growth window: 0 members at LAUNCH, ~TARGET_PEOPLE by GROWTH_END, joining in irregular daytime bursts
const LAUNCH = Date.parse('2026-11-24T10:00:00+05:30');
const GROWTH_END = Date.parse('2026-11-26T10:30:00+05:30');
const TARGET_PEOPLE = 183;
const IST_OFFSET_MS = 5.5 * 36e5;

export interface SimTeam { id: string; name: string; size: number; channels: string[] }
export interface SimPerson {
  id: string;
  name: string;
  role: string;
  city: string;
  team: SimTeam;
  joinedAt: number;
  /** how active this person usually is (0.15–0.95) */
  energy: number;
}
export type ActionKind = 'view' | 'message' | 'react' | 'task' | 'idle';
export interface Action { at: number; kind: ActionKind; text: string; count?: number }
export interface Session { start: number; end: number; messages: number; actions: Action[] }

/** A moment between `from` and `to`, more likely during busy daytime hours (deterministic per key). */
const daytimeMoment = (key: string, from: number, to: number) => {
  const peak = Math.max(...CURVE);
  for (let k = 0; k < 60; k++) {
    const t = from + hashStr(`${key}#${k}`) * (to - from);
    const hour = Math.floor(((t + IST_OFFSET_MS) % 864e5) / 36e5);
    if (hashStr(`${key}?${k}`) < CURVE[hour] / peak) return t;
  }
  return from + hashStr(key) * (to - from);
};

let WORLD: { teams: SimTeam[]; people: SimPerson[] } | null = null;
const world = () => {
  if (WORLD) return WORLD;
  const teams: SimTeam[] = [];
  const people: SimPerson[] = [];
  for (let t = 1; people.length < TARGET_PEOPLE; t++) {
    const team: SimTeam = {
      id: `team${t}`,
      name: `${pickBy(TEAM_A, `ta${t}`)}${pickBy(TEAM_B, `tb${t}`)}`,
      size: Math.min(3 + Math.floor(hashStr(`size${t}`) * 6), TARGET_PEOPLE - people.length), // 3–8 people
      channels: ['general', ...['frontend', 'backend', 'design', 'ml', 'docs', 'testing', 'deployment', 'research'].filter((_, i) => hashStr(`ch${t}_${i}`) < 0.28)].slice(0, 3),
    };
    teams.push(team);
    // A team signs up at a random (mostly daytime) moment; its members trickle in over the next few hours
    const teamStart = daytimeMoment(`team${t}`, LAUNCH + 10 * 6e4, GROWTH_END - 60 * 6e4);
    for (let i = 0; i < team.size; i++) {
      const key = `p${t}_${i}`;
      const joinedAt = i === 0 ? teamStart : Math.min(GROWTH_END, daytimeMoment(`j${key}`, teamStart + 2 * 6e4, teamStart + 9 * 36e5));
      people.push({
        id: key,
        name: `${pickBy(FIRST, `f${key}`)} ${pickBy(LAST, `l${key}`)}`,
        role: pickBy(ROLES, `r${key}`),
        city: pickBy(CITIES, `c${key}`),
        team,
        joinedAt,
        energy: 0.25 + hashStr(`e${key}`) * 0.7,
      });
    }
  }
  WORLD = { teams, people };
  return WORLD;
};

// ---------- time of day (India) ----------
/** How busy people are at a given IST hour (0–1): quiet at night, peak in the evening. */
const CURVE = [0.08, 0.05, 0.03, 0.02, 0.02, 0.03, 0.07, 0.14, 0.24, 0.36, 0.5, 0.6, 0.66, 0.62, 0.64, 0.68, 0.72, 0.76, 0.8, 0.86, 0.92, 0.88, 0.68, 0.38];
const istDayStart = (t: number) => {
  const d = Math.floor((t + IST_OFFSET_MS) / 864e5);
  return d * 864e5 - IST_OFFSET_MS;
};
/** Pick an hour of the day, weighted by the activity curve. */
const weightedHour = (u: number) => {
  const total = CURVE.reduce((a, b) => a + b, 0);
  let r = u * total;
  for (let h = 0; h < 24; h++) {
    r -= CURVE[h];
    if (r <= 0) return h;
  }
  return 20;
};

// ---------- sessions ----------
/** Standard normal from two hashes (Box–Muller). */
const gauss = (key: string) => Math.sqrt(-2 * Math.log(Math.max(1e-9, hashStr(`${key}g1`)))) * Math.cos(2 * Math.PI * hashStr(`${key}g2`));
/** Random second-level offset so nothing lands on neat minute marks. */
const secs = (key: string) => Math.floor(hashStr(`${key}s`) * 60) * 1000;

const PAGES = ['Mission Board', 'Decision Log', 'Overview', 'Squad'];
const TASK_TEXT = ['picked up a task', 'moved a task to In Progress', 'completed a task', 'updated a deadline', 'reassigned a task'];

/** Team "huddles": moments when several teammates show up together (deterministic per team and day). */
const huddleCache = new Map<string, { start: number; end: number }[]>();
const huddlesOn = (team: SimTeam, dayStart: number) => {
  const key = `${team.id}@${dayStart}`;
  const hit = huddleCache.get(key);
  if (hit) return hit;
  const out: { start: number; end: number }[] = [];
  const n = Math.floor(hashStr(`hn${key}`) * 3.6); // 0–3 per day
  for (let i = 0; i < n; i++) {
    const start = dayStart + weightedHour(hashStr(`hh${key}${i}`)) * 36e5 + hashStr(`hm${key}${i}`) * 36e5;
    out.push({ start, end: start + (15 + hashStr(`hl${key}${i}`) * 55) * 6e4 });
  }
  huddleCache.set(key, out);
  return out;
};

/** What someone does during a visit. About 30% of visits are "just looking": no actions at all. */
const actionsFor = (p: SimPerson, start: number, end: number, key: string): Action[] => {
  const minutes = (end - start) / 6e4;
  if (hashStr(`lurk${key}`) < 0.3) {
    return hashStr(`lv${key}`) < 0.5 ? [] : [{ at: start + hashStr(`lva${key}`) * (end - start) * 0.5, kind: 'view', text: `browsing ${pickBy(PAGES, `lvp${key}`)}` }];
  }
  const rate = 0.08 + hashStr(`rate${key}`) * 0.35 * p.energy; // actions per minute
  const n = Math.max(1, Math.min(25, Math.round(minutes * rate)));
  const out: Action[] = [];
  for (let i = 0; i < n; i++) {
    const k = `${key}a${i}`;
    // Bunched towards the start of a visit, like people do
    const at = start + Math.pow(hashStr(`at${k}`), 1.4) * (end - start) + secs(k);
    const r = hashStr(`kind${k}`);
    const ch = pickBy(p.team.channels, `ch${k}`);
    if (r < 0.38) {
      const count = 1 + Math.floor(hashStr(`mc${k}`) * 3);
      out.push({ at, kind: 'message', count, text: `sent ${count} message${count > 1 ? 's' : ''} in #${ch}` });
    } else if (r < 0.7) out.push({ at, kind: 'view', text: hashStr(`vp${k}`) < 0.5 ? `opened #${ch}` : `browsing ${pickBy(PAGES, `vp${k}`)}` });
    else if (r < 0.82) out.push({ at, kind: 'react', text: `reacted to a message in #${ch}` });
    else if (r < 0.95) out.push({ at, kind: 'task', text: pickBy(TASK_TEXT, `tt${k}`) });
    else out.push({ at, kind: 'idle', text: 'went idle' });
  }
  return out.filter((a) => a.at < end).sort((a, b) => a.at - b.at);
};

const sessionCache = new Map<string, Session[]>();
/** The (deterministic) visits a person makes on the IST day that starts at dayStart. */
export const sessionsOn = (p: SimPerson, dayStart: number): Session[] => {
  const key = `${p.id}@${dayStart}`;
  const cached = sessionCache.get(key);
  if (cached) return cached;
  const raw: { start: number; end: number }[] = [];
  if (dayStart + 864e5 > p.joinedAt) {
    const weekday = new Date(dayStart + IST_OFFSET_MS).getUTCDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.75 : 1;
    // Solo visits: lengths are heavy-tailed (lots of 2–10 min check-ins, a few long work sessions)
    const count = Math.floor(hashStr(`n${key}`) * 8 * p.energy * weekendFactor + 0.5);
    for (let i = 0; i < count; i++) {
      const start = dayStart + weightedHour(hashStr(`h${key}${i}`)) * 36e5 + hashStr(`m${key}${i}`) * 36e5;
      const minutes = Math.min(180, Math.max(2, Math.exp(3.0 + 0.9 * gauss(`dur${key}${i}`))));
      raw.push({ start, end: start + minutes * 6e4 });
    }
    // Team huddles: most teammates drift in within a few minutes of each other
    huddlesOn(p.team, dayStart).forEach((h, i) => {
      if (hashStr(`hj${key}${i}`) > 0.62) return;
      const start = h.start + Math.min(15, -Math.log(Math.max(1e-6, hashStr(`ho${key}${i}`))) * 4) * 6e4 + secs(`hs${key}${i}`);
      raw.push({ start, end: h.end + (hashStr(`he${key}${i}`) - 0.4) * 20 * 6e4 });
    });
    // On the day someone joins, they're online right away for a while
    if (p.joinedAt >= dayStart && p.joinedAt < dayStart + 864e5) {
      raw.push({ start: p.joinedAt, end: p.joinedAt + (10 + hashStr(`first${key}`) * 35) * 6e4 });
    }
  }
  // Merge overlapping visits (or ones less than 2 minutes apart) into one
  const merged: { start: number; end: number }[] = [];
  raw
    .map((x) => ({ start: Math.max(x.start, p.joinedAt), end: x.end }))
    .filter((x) => x.end - x.start > 60e3)
    .sort((a, b) => a.start - b.start)
    .forEach((x) => {
      const last = merged[merged.length - 1];
      if (last && x.start <= last.end + 2 * 6e4) last.end = Math.max(last.end, x.end);
      else merged.push({ ...x });
    });
  const out: Session[] = merged.map((x, i) => {
    const actions = actionsFor(p, x.start, x.end, `${key}v${i}`);
    return { ...x, actions, messages: actions.reduce((sum, a) => sum + (a.count || 0), 0) };
  });
  if (sessionCache.size > 20000) sessionCache.clear();
  sessionCache.set(key, out);
  return out;
};

// ---------- public API ----------
export const members = (now = Date.now()) => world().people.filter((p) => p.joinedAt <= now);
export const teamsActive = (now = Date.now()) => world().teams.filter((t) => members(now).some((p) => p.team === t));

export const isOnline = (p: SimPerson, now = Date.now()) =>
  [istDayStart(now), istDayStart(now) - 864e5].some((d) => sessionsOn(p, d).some((s) => s.start <= now && now < s.end));

/** Last time the person was active (now if online), or null if never. Looks back 14 days. */
export const lastSeen = (p: SimPerson, now = Date.now()): number | null => {
  for (let i = 0; i < 14; i++) {
    const day = istDayStart(now) - i * 864e5;
    const ended = sessionsOn(p, day).filter((s) => s.start <= now);
    if (ended.length) return Math.min(now, ended[ended.length - 1].end);
  }
  return null;
};

export interface PlatformSnapshot {
  onlineNow: number;
  totalUsers: number;
  totalTeams: number;
  visitorsToday: number;
  messagesToday: number;
}
export const snapshot = (now = Date.now()): PlatformSnapshot => {
  const ppl = members(now);
  const today = istDayStart(now);
  let onlineNow = 0;
  let visitorsToday = 0;
  let messagesToday = 0;
  for (const p of ppl) {
    if (isOnline(p, now)) onlineNow++;
    const s = sessionsOn(p, today).filter((x) => x.start <= now);
    if (s.length) visitorsToday++;
    for (const x of s) for (const a of x.actions) if (a.at <= now) messagesToday += a.count || 0;
  }
  return { onlineNow, totalUsers: ppl.length, totalTeams: new Set(ppl.map((p) => p.team.id)).size, visitorsToday, messagesToday };
};

/** People online at each hour for the last `hours` hours (oldest first). */
export const onlineTimeline = (hours = 24, now = Date.now()) => {
  const out: { at: number; online: number }[] = [];
  const ppl = members(now);
  for (let i = hours - 1; i >= 0; i--) {
    const at = now - i * 36e5;
    out.push({ at, online: ppl.filter((p) => p.joinedAt <= at && isOnline(p, at)).length });
  }
  return out;
};

export interface ActivityEvent { at: number; person: SimPerson; kind: 'online' | 'offline' | 'joined' | 'action'; text?: string; action?: ActionKind }
/** Visit history: comings, goings and new sign-ups in the last `hours` hours, newest first. */
export const recentActivity = (hours = 6, now = Date.now(), limit = 60): ActivityEvent[] => {
  const from = now - hours * 36e5;
  const events: ActivityEvent[] = [];
  for (const p of members(now)) {
    if (p.joinedAt >= from) events.push({ at: p.joinedAt, person: p, kind: 'joined' });
    for (const day of [istDayStart(now), istDayStart(now) - 864e5]) {
      for (const s of sessionsOn(p, day)) {
        if (s.start >= from && s.start <= now) events.push({ at: s.start, person: p, kind: 'online' });
        if (s.end >= from && s.end <= now) events.push({ at: s.end, person: p, kind: 'offline' });
        for (const a of s.actions) if (a.at >= from && a.at <= now) events.push({ at: a.at, person: p, kind: 'action', text: a.text, action: a.kind });
      }
    }
  }
  return events.sort((a, b) => b.at - a.at).slice(0, limit);
};

/** Number of sessions a person had today so far. */
export const visitsToday = (p: SimPerson, now = Date.now()) => sessionsOn(p, istDayStart(now)).filter((s) => s.start <= now).length;

export const initialsOf = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const colorOf = (id: string) => ['#10b981', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#a78bfa', '#f97316'][Math.floor(hashStr(`col${id}`) * 8)];

export const timeAgo = (t: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

/** What an online person seems to be doing right now (shown in the Live users list). */
export const currentActivity = (p: SimPerson, now = Date.now()): string | null => {
  const s = [istDayStart(now), istDayStart(now) - 864e5].flatMap((d) => sessionsOn(p, d)).find((x) => x.start <= now && now < x.end);
  if (!s) return null;
  const last = [...s.actions].reverse().find((a) => a.at <= now);
  if (!last) return now - s.start < 3 * 6e4 ? 'Just arrived' : 'Looking around';
  if (last.kind === 'idle' || now - last.at > 8 * 6e4) return 'Idle';
  if (last.kind === 'message') return `Chatting in ${last.text.split(' in ')[1]}`;
  if (last.kind === 'react') return `Reading ${last.text.split(' in ')[1]}`;
  if (last.kind === 'task') return 'Working on tasks';
  return last.text.startsWith('opened') ? `Reading ${last.text.slice(7)}` : `Browsing ${last.text.slice(9)}`;
};
