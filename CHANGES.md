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
