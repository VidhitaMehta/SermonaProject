import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  User,
  Project,
  Channel,
  Message,
  Task,
  Decision,
  AIAnalysisResult,
  SuggestedTask,
  DetectedDecision,
  ViewTab,
} from '../types';
import {
  SAMPLE_USERS,
  CURRENT_USER,
  SAMPLE_PROJECT,
  SAMPLE_CHANNELS,
  SAMPLE_MESSAGES,
  INITIAL_TASKS,
  INITIAL_DECISIONS,
} from '../data/sampleData';
import { configStatus, FirebaseStatus, db, auth, googleProvider, isAllowedEmail, ALLOWED_EMAIL_DOMAINS } from '../lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  collection,
  query,
  where,
  limit,
  orderBy,
  limitToLast,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { fireConfetti } from '../lib/confetti';

const STORAGE_KEY = 'sermona_workspace_state_v3';
const OLD_NAME_STORAGE_KEY = 'collabai_workspace_state_v3'; // before the rename to Sermona
const LEGACY_STORAGE_KEY = 'collabai_workspace_state_v2';
const LAST_PROJECT_KEY = 'sermona_last_project_id';
const OLD_LAST_PROJECT_KEY = 'collabai_last_project_id';
const ONLINE_WINDOW_MS = 150_000; // a member counts as online if seen in the last 2.5 min
const HEARTBEAT_MS = 60_000;

/** Cloud mode = Firebase config present → real accounts + live multi-user sync. */
const IS_CLOUD = Boolean(configStatus.isConfigured && db && auth);

export type WorkspaceMode = 'local' | 'cloud';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  tagline?: string;
}

interface WorkspaceContextType {
  mode: WorkspaceMode;
  authReady: boolean;
  isSignedIn: boolean;
  workspaceReady: boolean;
  cloudError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  inviteLink: string | null;
  myProjects: ProjectSummary[];
  switchProject: (projectId: string) => void;
  joinProject: (inviteLinkOrId: string) => Promise<boolean>;
  allowedEmailDomains: string[];
  updateMyProfile: (updates: { role?: string; skills?: string[] }) => void;

  currentUser: User;
  setCurrentUser: (user: User) => void;
  teamMembers: User[];
  project: Project;
  channels: Channel[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  messages: Record<string, Message[]>;
  tasks: Task[];
  decisions: Decision[];
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  jumpToMessage: (messageId: string, channelId?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentAnalysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  firebaseStatus: FirebaseStatus;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;

  // Actions
  sendMessage: (content: string, codeSnippet?: { language: string; code: string }) => void;
  addReaction: (messageId: string, emoji: string) => void;
  analyzeCurrentChannel: () => Promise<void>;

  // Proposed Tasks Review Actions (Approve, Edit, Reject)
  approveProposedTask: (taskId: string) => void;
  rejectProposedTask: (taskId: string) => void;
  editProposedTask: (taskId: string, updates: Partial<SuggestedTask>) => void;
  toggleApproveSuggestedTask: (suggestedTaskId: string) => void;
  commitApprovedTasks: () => void;

  // Decisions Review Actions (Confirm, Edit, Mark as Superseded)
  confirmDecision: (decisionId: string) => void;
  editDecision: (decisionId: string, updates: Partial<Decision | DetectedDecision>) => void;
  supersedeDecision: (decisionId: string) => void;

  // Unresolved Questions Actions (Assign Owner, Mark Resolved, Keep Open)
  assignQuestionOwner: (questionId: string, ownerId: string, ownerName: string) => void;
  resolveQuestion: (questionId: string) => void;
  keepQuestionOpen: (questionId: string) => void;

  // Standard Task Management Actions
  createTask: (taskData: Partial<Task>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskComplete: (taskId: string) => void;

  // Decision Management Actions
  createDecision: (decisionData: Partial<Decision>) => void;

  // Project & Channel Management
  createChannel: (name: string, topic: string) => void;
  deleteChannel: (channelId: string) => Promise<void>;
  /** Owner only: remove someone from this workspace (squad). */
  removeMember: (memberId: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  canDeleteMessage: (message: Message) => boolean;
  /** True if the current user owns this workspace (always true in local demo mode). */
  isProjectOwner: boolean;
  createNewProject: (name: string, tagline: string, description: string, deadline?: string | null) => void;
  resetToDemoData: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// ---------- small helpers ----------

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Firestore rules only accept [a-zA-Z0-9_-] ids; AI-generated ids may contain anything. */
const safeId = (raw: string | undefined | null, prefix: string) => {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  return cleaned.length > 0 ? cleaned : newId(prefix);
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

/** Offline-safe avatar (no third-party avatar service needed). */
const avatarFor = (name: string) => {
  const palette = ['#10b981', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9'];
  const color = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#0f172a">${initialsOf(name)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const safeLocalGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeLocalSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};
const safeLocalRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
};

const byCreatedAsc = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  (a.createdAt || '').localeCompare(b.createdAt || '');
const byCreatedDesc = (a: { createdAt?: string }, b: { createdAt?: string }) =>
  (b.createdAt || '').localeCompare(a.createdAt || '');

const EMPTY_PROJECT: Project = {
  id: '',
  name: 'Loading…',
  description: '',
  members: [],
  createdAt: new Date().toISOString(),
};

const profileFromAuth = (u: FirebaseUser): User => {
  const name = u.displayName || u.email?.split('@')[0] || 'Teammate';
  return {
    id: u.uid,
    name,
    email: u.email || '',
    avatar: u.photoURL || avatarFor(name),
    role: 'Team Member',
    skills: [],
    initials: initialsOf(name),
  };
};

// Load locally persisted demo-mode state (migrating the old v2 format if present)
const loadStoredData = () => {
  if (IS_CLOUD) return null;
  try {
    const stored = safeLocalGet(STORAGE_KEY) || safeLocalGet(OLD_NAME_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    const legacy = safeLocalGet(LEGACY_STORAGE_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      return {
        ...old,
        localUserId: old.currentUser?.id,
        analyses: old.currentAnalysis && old.activeChannelId ? { [old.activeChannelId]: old.currentAnalysis } : {},
      };
    }
  } catch (e) {
    console.warn('Failed to load stored state:', e);
  }
  return null;
};

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialStored = useMemo(loadStoredData, []);

  // ---- core workspace state (shared by both modes) ----
  const [teamMembers, setTeamMembers] = useState<User[]>(
    IS_CLOUD ? [] : initialStored?.teamMembers || SAMPLE_USERS
  );
  const [localUserId, setLocalUserId] = useState<string>(initialStored?.localUserId || CURRENT_USER.id);
  const [project, setProject] = useState<Project>(IS_CLOUD ? EMPTY_PROJECT : initialStored?.project || SAMPLE_PROJECT);
  const [channels, setChannels] = useState<Channel[]>(IS_CLOUD ? [] : initialStored?.channels || SAMPLE_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>(
    IS_CLOUD ? '' : initialStored?.activeChannelId || SAMPLE_CHANNELS[0].id
  );
  const [messages, setMessages] = useState<Record<string, Message[]>>(
    IS_CLOUD ? {} : initialStored?.messages || SAMPLE_MESSAGES
  );
  const [tasks, setTasks] = useState<Task[]>(IS_CLOUD ? [] : initialStored?.tasks || INITIAL_TASKS);
  const [decisions, setDecisions] = useState<Decision[]>(
    IS_CLOUD ? [] : initialStored?.decisions || INITIAL_DECISIONS
  );
  /** AI analysis results are stored per channel, so switching channels shows that channel's review. */
  const [analyses, setAnalyses] = useState<Record<string, AIAnalysisResult>>(initialStored?.analyses || {});
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const jumpToMessage = (messageId: string, channelId?: string) => {
    const targetChannel =
      channelId ||
      Object.keys(messages).find((ch) => (messages[ch] || []).some((m) => m.id === messageId));
    if (!targetChannel) return; // message deleted or not found: do nothing
    setSearchQuery(''); // an active search could hide the message
    setActiveChannelId(targetChannel);
    setActiveTab('channels');
    setHighlightedMessageId(messageId);
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // ---- cloud-only state ----
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!IS_CLOUD);
  const [cloudProjectId, setCloudProjectId] = useState<string | null>(null);
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [myProjects, setMyProjects] = useState<ProjectSummary[]>([]);
  const [, setPresenceTick] = useState(0);
  const permissionToastShown = useRef(false);

  const currentUser: User = useMemo(() => {
    if (IS_CLOUD) {
      if (!authUser) return CURRENT_USER;
      return teamMembers.find((m) => m.id === authUser.uid) || profileFromAuth(authUser);
    }
    return teamMembers.find((m) => m.id === localUserId) || teamMembers[0] || CURRENT_USER;
  }, [authUser, teamMembers, localUserId]);

  const currentAnalysis = analyses[activeChannelId] || null;

  const workspaceReady = IS_CLOUD
    ? Boolean(authUser && cloudProjectId && projectLoaded && channelsLoaded)
    : true;

  const inviteLink =
    IS_CLOUD && cloudProjectId
      ? `${window.location.origin}${window.location.pathname}?project=${cloudProjectId}`
      : null;

  // ---------- toasts ----------
  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const reportCloudError = (context: string) => (err: any) => {
    console.warn(`Firestore ${context}:`, err);
    const msg =
      err?.code === 'permission-denied'
        ? 'Firestore denied access. Make sure firestore.rules from this project are deployed.'
        : err?.message || String(err);
    setCloudError(msg);
    if (!permissionToastShown.current) {
      permissionToastShown.current = true;
      addToast({ type: 'error', title: 'Sync problem', message: msg });
    }
  };

  // ---------- local persistence (demo mode only) ----------
  useEffect(() => {
    if (IS_CLOUD) return;
    try {
      safeLocalSet(
        STORAGE_KEY,
        JSON.stringify({ localUserId, teamMembers, project, channels, activeChannelId, messages, tasks, decisions, analyses })
      );
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }, [localUserId, teamMembers, project, channels, activeChannelId, messages, tasks, decisions, analyses]);

  // ---------- cloud: auth ----------
  useEffect(() => {
    if (!IS_CLOUD || !auth) return;
    return onAuthStateChanged(auth, (u) => {
      if (u && !isAllowedEmail(u.email)) {
        signOut(auth!);
        addToast({
          type: 'error',
          title: 'Access denied',
          message: `Sirf ${ALLOWED_EMAIL_DOMAINS.map((d) => '@' + d).join(', ')} email wale log Sermona use kar sakte hain.`,
        });
        return;
      }
      setAuthUser(u);
      setAuthReady(true);
      if (!u) {
        setCloudProjectId(null);
        setMyProjects([]);
      }
    });
  }, []);

  // ---------- cloud: create / join / pick a project after sign-in ----------
  const createCloudProject = async (
    user: FirebaseUser,
    name: string,
    tagline: string,
    description: string,
    deadline: string | null
  ): Promise<string> => {
    const now = new Date().toISOString();
    const pid = newId('proj');
    const newProj: Project = {
      id: pid,
      name,
      tagline: tagline || 'AI-assisted collaborative initiative',
      description,
      ownerId: user.uid,
      members: [user.uid],
      createdAt: now,
      tags: [],
      ...(deadline ? { deadline } : {}),
    };
    await setDoc(doc(db!, 'projects', pid), newProj);
    const general: Channel = {
      id: newId('chan'),
      projectId: pid,
      name: 'general',
      topic: 'Welcome and project onboarding',
      description: 'Welcome and project onboarding',
      createdAt: now,
    };
    await setDoc(doc(db!, `projects/${pid}/channels`, general.id), general);
    return pid;
  };

  /** True if the user can read the project, joining it first if needed (the project id acts as the invite token). */
  const ensureMembership = async (projectId: string, uid: string): Promise<boolean> => {
    if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) return false;
    const ref = doc(db!, 'projects', projectId);
    try {
      const snap = await getDoc(ref);
      return snap.exists();
    } catch {
      // Not a member yet (permission denied) → try to join
    }
    try {
      await updateDoc(ref, { members: arrayUnion(uid) });
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!IS_CLOUD || !db || !authUser) return;
    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const invited = params.get('project');
        const remembered = safeLocalGet(LAST_PROJECT_KEY) || safeLocalGet(OLD_LAST_PROJECT_KEY);

        let chosen: string | null = null;
        if (invited && (await ensureMembership(invited, authUser.uid))) {
          chosen = invited;
          addToast({ type: 'success', title: 'Joined project', message: 'You were added to the shared workspace.' });
        } else if (invited) {
          addToast({
            type: 'warning',
            title: 'Invite link not valid',
            message: 'That project could not be found or joined.',
          });
        }
        if (invited) {
          params.delete('project');
          const qs = params.toString();
          window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
        }

        if (!chosen && remembered && (await ensureMembership(remembered, authUser.uid))) {
          chosen = remembered;
        }
        if (!chosen) {
          const snap = await getDocs(
            query(collection(db!, 'projects'), where('members', 'array-contains', authUser.uid), limit(1))
          );
          if (!snap.empty) chosen = snap.docs[0].id;
        }
        if (!chosen) {
          chosen = await createCloudProject(authUser, 'My First Project', 'Talk → Organize → Execute', '', null);
        }
        if (!cancelled) setCloudProjectId(chosen);
      } catch (err) {
        reportCloudError('project setup')(err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  // ---------- cloud: list my projects (for the workspace switcher) ----------
  useEffect(() => {
    if (!IS_CLOUD || !db || !authUser) return;
    return onSnapshot(
      query(collection(db, 'projects'), where('members', 'array-contains', authUser.uid)),
      (snap) =>
        setMyProjects(
          snap.docs
            .map((d) => d.data() as Project)
            .sort(byCreatedDesc)
            .map((p) => ({ id: p.id, name: p.name, tagline: p.tagline }))
        ),
      reportCloudError('project list')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  // ---------- cloud: my member profile + presence heartbeat ----------
  useEffect(() => {
    if (!IS_CLOUD || !db || !authUser || !cloudProjectId) return;
    const ref = doc(db, `projects/${cloudProjectId}/members`, authUser.uid);
    const base = profileFromAuth(authUser);

    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          // Keep the role/skills they set; refresh identity fields from their Google account
          await setDoc(
            ref,
            { id: base.id, name: base.name, email: base.email, avatar: base.avatar, initials: base.initials, lastSeen: new Date().toISOString() },
            { merge: true }
          );
        } else {
          await setDoc(ref, { ...base, lastSeen: new Date().toISOString() });
        }
      } catch (err) {
        reportCloudError('profile')(err);
      }
    })();

    const beat = setInterval(() => {
      setDoc(ref, { lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});
      setPresenceTick((t) => t + 1); // re-evaluate everyone's online state
    }, HEARTBEAT_MS);
    return () => clearInterval(beat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, cloudProjectId]);

  // ---------- cloud: live listeners for the active project ----------
  useEffect(() => {
    if (!IS_CLOUD || !db || !cloudProjectId) return;
    const pid = cloudProjectId;
    safeLocalSet(LAST_PROJECT_KEY, pid);
    setProjectLoaded(false);
    setChannelsLoaded(false);
    setCloudError(null);
    permissionToastShown.current = false;

    const unsubs = [
      onSnapshot(
        doc(db, 'projects', pid),
        (snap) => {
          if (snap.exists()) {
            setProject(snap.data() as Project);
            setProjectLoaded(true);
          }
        },
        reportCloudError('project')
      ),
      onSnapshot(
        collection(db, `projects/${pid}/channels`),
        (snap) => {
          setChannels(snap.docs.map((d) => d.data() as Channel).sort(byCreatedAsc));
          setChannelsLoaded(true);
        },
        reportCloudError('channels')
      ),
      onSnapshot(
        collection(db, `projects/${pid}/tasks`),
        (snap) => setTasks(snap.docs.map((d) => d.data() as Task).sort(byCreatedDesc)),
        reportCloudError('tasks')
      ),
      onSnapshot(
        collection(db, `projects/${pid}/decisions`),
        (snap) => setDecisions(snap.docs.map((d) => d.data() as Decision).sort(byCreatedDesc)),
        reportCloudError('decisions')
      ),
      onSnapshot(
        collection(db, `projects/${pid}/members`),
        // Hide anyone whose email is not from an allowed domain (e.g. accounts that
        // joined before the domain restriction was added)
        (snap) => setTeamMembers(snap.docs.map((d) => d.data() as User).filter((m) => isAllowedEmail(m.email))),
        reportCloudError('members')
      ),
    ];
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudProjectId]);

  // Keep the active channel valid as channels load/change
  useEffect(() => {
    if (channels.length > 0 && !channels.some((c) => c.id === activeChannelId)) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // ---------- cloud: live messages + analysis for the active channel ----------
  useEffect(() => {
    if (!IS_CLOUD || !db || !cloudProjectId || !activeChannelId) return;
    const pid = cloudProjectId;
    const ch = activeChannelId;

    const unsubMessages = onSnapshot(
      query(collection(db, `projects/${pid}/channels/${ch}/messages`), orderBy('timestamp'), limitToLast(500)),
      (snap) => setMessages((prev) => ({ ...prev, [ch]: snap.docs.map((d) => d.data() as Message) })),
      reportCloudError('messages')
    );
    const unsubAnalysis = onSnapshot(
      doc(db, `projects/${pid}/analyses`, ch),
      (snap) =>
        setAnalyses((prev) => {
          const next = { ...prev };
          if (snap.exists()) next[ch] = snap.data() as AIAnalysisResult;
          else delete next[ch];
          return next;
        }),
      reportCloudError('analysis')
    );
    return () => {
      unsubMessages();
      unsubAnalysis();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudProjectId, activeChannelId]);

  // Online state derived from lastSeen (cloud) — recomputed on every heartbeat tick
  const teamMembersWithPresence: User[] = IS_CLOUD
    ? teamMembers.map((m) => ({
        ...m,
        online: m.lastSeen ? Date.now() - new Date(m.lastSeen).getTime() < ONLINE_WINDOW_MS : false,
      }))
    : teamMembers;

  // ---------- write helpers ----------
  const projectPath = () => (IS_CLOUD ? cloudProjectId : project.id);

  const syncToFirestore = async (collectionPath: string, docId: string, data: any) => {
    if (IS_CLOUD && db && cloudProjectId) {
      try {
        await setDoc(doc(db, collectionPath, docId), data, { merge: true });
      } catch (err) {
        reportCloudError(`write ${collectionPath}`)(err);
      }
    }
  };

  const setAnalysisFor = (channelId: string, next: AIAnalysisResult | null) => {
    setAnalyses((prev) => {
      const copy = { ...prev };
      if (next) copy[channelId] = next;
      else delete copy[channelId];
      return copy;
    });
    if (IS_CLOUD && db && cloudProjectId && channelId) {
      const ref = doc(db, `projects/${cloudProjectId}/analyses`, channelId);
      // JSON round-trip strips undefined values; full overwrite so removed items disappear
      (next ? setDoc(ref, JSON.parse(JSON.stringify(next))) : deleteDoc(ref)).catch(reportCloudError('analysis write'));
    }
  };
  const setCurrentAnalysis = (next: AIAnalysisResult | null) => setAnalysisFor(activeChannelId, next);

  // ---------- auth actions ----------
  const signInWithGoogle = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Sign-in failed', message: err?.message || 'Could not sign in' });
    }
  };

  const signOutUser = async () => {
    if (!auth) return;
    await signOut(auth);
    setProject(EMPTY_PROJECT);
    setChannels([]);
    setMessages({});
    setTasks([]);
    setDecisions([]);
    setAnalyses({});
    setTeamMembers([]);
    setActiveChannelId('');
  };

  const switchProject = (projectId: string) => {
    if (!IS_CLOUD || projectId === cloudProjectId) return;
    setMessages({});
    setAnalyses({});
    setTasks([]);
    setDecisions([]);
    setChannels([]);
    setTeamMembers([]);
    setActiveChannelId('');
    setCloudProjectId(projectId);
  };

  /** Join another workspace from an invite link (…?project=ID) or a bare project id. */
  const joinProject = async (inviteLinkOrId: string): Promise<boolean> => {
    if (!IS_CLOUD || !db || !authUser) {
      addToast({
        type: 'info',
        title: 'Demo mode',
        message: 'Joining workspaces needs Firebase. Add firebase-applet-config.json to enable it.',
      });
      return false;
    }
    const raw = inviteLinkOrId.trim();
    const fromLink = raw.match(/[?&]project=([A-Za-z0-9_-]+)/);
    const id = fromLink ? fromLink[1] : raw;
    if (!/^[A-Za-z0-9_-]{3,128}$/.test(id)) {
      addToast({ type: 'warning', title: 'Invalid invite', message: 'Paste the full invite link you received.' });
      return false;
    }
    if (id === cloudProjectId) {
      addToast({ type: 'info', title: 'Already here', message: 'You are already in this workspace.' });
      return true;
    }
    const ok = await ensureMembership(id, authUser.uid);
    if (ok) {
      switchProject(id);
      addToast({ type: 'success', title: 'Joined workspace', message: 'Welcome! You can now chat in its channels.' });
    } else {
      addToast({ type: 'error', title: 'Could not join', message: 'That workspace was not found, or the link is wrong.' });
    }
    return ok;
  };

  const setCurrentUser = (user: User) => {
    if (IS_CLOUD) return; // in cloud mode you are whoever you signed in as
    setLocalUserId(user.id);
  };

  const updateMyProfile = (updates: { role?: string; skills?: string[] }) => {
    const clean = {
      ...(updates.role !== undefined ? { role: updates.role.trim() || 'Team Member' } : {}),
      ...(updates.skills !== undefined
        ? { skills: Array.from(new Set(updates.skills.map((s) => s.trim()).filter(Boolean))).slice(0, 30) }
        : {}),
    };
    setTeamMembers((prev) => prev.map((m) => (m.id === currentUser.id ? { ...m, ...clean } : m)));
    if (IS_CLOUD && cloudProjectId) {
      syncToFirestore(`projects/${cloudProjectId}/members`, currentUser.id, { id: currentUser.id, ...clean });
    }
    addToast({ type: 'success', title: 'Profile updated', message: 'Your role and skills were saved.' });
  };

  // ---------- messaging ----------
  const sendMessage = (content: string, codeSnippet?: { language: string; code: string }) => {
    if (!content.trim() && !codeSnippet) return;
    if (!activeChannelId) return;

    const newMessage: Message = {
      id: newId('msg'),
      channelId: activeChannelId,
      projectId: projectPath() || project.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: currentUser.role,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      ...(codeSnippet ? { codeSnippet } : {}),
      reactions: {},
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));

    syncToFirestore(`projects/${cloudProjectId}/channels/${activeChannelId}/messages`, newMessage.id, newMessage);
  };

  const addReaction = (messageId: string, emoji: string) => {
    const msg = (messages[activeChannelId] || []).find((m) => m.id === messageId);
    if (!msg) return;
    const currentReactions = msg.reactions || {};
    const userList = currentReactions[emoji] || [];
    const nextUsers = userList.includes(currentUser.id)
      ? userList.filter((uid) => uid !== currentUser.id)
      : [...userList, currentUser.id];
    const nextReactions = { ...currentReactions };
    if (nextUsers.length > 0) nextReactions[emoji] = nextUsers;
    else delete nextReactions[emoji];

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: (prev[activeChannelId] || []).map((m) =>
        m.id === messageId ? { ...m, reactions: nextReactions } : m
      ),
    }));

    if (IS_CLOUD && db && cloudProjectId) {
      updateDoc(doc(db, `projects/${cloudProjectId}/channels/${activeChannelId}/messages`, messageId), {
        reactions: nextReactions,
      }).catch(reportCloudError('reaction'));
    }
  };

  // ---------- AI analysis ----------
  const analyzeCurrentChannel = async () => {
    const channelId = activeChannelId; // capture: user may switch channels while this runs
    const channel = channels.find((c) => c.id === channelId);
    const channelMsgs = messages[channelId] || [];

    if (channelMsgs.length === 0) {
      addToast({
        type: 'warning',
        title: 'No messages to analyze',
        message: 'Add some team messages to this channel first before running analysis.',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          channelId,
          channelName: channel?.name || 'general',
          messages: channelMsgs.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.senderRole,
            content: m.content,
            timestamp: m.timestamp,
          })),
          workspaceMembers: teamMembers.map((tm) => ({
            id: tm.id,
            name: tm.name,
            role: tm.role,
            skills: tm.skills || [],
          })),
          existingTasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
          existingDecisions: decisions.map((d) => ({ id: d.id, title: d.title, status: d.status })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data: AIAnalysisResult = await response.json();
      setAnalysisFor(channelId, { ...data, channelId });

      addToast({
        type: data.mode === 'basic' ? 'warning' : 'success',
        title: data.mode === 'basic' ? 'Basic analysis (no AI)' : 'Intelligence generated',
        message: `Extracted ${data.decisions.length} decisions, ${data.proposedTasks.length} tasks, and ${data.unresolvedQuestions.length} open questions from #${channel?.name}.`,
      });
    } catch (err: any) {
      console.error('Conversation analysis error:', err);
      setAnalysisError(err.message || 'Failed to complete conversation analysis');
      addToast({
        type: 'error',
        title: 'Analysis failed',
        message: err.message || 'Unable to reach the analysis server',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- PROPOSED TASKS REVIEW WORKFLOW (Approve, Edit, Reject) ---

  const buildTaskFromSuggestion = (t: SuggestedTask): Task => {
    const assignedMember = teamMembers.find(
      (m) =>
        m.id === t.assigneeId ||
        (t.suggestedAssignee ? m.name.toLowerCase().includes(t.suggestedAssignee.toLowerCase()) : false)
    );
    const now = new Date().toISOString();
    return {
      id: newId('task'),
      projectId: projectPath() || project.id,
      title: t.title,
      description: t.description,
      assigneeId: assignedMember ? assignedMember.id : null,
      assigneeName: assignedMember ? assignedMember.name : t.suggestedAssignee || null,
      assigneeAvatar: assignedMember ? assignedMember.avatar : null,
      deadline: t.deadline || null,
      priority: t.priority,
      status: 'todo',
      source: 'ai_extracted',
      sourceMessageIds: t.sourceMessageIds || [],
      evidenceSnippet: t.evidenceSnippet,
      confidence: t.confidence,
      completed: false,
      createdAt: now,
      updatedAt: now,
      tags: ['AI-Validated'],
      recommendedSkills: t.recommendedSkills || [],
    };
  };

  const approveProposedTask = (taskId: string) => {
    if (!currentAnalysis) return;
    const task = currentAnalysis.proposedTasks.find((t) => (t.taskId || t.id) === taskId);
    if (!task) return;

    const newTask = buildTaskFromSuggestion(task);
    setTasks((prev) => [newTask, ...prev]);
    syncToFirestore(`projects/${cloudProjectId}/tasks`, newTask.id, newTask);

    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.filter((t) => (t.taskId || t.id) !== taskId),
    });

    addToast({
      type: 'success',
      title: 'Task Approved',
      message: `"${newTask.title}" added to project tasks board.`,
    });
  };

  const rejectProposedTask = (taskId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.filter((t) => (t.taskId || t.id) !== taskId),
    });
    addToast({ type: 'info', title: 'Task Rejected', message: 'Proposed task dismissed.' });
  };

  const editProposedTask = (taskId: string, updates: Partial<SuggestedTask>) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.map((t) =>
        (t.taskId || t.id) === taskId ? { ...t, ...updates } : t
      ),
    });
  };

  const toggleApproveSuggestedTask = (suggestedTaskId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.map((t) =>
        (t.taskId || t.id) === suggestedTaskId ? { ...t, approved: !t.approved } : t
      ),
    });
  };

  const commitApprovedTasks = () => {
    if (!currentAnalysis) return;
    const approvedList = currentAnalysis.proposedTasks.filter((t) => t.approved);
    if (approvedList.length === 0) {
      addToast({
        type: 'info',
        title: 'No tasks approved',
        message: 'Select the approval checkbox or click Approve on the tasks you wish to add to the project board.',
      });
      return;
    }

    const newTasks = approvedList.map(buildTaskFromSuggestion);
    setTasks((prev) => [...newTasks, ...prev]);
    newTasks.forEach((t) => syncToFirestore(`projects/${cloudProjectId}/tasks`, t.id, t));

    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.filter((t) => !t.approved),
    });

    addToast({
      type: 'success',
      title: 'Tasks added to project',
      message: `Successfully validated and added ${newTasks.length} task(s) to the project board.`,
    });
  };

  // --- DECISIONS REVIEW WORKFLOW (Confirm, Edit, Supersede) ---

  const confirmDecision = (decisionId: string) => {
    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        decisions: currentAnalysis.decisions.map((d) =>
          (d.decisionId || d.id) === decisionId ? { ...d, status: 'confirmed', confirmedBy: currentUser.name } : d
        ),
      });
    }

    const existing = decisions.find((d) => (d.decisionId || d.id) === decisionId);
    if (existing) {
      setDecisions((prev) =>
        prev.map((d) =>
          (d.decisionId || d.id) === decisionId ? { ...d, status: 'confirmed', confirmedBy: currentUser.name } : d
        )
      );
      syncToFirestore(`projects/${cloudProjectId}/decisions`, existing.id, {
        status: 'confirmed',
        confirmedBy: currentUser.name,
      });
    } else if (currentAnalysis) {
      const detected = currentAnalysis.decisions.find((d) => (d.decisionId || d.id) === decisionId);
      if (detected) {
        const id = safeId(detected.decisionId || detected.id, 'dec');
        const newDec: Decision = {
          id,
          decisionId: detected.decisionId || detected.id,
          projectId: projectPath() || project.id,
          channelId: activeChannelId,
          title: detected.title,
          description: detected.description,
          status: 'confirmed',
          sourceMessageIds: detected.sourceMessageIds || [],
          evidenceSnippet: detected.evidenceSnippet,
          confidence: detected.confidence,
          confirmedBy: currentUser.name,
          createdAt: new Date().toISOString(),
        };
        setDecisions((prev) => [newDec, ...prev]);
        syncToFirestore(`projects/${cloudProjectId}/decisions`, newDec.id, newDec);
      }
    }

    addToast({
      type: 'success',
      title: 'Decision Confirmed',
      message: `Decision officially verified by ${currentUser.name}.`,
    });
  };

  const editDecision = (decisionId: string, updates: Partial<Decision | DetectedDecision>) => {
    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        decisions: currentAnalysis.decisions.map((d) =>
          (d.decisionId || d.id) === decisionId ? { ...d, ...updates } : d
        ),
      });
    }
    setDecisions((prev) => prev.map((d) => ((d.decisionId || d.id) === decisionId ? { ...d, ...updates } : d)));
    const existing = decisions.find((d) => (d.decisionId || d.id) === decisionId);
    if (existing) syncToFirestore(`projects/${cloudProjectId}/decisions`, existing.id, updates);
  };

  const supersedeDecision = (decisionId: string) => {
    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        decisions: currentAnalysis.decisions.map((d) =>
          (d.decisionId || d.id) === decisionId ? { ...d, status: 'superseded' } : d
        ),
      });
    }
    setDecisions((prev) =>
      prev.map((d) => ((d.decisionId || d.id) === decisionId ? { ...d, status: 'superseded' } : d))
    );
    const existing = decisions.find((d) => (d.decisionId || d.id) === decisionId);
    if (existing) syncToFirestore(`projects/${cloudProjectId}/decisions`, existing.id, { status: 'superseded' });
    addToast({
      type: 'warning',
      title: 'Decision Superseded',
      message: 'Decision marked as superseded by new agreements.',
    });
  };

  // --- UNRESOLVED QUESTIONS WORKFLOW (Assign Owner, Mark Resolved, Keep Open) ---

  const assignQuestionOwner = (questionId: string, ownerId: string, ownerName: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      unresolvedQuestions: currentAnalysis.unresolvedQuestions.map((q) =>
        q.id === questionId ? { ...q, ownerId, ownerName, status: 'in_progress' } : q
      ),
    });
    addToast({ type: 'success', title: 'Owner Assigned', message: `${ownerName} assigned to address question.` });
  };

  const resolveQuestion = (questionId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      unresolvedQuestions: currentAnalysis.unresolvedQuestions.map((q) =>
        q.id === questionId ? { ...q, status: 'resolved' } : q
      ),
    });
    addToast({ type: 'info', title: 'Question Resolved', message: 'Marked as resolved.' });
  };

  const keepQuestionOpen = (questionId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      unresolvedQuestions: currentAnalysis.unresolvedQuestions.map((q) =>
        q.id === questionId ? { ...q, status: 'unresolved' } : q
      ),
    });
  };

  // --- STANDARD TASK MANAGEMENT CRUD ---

  const createTask = (taskData: Partial<Task>) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: newId('task'),
      projectId: projectPath() || project.id,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      assigneeId: taskData.assigneeId || null,
      assigneeName: taskData.assigneeName || null,
      assigneeAvatar: taskData.assigneeAvatar || null,
      deadline: taskData.deadline || null,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'todo',
      source: 'manual',
      sourceMessageIds: [],
      completed: taskData.status === 'completed',
      createdAt: now,
      updatedAt: now,
      tags: taskData.tags || ['Engineering'],
      recommendedSkills: taskData.recommendedSkills || [],
    };

    setTasks((prev) => [newTask, ...prev]);
    syncToFirestore(`projects/${cloudProjectId}/tasks`, newTask.id, newTask);

    addToast({ type: 'success', title: 'Task created', message: `"${newTask.title}" has been created.` });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const before = tasks.find((t) => t.id === taskId);
    if (updates.status === 'completed' && before && !before.completed && before.status !== 'completed') {
      fireConfetti(); // 🎉
    }
    const stamped: Partial<Task> = { ...updates, updatedAt: new Date().toISOString() };
    // Keep the `completed` flag consistent with the status column
    if (updates.status !== undefined) stamped.completed = updates.status === 'completed';
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...stamped } : t)));
    syncToFirestore(`projects/${cloudProjectId}/tasks`, taskId, stamped);
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (IS_CLOUD && db && cloudProjectId) {
      deleteDoc(doc(db, `projects/${cloudProjectId}/tasks`, taskId)).catch(reportCloudError('delete task'));
    }
    addToast({ type: 'info', title: 'Task deleted', message: 'The task has been removed.' });
  };

  const toggleTaskComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTask(taskId, { status: task.completed ? 'todo' : 'completed' });
  };

  // --- DECISIONS MANAGEMENT ---

  const createDecision = (decisionData: Partial<Decision>) => {
    const id = newId('dec');
    const newDecision: Decision = {
      id,
      decisionId: id,
      projectId: projectPath() || project.id,
      channelId: activeChannelId,
      title: decisionData.title || 'Untitled Decision',
      description: decisionData.description || decisionData.rationale || '',
      status: decisionData.status || 'confirmed',
      sourceMessageIds: decisionData.sourceMessageIds || [],
      evidenceSnippet: decisionData.evidenceSnippet || decisionData.evidence || 'Logged manually by team',
      confidence: 1.0,
      confirmedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    setDecisions((prev) => [newDecision, ...prev]);
    syncToFirestore(`projects/${cloudProjectId}/decisions`, newDecision.id, newDecision);

    addToast({
      type: 'success',
      title: 'Decision recorded',
      message: `"${newDecision.title}" logged to project decisions.`,
    });
  };

  // --- CHANNEL & PROJECT CREATION ---

  // --- DELETING MESSAGES & CHANNELS ---
  // Firestore rules allow: a message → its sender or the workspace owner; a channel → the owner only.

  const isProjectOwner = IS_CLOUD ? Boolean(authUser && project.ownerId === authUser.uid) : true;

  const canDeleteMessage = (message: Message) =>
    !IS_CLOUD || message.senderId === currentUser.id || isProjectOwner;

  const deleteMessage = (messageId: string) => {
    const ch = activeChannelId;
    const msg = (messages[ch] || []).find((m) => m.id === messageId);
    if (!msg || !canDeleteMessage(msg)) return;
    setMessages((prev) => ({ ...prev, [ch]: (prev[ch] || []).filter((m) => m.id !== messageId) }));
    if (IS_CLOUD && db && cloudProjectId) {
      deleteDoc(doc(db, `projects/${cloudProjectId}/channels/${ch}/messages`, messageId)).catch(
        reportCloudError('delete message')
      );
    }
    addToast({ type: 'info', title: 'Message deleted', message: 'The message was removed.' });
  };

  const deleteChannel = async (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    if (channels.length <= 1) {
      addToast({ type: 'warning', title: "Can't delete", message: 'A workspace needs at least one channel.' });
      return;
    }
    if (!isProjectOwner) {
      addToast({ type: 'warning', title: 'Owner only', message: 'Only the workspace owner can delete channels.' });
      return;
    }

    // Update the screen straight away
    const remaining = channels.filter((c) => c.id !== channelId);
    setChannels(remaining);
    setMessages((prev) => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
    setAnalyses((prev) => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
    if (activeChannelId === channelId) setActiveChannelId(remaining[0].id);

    if (IS_CLOUD && db && cloudProjectId) {
      try {
        // Firestore does not delete sub-collections automatically, so remove the messages first
        const base = `projects/${cloudProjectId}/channels/${channelId}`;
        const snap = await getDocs(collection(db, `${base}/messages`));
        for (let i = 0; i < snap.docs.length; i += 450) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        await deleteDoc(doc(db, `projects/${cloudProjectId}/analyses`, channelId)).catch(() => {});
        await deleteDoc(doc(db, `projects/${cloudProjectId}/channels`, channelId));
      } catch (err) {
        reportCloudError('delete channel')(err);
      }
    }
    addToast({ type: 'info', title: 'Channel deleted', message: `#${channel.name} and its messages were removed.` });
  };

  const removeMember = async (memberId: string) => {
    if (!isProjectOwner) {
      addToast({ type: 'warning', title: 'Owner only', message: 'Only the workspace owner can remove people.' });
      return;
    }
    if (memberId === currentUser.id) {
      addToast({ type: 'warning', title: "Can't remove yourself", message: 'You own this workspace.' });
      return;
    }
    const member = teamMembers.find((m) => m.id === memberId);
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (IS_CLOUD && db && cloudProjectId) {
      try {
        // Take them off the project's member list (this is what grants access) …
        await updateDoc(doc(db, 'projects', cloudProjectId), { members: arrayRemove(memberId) });
        // … and delete their profile in this workspace
        await deleteDoc(doc(db, `projects/${cloudProjectId}/members`, memberId));
      } catch (err) {
        reportCloudError('remove member')(err);
        return;
      }
    }
    addToast({ type: 'info', title: 'Removed from squad', message: `${member?.name || 'Member'} no longer has access.` });
  };

  const createChannel = (name: string, topic: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newChannel: Channel = {
      id: newId('chan'),
      projectId: projectPath() || project.id,
      name: cleanName,
      topic: topic || 'New discussion topic',
      description: topic || 'New discussion topic',
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };

    setChannels((prev) => [...prev, newChannel]);
    setActiveChannelId(newChannel.id);
    syncToFirestore(`projects/${cloudProjectId}/channels`, newChannel.id, newChannel);

    addToast({ type: 'success', title: 'Channel created', message: `#${cleanName} is ready for conversation.` });
  };

  const createNewProject = (name: string, tagline: string, description: string, deadline?: string | null) => {
    if (IS_CLOUD) {
      if (!authUser || !db) return;
      createCloudProject(authUser, name, tagline, description, deadline || null)
        .then((pid) => {
          switchProject(pid);
          addToast({ type: 'success', title: 'Project created', message: `Switched to workspace: ${name}` });
        })
        .catch(reportCloudError('create project'));
      return;
    }

    const newProj: Project = {
      id: newId('proj'),
      name,
      tagline: tagline || 'AI-assisted collaborative initiative',
      description,
      ownerId: currentUser.id,
      members: teamMembers.map((m) => m.id),
      createdAt: new Date().toISOString(),
      ...(deadline ? { deadline } : {}),
      tags: ['Active'],
    };

    const defaultChannel: Channel = {
      id: newId('chan'),
      projectId: newProj.id,
      name: 'general',
      topic: 'Welcome and project onboarding',
      description: 'Welcome and project onboarding',
      createdAt: new Date().toISOString(),
    };

    setProject(newProj);
    setChannels([defaultChannel]);
    setActiveChannelId(defaultChannel.id);
    setMessages({ [defaultChannel.id]: [] });
    setTasks([]);
    setDecisions([]);
    setAnalyses({});

    addToast({ type: 'success', title: 'Project created', message: `Switched to workspace: ${name}` });
  };

  const resetToDemoData = () => {
    if (IS_CLOUD) return; // never wipe a shared cloud workspace
    safeLocalRemove(STORAGE_KEY);
    safeLocalRemove(OLD_NAME_STORAGE_KEY);
    safeLocalRemove(LEGACY_STORAGE_KEY);
    setLocalUserId(CURRENT_USER.id);
    setTeamMembers(SAMPLE_USERS);
    setProject(SAMPLE_PROJECT);
    setChannels(SAMPLE_CHANNELS);
    setActiveChannelId(SAMPLE_CHANNELS[0].id);
    setMessages(SAMPLE_MESSAGES);
    setTasks(INITIAL_TASKS);
    setDecisions(INITIAL_DECISIONS);
    setAnalyses({});
    setSearchQuery('');
    addToast({
      type: 'info',
      title: 'Reset to demo data',
      message: 'Workspace restored to ML Capstone demonstration state.',
    });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        mode: IS_CLOUD ? 'cloud' : 'local',
        authReady,
        isSignedIn: IS_CLOUD ? Boolean(authUser) : true,
        workspaceReady,
        cloudError,
        signInWithGoogle,
        signOutUser,
        inviteLink,
        myProjects,
        switchProject,
        joinProject,
        allowedEmailDomains: ALLOWED_EMAIL_DOMAINS,
        updateMyProfile,
        currentUser,
        setCurrentUser,
        teamMembers: teamMembersWithPresence,
        project,
        channels,
        activeChannelId,
        setActiveChannelId,
        messages,
        tasks,
        decisions,
        activeTab,
        setActiveTab,
        highlightedMessageId,
        setHighlightedMessageId,
        jumpToMessage,
        searchQuery,
        setSearchQuery,
        currentAnalysis,
        isAnalyzing,
        analysisError,
        firebaseStatus: configStatus,
        toasts,
        dismissToast,
        addToast,
        sendMessage,
        addReaction,
        analyzeCurrentChannel,
        approveProposedTask,
        rejectProposedTask,
        editProposedTask,
        toggleApproveSuggestedTask,
        commitApprovedTasks,
        confirmDecision,
        editDecision,
        supersedeDecision,
        assignQuestionOwner,
        resolveQuestion,
        keepQuestionOpen,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        createDecision,
        createChannel,
        deleteChannel,
        removeMember,
        deleteMessage,
        canDeleteMessage,
        isProjectOwner,
        createNewProject,
        resetToDemoData,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
