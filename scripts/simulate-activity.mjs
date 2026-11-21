#!/usr/bin/env node
/**
 * Sermona demo activity simulator
 * --------------------------------
 * Creates ~100–150 simulated small teams (≈500–1,000 people in total), keeps them chatting in
 * waves that follow Indian time of day, and publishes platform-wide live numbers to `stats/platform`
 * (shown on the login page and Home). Optionally a few simulated people also join YOUR workspace.
 *
 * Everything it writes is tagged `simulated: true`; `--cleanup` removes all of it.
 * It is built to stay inside the Firebase Spark (free) limits: it never writes per-user presence
 * for the big crowd, and it stops writing messages if the day's write budget is nearly used.
 *
 * Setup (once):
 *   1. Firebase Console → Project settings → Service accounts → "Generate new private key".
 *      Save it as `service-account.json` in the project folder. NEVER commit it (it's git-ignored).
 *   2. npm install
 *   3. Publish the updated firestore.rules (it adds public read access to `stats/platform`).
 *
 * Usage:
 *   node scripts/simulate-activity.mjs --setup --teams 130                 # create teams + people + history
 *   node scripts/simulate-activity.mjs --live --for 5d                     # run live for 5 days (or until stopped)
 *   node scripts/simulate-activity.mjs --live --home <YOUR_WORKSPACE_ID>   # also 6 simulated people in your workspace
 *   node scripts/simulate-activity.mjs --cleanup --home <YOUR_WORKSPACE_ID> # delete everything simulated
 *
 * Options:
 *   --key <path>         service account file (default ./service-account.json; or env FIREBASE_SERVICE_ACCOUNT with the JSON)
 *   --teams <n>          number of simulated teams (default 130). Use the same number for --setup and --live.
 *   --days <n>           days of chat history to backfill during --setup (default 3)
 *   --home <id>          your workspace id: adds 6 simulated teammates who chat in its channels
 *   --for <5d|12h|90m>   how long --live runs before stopping by itself (default: until Ctrl+C)
 *   --until <ISO date>   stop --live at this moment (e.g. 2026-11-26T23:59:00+05:30)
 *   --write-cap <n>      max writes per UTC day across all runs (default 15000; Spark allows 20000)
 *   --speed <n>          busier/quieter, e.g. 2 = twice as many messages (default 1)
 */
import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ---------------- arguments ----------------
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
const KEY = opt('key', './service-account.json');
const TEAMS = Math.max(1, Number(opt('teams', 130)));
const DAYS = Math.max(0, Number(opt('days', 3)));
const HOME = opt('home');
const SPEED = Math.max(0.2, Number(opt('speed', 1)));
const WRITE_CAP = Number(opt('write-cap', 15000));
const parseFor = (s) => {
  const m = /^(\d+(?:\.\d+)?)([dhm])$/.exec(s || '');
  return m ? Number(m[1]) * { d: 864e5, h: 36e5, m: 6e4 }[m[2]] : null;
};
const STOP_AT = Math.min(
  opt('until') ? new Date(opt('until')).getTime() : Infinity,
  parseFor(opt('for')) ? Date.now() + parseFor(opt('for')) : Infinity
);

if (!(flag('setup') || flag('live') || flag('cleanup'))) {
  console.log('Usage: node scripts/simulate-activity.mjs [--setup] [--live] [--cleanup] [--home <workspaceId>]  (see top of file)');
  process.exit(1);
}
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : existsSync(KEY)
    ? JSON.parse(readFileSync(KEY, 'utf8'))
    : null;
if (!credentials) {
  console.error(`Service account not found (${KEY}). Download it from Firebase Console → Project settings → Service accounts.`);
  process.exit(1);
}
initializeApp({ credential: cert(credentials) });
const db = getFirestore();
const statsRef = db.doc('stats/platform');

// ---------------- deterministic randomness (same teams and names every run) ----------------
let seed = 20261121;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (l, r = Math.random) => l[Math.floor(r() * l.length)];
const shuffle = (l) => [...l].sort(() => Math.random() - 0.5);
const seededShuffle = (l) => [...l].map((v) => [rnd(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const rid = () => Math.random().toString(36).slice(2, 8);
const pad = (n, w) => String(n).padStart(w, '0');

// ---------------- the simulated world ----------------
const FIRST = ['Aarav','Ishita','Rohan','Meher','Kabir','Tanya','Arjun','Diya','Vihaan','Ananya','Aditya','Saanvi','Reyansh','Myra','Krish','Aadhya','Vivaan','Kiara','Ayaan','Navya','Dhruv','Riya','Arnav','Sara','Yash','Pari','Kunal','Nisha','Manav','Simran','Harsh','Jasleen','Ritvik','Gauri','Pranav','Avni','Siddharth','Tara','Rudra','Mahi','Nikhil','Isha','Parth','Anvi','Laksh','Sanya','Om','Zoya','Kartik','Trisha','Dev','Aisha','Shaurya','Inaaya','Varun','Prisha','Neel','Khushi','Agastya','Sneha'];
const LAST = ['Sharma','Verma','Gupta','Singh','Kaur','Malhotra','Bansal','Arora','Sethi','Mehta','Kapoor','Chopra','Jain','Agarwal','Bhatia','Khanna','Gill','Sandhu','Grewal','Saini','Garg','Mittal','Goyal','Rana','Thakur','Nair','Iyer','Reddy','Das','Mishra'];
const ROLES = ['Frontend Developer','Backend Developer','ML Engineer','Product Designer','QA & DevOps','Project Coordinator','Full-stack Developer','Data Analyst'];
const SKILLS = { 'Frontend Developer': ['React','Tailwind','UI'], 'Backend Developer': ['Node.js','Firebase','APIs'], 'ML Engineer': ['Python','NLP','Gemini'], 'Product Designer': ['Figma','UX','Research'], 'QA & DevOps': ['Testing','Vercel','CI'], 'Project Coordinator': ['Planning','Docs','Slides'], 'Full-stack Developer': ['React','Node.js','SQL'], 'Data Analyst': ['SQL','Python','Dashboards'] };
const TEAM_A = ['Campus','Smart','Green','Health','Study','Quick','Open','Bright','Safe','Fin','Agri','Eco','Code','Civic','Food','Travel','Skill','Mind','Hire','Event'];
const TEAM_B = ['Connect','Track','Sense','Hub','Pulse','Mate','Flow','Lens','Bridge','Nest','Desk','Loop','Grid','Path','Board','Wave','Spark','Kit','Link','Map'];
const TAGS = ['Hackathon build','Capstone project','SE Lab project','Startup idea','Course project','Club tool'];
const CHANS = ['frontend','backend','design','ml','docs','testing','deployment','research'];

const initials = (n) => n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
const avatarFor = (name) => {
  const palette = ['#10b981', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9'];
  const color = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#0f172a">${initials(name)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** The same teams and people every run (stable ids), so setup can be re-run safely. */
function buildWorld(teamCount) {
  seed = 20261121;
  const teams = [];
  let userNo = 0;
  for (let t = 1; t <= teamCount; t++) {
    const size = 4 + Math.floor(rnd() * 7); // 4–10 people
    const people = [];
    for (let i = 0; i < size; i++) {
      const name = `${pick(FIRST, rnd)} ${pick(LAST, rnd)}`;
      const role = pick(ROLES, rnd);
      userNo++;
      people.push({ id: `sim_u${pad(userNo, 4)}`, name, role, skills: SKILLS[role] });
    }
    const chans = ['general', ...seededShuffle(CHANS).slice(0, 1 + Math.floor(rnd() * 2))];
    teams.push({
      id: `sim_team_${pad(t, 3)}`,
      name: `${pick(TEAM_A, rnd)}${pick(TEAM_B, rnd)}`,
      tagline: pick(TAGS, rnd),
      people,
      channels: chans.map((c) => ({ id: `sim_${pad(t, 3)}_${c}`, name: c })),
      activity: 0.4 + rnd() * 1.2, // some teams are chattier than others
    });
  }
  return teams;
}

const HOME_PEOPLE = [
  { id: 'sim_home_aarav', name: 'Aarav Malhotra', role: 'Frontend Developer' },
  { id: 'sim_home_ishita', name: 'Ishita Bansal', role: 'Backend Developer' },
  { id: 'sim_home_rohan', name: 'Rohan Verma', role: 'ML Engineer' },
  { id: 'sim_home_meher', name: 'Meher Kaur', role: 'Product Designer' },
  { id: 'sim_home_kabir', name: 'Kabir Sethi', role: 'QA & DevOps' },
  { id: 'sim_home_tanya', name: 'Tanya Arora', role: 'Project Coordinator' },
].map((p) => ({ ...p, skills: SKILLS[p.role], email: `${p.id.replace('sim_home_', '')}.sermona.demo@thapar.edu` }));

// ---------------- conversations ({A}/{B}/{C} = different people) ----------------
const THREADS = [
  ['{A}: Login page ka layout final kar diya, kal tak push kar dunga', '{B}: Nice! Mobile view bhi check kar lena', '{A}: Haan, Friday tak dono done'],
  ['{A}: Should we keep Firebase or move to Postgres for the final build?', '{B}: Firebase hi rakhte hain, time kam hai', '{C}: Agreed, Firebase it is. Locking this decision', '{A}: Cool 👍'],
  ['{A}: The API is slow on long requests, anyone looked into it?', '{B}: I will check tonight, maybe we batch the calls', '{A}: Thanks yaar'],
  ['{A}: Kisne deploy wala issue dekha?', '{B}: Vercel env variable missing tha, fixed now', '{C}: Lifesaver 🙌'],
  ['{A}: Reminder: slides by Thursday 6 PM', '{B}: I will make the architecture slides', '{C}: Demo flow + screenshots mere paas', '{A}: Perfect, merging everything Friday morning'],
  ['{A}: @{B} can you review my PR for the task board?', '{B}: On it, 20 min', '{B}: Done, left 2 small comments', '{A}: Fixed and merged ✅'],
  ['{A}: Idea: kya hum dark/light toggle add karein?', '{B}: Maybe after the review, abhi bugs pe focus karte hain', '{A}: Fair'],
  ['{A}: Test cases for the reply feature are written', '{B}: Edge case: reply to a deleted message?', '{A}: Good catch, adding that today'],
  ['{A}: Who is taking the DFD Level 2 diagram?', '{B}: I can take it, by tomorrow evening', '{A}: 🙏'],
  ['{A}: Meeting at 9 PM on meet?', '{B}: Works', '{C}: 9:15 please, class till 9', '{A}: 9:15 final'],
  ['{A}: Notifications tested, working fine on Chrome', '{B}: Safari needs a click before asking permission, documenting it'],
  ['{A}: Pushed the onboarding screens, take a look', '{B}: Looks clean! Spacing on mobile is a bit tight', '{A}: Fixing'],
  ['{A}: Database schema v2 ready, please review', '{B}: Users table mein email unique kar do', '{A}: Done', '{C}: LGTM'],
  ['{A}: Mentor said to cut the scope a bit', '{B}: Then let us drop the export feature for now', '{C}: Agreed, export goes to v2'],
];
const SOLO = [
  'Pulled latest main, everything builds ✅', 'Taking a short break, back in 20', 'Updated the README with setup steps',
  'Kal subah standup at 10?', 'Fixed the overflow bug on the dashboard', 'Anyone has the latest proposal pdf?',
  'Sab log ek baar latest pull kar lo', 'Uploaded the meeting notes', 'Good progress today team 🔥',
];
const EMOJIS = ['👍', '🔥', '🙌', '✅', '😂', '💯'];

function castThread(template, people) {
  const cast = shuffle(people).slice(0, 3);
  while (cast.length < 3) cast.push(cast[0]);
  const who = { A: cast[0], B: cast[1], C: cast[2] };
  return template.map((line) => ({ person: who[line[1]], text: line.slice(5).replace(/\{([ABC])\}/g, (_, r) => who[r].name) }));
}

// ---------------- write budget (shared across runs through the stats doc) ----------------
const today = () => new Date().toISOString().slice(0, 10);
const budget = { day: today(), writes: 0, messagesToday: 0 };
async function loadBudget() {
  const s = await statsRef.get();
  const d = s.exists ? s.data() : {};
  if (d.budgetDay === today()) {
    budget.writes = d.writesToday || 0;
    budget.messagesToday = d.messagesToday || 0;
  }
}
const rollDay = () => {
  if (budget.day !== today()) Object.assign(budget, { day: today(), writes: 0, messagesToday: 0 });
};
const spend = (n) => {
  rollDay();
  budget.writes += n;
};
const canSpend = (n) => {
  rollDay();
  return budget.writes + n <= WRITE_CAP;
};

async function commitInChunks(ops) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
    spend(Math.min(450, ops.length - i));
  }
}

function messageData(projectId, channelId, person, content, at, replyTo, people) {
  const id = `msg_sim_${at.getTime().toString(36)}_${rid()}`;
  const mentions = people.filter((p) => content.includes(`@${p.name}`)).map((p) => p.id);
  return {
    id,
    channelId,
    projectId,
    senderId: person.id,
    senderName: person.name,
    senderAvatar: avatarFor(person.name),
    senderRole: person.role,
    content,
    timestamp: at.toISOString(),
    reactions: {},
    ...(mentions.length ? { mentions } : {}),
    ...(replyTo ? { replyTo } : {}),
    simulated: true,
  };
}
const replyRef = (m) => ({ messageId: m.id, senderId: m.senderId, senderName: m.senderName, snippet: m.content.slice(0, 140) });

// ---------------- setup: teams, people, channels, a little history ----------------
async function setup() {
  await loadBudget();
  const world = buildWorld(TEAMS);
  const now = Date.now();
  const ops = [];
  let people = 0;
  for (const team of world) {
    const pRef = db.doc(`projects/${team.id}`);
    const createdAt = new Date(now - (DAYS + 2 + Math.random() * 20) * 864e5).toISOString();
    ops.push((b) => b.set(pRef, { id: team.id, name: team.name, tagline: team.tagline, description: team.tagline, ownerId: team.people[0].id, members: team.people.map((p) => p.id), createdAt, tags: [], simulated: true }));
    for (const p of team.people) {
      people++;
      ops.push((b) => b.set(pRef.collection('members').doc(p.id), { id: p.id, name: p.name, email: `${p.id}@sim.sermona.dev`, avatar: avatarFor(p.name), initials: initials(p.name), role: p.role, skills: p.skills, simulated: true }));
    }
    for (const c of team.channels) {
      ops.push((b) => b.set(pRef.collection('channels').doc(c.id), { id: c.id, projectId: team.id, name: c.name, adminId: team.people[0].id, topic: `${c.name} discussions`, description: `${c.name} discussions`, createdAt, simulated: true }));
    }
  }
  // History: roughly one short conversation per team every other day, kept small for the free tier
  let history = 0;
  for (const team of world) {
    for (let day = DAYS; day >= 1; day--) {
      if (Math.random() > 0.55 * team.activity) continue;
      const channel = pick(team.channels);
      const start = new Date(now - day * 864e5);
      start.setUTCHours(5 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60), 0, 0); // ~10:30–23:30 IST
      let at = start.getTime();
      let prev = null;
      for (const { person, text } of castThread(pick(THREADS), team.people)) {
        at += (1 + Math.random() * 9) * 60e3;
        const m = messageData(team.id, channel.id, person, text, new Date(at), prev && Math.random() < 0.35 ? replyRef(prev) : undefined, team.people);
        if (Math.random() < 0.25) m.reactions = { [pick(EMOJIS)]: shuffle(team.people).slice(0, 2).map((p) => p.id) };
        ops.push((b) => b.set(db.doc(`projects/${team.id}/channels/${channel.id}/messages/${m.id}`), m));
        prev = m;
        history++;
      }
    }
  }
  if (!canSpend(ops.length + 1)) {
    console.error(`Setup needs ~${ops.length} writes but only ${WRITE_CAP - budget.writes} are left today. Use fewer --teams or --days, or run tomorrow.`);
    process.exit(1);
  }
  console.log(`Setup: ${world.length} teams, ${people} people, ${history} history messages (${ops.length} writes)…`);
  await commitInChunks(ops);
  await statsRef.set({ totalUsers: people, totalTeams: world.length, onlineNow: 0, messagesToday: budget.messagesToday, budgetDay: budget.day, writesToday: budget.writes + 1, updatedAt: new Date().toISOString(), simulated: true }, { merge: true });
  spend(1);
  console.log(`Setup done. Writes used today: ${budget.writes}/${WRITE_CAP}.`);
}

// ---------------- home workspace: a few simulated teammates in YOUR workspace ----------------
async function joinHome() {
  const pRef = db.doc(`projects/${HOME}`);
  const snap = await pRef.get();
  if (!snap.exists) throw new Error(`Workspace "${HOME}" not found.`);
  const ops = HOME_PEOPLE.map((p) => (b) => b.set(pRef.collection('members').doc(p.id), { id: p.id, name: p.name, email: p.email, avatar: avatarFor(p.name), initials: initials(p.name), role: p.role, skills: p.skills, simulated: true }, { merge: true }));
  ops.push((b) => b.update(pRef, { members: FieldValue.arrayUnion(...HOME_PEOPLE.map((p) => p.id)) }));
  await commitInChunks(ops);
  const chans = (await pRef.collection('channels').get()).docs.map((d) => ({ id: d.id, name: d.data().name }));
  if (!chans.length) throw new Error('Your workspace has no channels yet. Create one first.');
  console.log(`Home: 6 simulated teammates joined "${snap.data().name}" (${chans.length} channels).`);
  return { id: HOME, people: HOME_PEOPLE, channels: chans, activity: 2.5, home: true };
}

// ---------------- live ----------------
/** How busy people are at this hour in India (0–1): quiet at night, peak in the evening. */
const activityNow = () => {
  const h = (new Date().getUTCHours() + new Date().getUTCMinutes() / 60 + 5.5) % 24;
  const curve = [0.06, 0.04, 0.03, 0.02, 0.02, 0.03, 0.06, 0.12, 0.2, 0.3, 0.42, 0.5, 0.55, 0.5, 0.52, 0.58, 0.62, 0.66, 0.72, 0.8, 0.88, 0.85, 0.65, 0.35];
  return curve[Math.floor(h)];
};

async function live() {
  await loadBudget();
  const teams = buildWorld(TEAMS);
  if (HOME) teams.push(await joinHome());
  const everyone = teams.flatMap((t) => t.people);
  // Each person drifts between online sessions and breaks; nothing is written for this crowd
  const state = new Map(everyone.map((p) => [p.id, { online: Math.random() < activityNow() * 0.35, until: Date.now() + Math.random() * 30 * 60e3 }]));
  const ongoing = new Map(); // teamId -> { channelId, lines[], last }
  let lastStats = 0;
  let lastHomeBeat = 0;

  console.log(`Live: ${teams.length} teams, ${everyone.length} people. Writes used today: ${budget.writes}/${WRITE_CAP}.` + (STOP_AT < Infinity ? ` Stops at ${new Date(STOP_AT).toLocaleString()}.` : ' Ctrl+C to stop.'));

  const tick = async () => {
    const now = Date.now();
    if (now >= STOP_AT) {
      console.log('Reached the end time, stopping.');
      process.exit(0);
    }
    const level = activityNow();
    for (const p of everyone) {
      const s = state.get(p.id);
      if (now > s.until) {
        s.online = Math.random() < level * 0.6;
        s.until = now + (s.online ? 8 + Math.random() * 35 : 15 + Math.random() * 90) * 60e3;
      }
    }
    const onlineCount = everyone.filter((p) => state.get(p.id).online).length;

    try {
      // One conversational step in one team
      const busy = teams.filter((t) => t.people.some((p) => state.get(p.id).online));
      if (busy.length && canSpend(4)) {
        const weights = busy.map((t) => t.activity);
        let r = Math.random() * weights.reduce((a, b) => a + b, 0);
        const team = busy.find((t, i) => (r -= weights[i]) <= 0) || busy[0];
        let conv = ongoing.get(team.id);
        if (!conv || !conv.lines.length) {
          const channel = pick(team.channels);
          const lines = Math.random() < 0.8 ? castThread(pick(THREADS), team.people) : [{ person: pick(team.people), text: pick(SOLO) }];
          conv = { channelId: channel.id, lines, last: null };
          ongoing.set(team.id, conv);
        }
        if (Math.random() < 0.15 && conv.last) {
          const who = pick(team.people);
          await db.doc(`projects/${team.id}/channels/${conv.channelId}/messages/${conv.last.id}`).update({ [`reactions.${pick(EMOJIS)}`]: FieldValue.arrayUnion(who.id) });
          spend(1);
        } else {
          const { person, text } = conv.lines.shift();
          state.get(person.id).online = true;
          const m = messageData(team.id, conv.channelId, person, text, new Date(), conv.last && Math.random() < 0.35 ? replyRef(conv.last) : undefined, team.people);
          const batch = db.batch();
          batch.set(db.doc(`projects/${team.id}/channels/${conv.channelId}/messages/${m.id}`), m);
          batch.set(db.doc(`projects/${team.id}/members/${person.id}`), { lastSeen: m.timestamp }, { merge: true });
          await batch.commit();
          spend(2);
          budget.messagesToday++;
          conv.last = m;
          if (team.home) console.log(`${new Date().toLocaleTimeString()}  [your workspace] #${team.channels.find((c) => c.id === conv.channelId)?.name}  ${person.name}: ${text}`);
        }
      }

      // Your workspace: keep its online simulated teammates green (every 2 min)
      if (HOME && now - lastHomeBeat > 120e3 && canSpend(6)) {
        const onlineHome = HOME_PEOPLE.filter((p) => state.get(p.id).online);
        if (onlineHome.length) {
          const batch = db.batch();
          onlineHome.forEach((p) => batch.set(db.doc(`projects/${HOME}/members/${p.id}`), { lastSeen: new Date().toISOString() }, { merge: true }));
          await batch.commit();
          spend(onlineHome.length);
        }
        lastHomeBeat = now;
      }

      // Platform-wide numbers (every 3 min)
      if (now - lastStats > 180e3) {
        await statsRef.set({ totalUsers: everyone.length, totalTeams: teams.length, onlineNow: onlineCount, messagesToday: budget.messagesToday, budgetDay: budget.day, writesToday: budget.writes + 1, updatedAt: new Date().toISOString(), simulated: true }, { merge: true });
        spend(1);
        lastStats = now;
        console.log(`${new Date().toLocaleTimeString()}  online ${onlineCount}/${everyone.length} · messages today ${budget.messagesToday} · writes today ${budget.writes}/${WRITE_CAP}`);
      }
    } catch (err) {
      console.warn('Tick failed:', err.message);
    }
    // Busier hours → shorter gaps (about 12 s at the evening peak, a few minutes at night)
    const gap = ((10 + (1 - level) * 160) * (0.6 + Math.random() * 0.8) * 1000) / SPEED;
    setTimeout(tick, gap);
  };
  await tick();
}

// ---------------- cleanup ----------------
async function cleanup() {
  let removed = 0;
  const deleteQuery = async (q) => {
    const snap = await q.get();
    for (let i = 0; i < snap.docs.length; i += 450) {
      const b = db.batch();
      snap.docs.slice(i, i + 450).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    removed += snap.size;
  };
  const sims = await db.collection('projects').where('simulated', '==', true).get();
  for (const p of sims.docs) {
    for (const c of (await p.ref.collection('channels').get()).docs) {
      await deleteQuery(c.ref.collection('messages'));
      await c.ref.delete();
    }
    await deleteQuery(p.ref.collection('members'));
    await p.ref.delete();
    removed++;
  }
  if (HOME) {
    const pRef = db.doc(`projects/${HOME}`);
    for (const c of (await pRef.collection('channels').get()).docs) await deleteQuery(c.ref.collection('messages').where('simulated', '==', true));
    await deleteQuery(pRef.collection('members').where('simulated', '==', true));
    await pRef.update({ members: FieldValue.arrayRemove(...HOME_PEOPLE.map((p) => p.id)) });
  }
  await statsRef.delete();
  console.log(`Cleanup: removed ${removed} simulated documents.` + (HOME ? '' : ' (Add --home <id> to also clean your workspace.)'));
}

// ---------------- main ----------------
(async () => {
  if (flag('cleanup')) return cleanup().then(() => process.exit(0));
  if (flag('setup')) await setup();
  if (flag('live')) await live();
  else process.exit(0);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
