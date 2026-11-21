# What changed

## 1. Real-time multi-user channels (cloud mode)

When a Firebase config is present (`firebase-applet-config.json`), the app now runs in **cloud mode**:

- **Google sign-in** is required (`src/components/AuthGate.tsx`). Messages carry the signed-in user's real id.
- **Live sync** via Firestore `onSnapshot` listeners for messages, channels, tasks, decisions, member profiles and AI analyses (`src/context/WorkspaceContext.tsx`). Two people in the same project see each other's messages instantly.
- **Invite links**: "Copy invite link" in the sidebar or Team view gives `…/?project=<id>`. Anyone who signs in through it joins that project.
- **Workspace switcher**: the workspace button lists all your projects.
- **Presence**: members show online/offline (heartbeat every 60s).
- **AI analyses are saved per channel** and shared, so open questions and proposed tasks are not lost on refresh.

Without a Firebase config, the app runs in **local demo mode** as before, with sample data, a "switch user" option, and browser storage.

### Firebase setup
1. Create a Firebase project, enable **Authentication → Google** and **Firestore**.
2. Put your web app config in `firebase-applet-config.json` at the project root (fields: `apiKey`, `authDomain`, `projectId`, `appId`, and optionally `firestoreDatabaseId`).
3. Add your domain (e.g. `localhost`) under Authentication → Settings → Authorized domains.
4. **Deploy the rules**: `firebase deploy --only firestore:rules`. The app depends on the new rules.

### Firestore rules changes (`firestore.rules`)
- A signed-in user can add *only themselves* to a project's `members` (invite-link join).
- New `members/{uid}` (profiles, editable only by their owner) and `analyses/{channelId}` collections.
- Any member can toggle **reactions** on any message (and change nothing else).
- Allowed decision status `superseded`. It was missing before, so superseding a decision silently failed.
- Messages that contain only a code snippet are now accepted.

## 2. Skill-based assignment
- Members have editable **role + skills** (Team view → Edit).
- `src/lib/skillMatch.ts` ranks members by how many of their skills match the task's required skills (or words in its title or description). Members with fewer open tasks rank higher.
- "Best fit by skills" suggestions appear in the **Create/Edit Task** modal and on unassigned **AI-proposed tasks**. One click assigns the person.
- The Gemini prompt now gets each member's role and skills and returns `recommendedSkills` for each task.

## 3. Progress & deadlines
- Dashboard shows a **progress bar** broken down by status, an **Overdue** card (click to filter), and the **real project deadline**. It used to be hard-coded.
- Task cards show **Overdue / Due in Xh** chips, and overdue cards get a red border.
- Team view shows open / done / overdue counts and a progress bar per person.
- Deadlines can stay free text ("Thursday, Oct 29 at 3 PM"); `src/lib/deadlines.ts` parses common formats. The task modal shows how it read the date.
- New projects can be given a deadline.

## 4. Honest AI fallback
- The old fallback returned **hard-coded answers** about an ML project whenever certain keywords appeared. It has been removed.
- `server/basicExtract.ts` is a simple rule-based extractor that reads the actual conversation. It finds "I'll…" commitments, "X, can you…" requests, deadlines, decisions, open questions and ideas, and cites real message ids.
- The response says `mode: 'ai' | 'basic'`, and the AI panel shows a clear **"Basic mode — not AI"** banner.
- Evidence is no longer made up: items without real supporting messages are no longer pinned to the first message.
- Gemini now also extracts **ideas**. The model is configurable via `GEMINI_MODEL`.

## Other fixes
- Firestore now ignores `undefined` fields. Before, messages without a code snippet failed to sync.
- The task modal showed stale values when editing a second task. Fixed.
- Status changes keep `completed` in step with the "Completed" column.
- Removed the "Message posted" toast that fired on every message.

## Not done yet
- **Voice channels**: need WebRTC or a service like LiveKit/Agora. They're a separate piece of work.
- Unread counts per channel are still static.

---

# Update: bug fixes + chat features (Nov 2026)

## Fixes
- **Workspace invites work.** "Copy invite link" (Squad tab) now creates a real `?invite=` link (valid 7 days). Old `?project=` links can't add anyone, because non-members can't read the project.
- **Jump to source message works from anywhere.** Tasks now store `channelId`. Old tasks without one are found by looking the message up in each channel.
- **Scroll-to-message timing.** The chat waits until the target message has actually loaded before scrolling and highlighting, and no longer jumps back to the bottom.
- **No more decision id collisions.** Every analysed item gets a unique id, so confirming a decision in one channel can't overwrite one from another channel.
- **Re-running analysis keeps review work.** Edited, ticked, confirmed or owner-assigned items stay. Rejected tasks aren't proposed again, and tasks already on the board are skipped.

## New
- **Hinglish understanding**: Gemini prompt rules, plus Hinglish patterns in the basic (no-AI) extractor ("kal tak bana dunga", "final hai", "kisne dekha").
- **New-message pop-ups** for every channel (cloud mode). "Open" jumps to the message, @mentions are highlighted, a browser notification shows when the tab is in the background, and channels show live unread counts.
- **@mentions**: type `@` to pick a teammate (arrow keys / Enter / Tab). Tags are highlighted and saved as `mentions` on the message.
- **Reply to a message**: swipe right (touch or mouse drag) or use the Reply button. The quoted message shows above the reply, and clicking it jumps to the original. Replies are passed to the AI too.

---

# Update: card home + mobile layout + demo activity (Nov 2026)

## Card home (replaces the left sidebar)
- After login you land on **Home**: four cards (Overview, Mission Board, Decision Log, Squad) with live stats, plus the **channel list** (unread badges, task progress, admin, New channel, delete for owners) and the **Workspace management** and **Intel** buttons.
- Every page has a **← Home** bar. In channels, that bar switches between channels. The phone or browser Back button also returns Home.
- The old `Sidebar.tsx` is no longer used. It's kept in the repo for reference and can be deleted later.

## Mobile
- Workspaces open from the ☰ button. The chat takes the full screen, and the AI review panel opens as a bottom sheet from the **AI** button.

## Demo activity simulator (`scripts/simulate-activity.mjs`)
- `--setup` creates ~130 simulated small teams (~900 people) with channels and a few days of chat history. `--live` keeps them chatting in waves that follow Indian time of day, and publishes platform-wide live numbers to `stats/platform`. Those numbers show on the login page and Home ("N online now · people · teams · messages today"). `--home <id>` adds 6 simulated teammates to your own workspace.
- Built for the Firebase Spark (free) plan: no presence writes for the crowd, and a daily write budget (default 15,000 of the 20,000 allowed) shared across runs.
- Everything is tagged `simulated: true`; `--cleanup --home <id>` removes it all.
- `.github/workflows/simulate-activity.yml` runs it in GitHub Actions in 6-hour windows, so no laptop needs to stay on. It needs the `FIREBASE_SERVICE_ACCOUNT` secret and, optionally, the `SIM_HOME_PROJECT` / `SIM_UNTIL` variables.
- `firestore.rules` now allows public read of `stats/*` (writes stay blocked). Publish the rules in the Firebase console.

---

# Update: fast AI analysis (Nov 2026)

- **Model + thinking:** tries `gemini-3.1-flash-lite` first (fastest), then `gemini-3.5-flash`, with **low thinking**. Override with the `GEMINI_MODEL` env var (comma-separated list).
- **Hard time limit:** the whole AI step gives up after **25 s** (`GEMINI_TIMEOUT_MS`) and instantly returns the keyword-based results, labelled "Basic mode". There are no more multi-minute spinners, and Vercel's 60 s limit is never hit. The browser also gives up after 45 s.
- **Smaller requests:** only the latest 150 messages are sent (`GEMINI_MAX_MESSAGES`). Older context already lives in the saved analysis, which re-runs merge into.
- **Background auto-analysis:** while a channel is open, it re-analyzes quietly once there are 5+ new messages and the chat has been quiet for 20 s. It runs at most once every 3 minutes per channel, shared across teammates. A background "keyword only" result never overwrites an AI result.
- **Progress panel:** shows live steps ("Reading 97 messages…"), elapsed seconds and a progress bar instead of a bare spinner.
- `/api/status` now shows the model list and the time limit; server logs print "Gemini <model> answered in N ms".
