import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  User,
  Project,
  Channel,
  ChannelTheme,
  Message,
  Task,
  Decision,
  AIAnalysisResult,
  SuggestedTask,
  DetectedDecision,
  ViewTab,
  Question,
  MessageReply,
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
  getCountFromServer,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { deleteOwnedWorkspace } from '../lib/deleteWorkspace';
import { CHARACTERS } from '../data/channelIdentities';
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
  /** Optional button on the toast (e.g. "Open" a new message) */
  action?: { label: string; run: () => void };
  /** Toasts with the same key replace each other instead of stacking */
  groupKey?: string;
}

/** Message totals for a channel, used by the sidebar flashcard. */
export interface ChannelContributors {
  total: number;
  top: { name: string; count: number } | null;
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
  isChannelGuest: boolean;
  createRecruitInvite: (channelId?: string) => Promise<string | null>;
  myProjects: ProjectSummary[];
  switchProject: (projectId: string) => void;
  joinProject: (inviteLinkOrId: string) => Promise<boolean>;
  allowedEmailDomains: string[];
  setMyChannelCharacter: (theme: ChannelTheme, handle: string) => Promise<void>;
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
    /** Saved AI analysis of every channel (cloud: kept live for all channels) */
  channelAnalyses: Record<string, AIAnalysisResult>;
  /** Total messages + top contributor of a channel, even if it was never opened */
  getChannelContributors: (channelId: string) => Promise<ChannelContributors>;
  isAnalyzing: boolean;
  analysisError: string | null;
  firebaseStatus: FirebaseStatus;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;

  // Actions
  sendMessage: (
    content: string,
    codeSnippet?: { language: string; code: string },
    extras?: { mentions?: string[]; replyTo?: MessageReply }
  ) => void;
  /** New messages per channel that arrived while you were elsewhere (cloud mode) */
  unreadCounts: Record<string, number>;
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
  setChannelTheme: (channelId: string, theme: ChannelTheme | null) => Promise<boolean>;
  deleteChannel: (channelId: string) => Promise<void>;
  /** Owner only: remove someone from this workspace (squad). */
  removeMember: (memberId: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  canDeleteMessage: (message: Message) => boolean;
  /** True if the current user owns this workspace (always true in local demo mode). */
  isProjectOwner: boolean;
  deleteWorkspace: () => Promise<boolean>;
  renameWorkspace: (name: string) => Promise<void>;
  renameChannel: (channelId: string, name: string) => Promise<void>;
  getChannelAdminId: (channel: Channel) => string;
  setChannelAdmin: (channelId: string, adminId: string) => Promise<void>;
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

// ---------- re-analysis merge (keeps the team's review work when analysis is run again) ----------

type Matchable = { sourceMessageIds?: string[] };

const normText = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Same wording, or at least half of the shorter text's words in common. */
const similarText = (a?: string | null, b?: string | null) => {
  const na = normText(a);
  const nb = normText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const A = new Set(na.split(' ').filter((w) => w.length > 2));
  const B = new Set(nb.split(' ').filter((w) => w.length > 2));
  if (A.size === 0 || B.size === 0) return false;
  let common = 0;
  A.forEach((w) => {
    if (B.has(w)) common++;
  });
  return common / Math.min(A.size, B.size) >= 0.5;
};

const sharesSource = (a: Matchable, b: Matchable) =>
  (a.sourceMessageIds || []).some((id) => (b.sourceMessageIds || []).includes(id));

/** Two extracted items are "the same" if the text matches, or they cite the same message and read alike. */
const sameItem = (a: Matchable, aText: string | undefined, b: Matchable, bText: string | undefined) =>
  normText(aText) !== '' &&
  (normText(aText) === normText(bText) || (sharesSource(a, b) && similarText(aText, bText)));

/**
 * New results win, except for items the team already worked on (keepOld):
 * those keep their edits/status, and stay even if the new run didn't find them.
 */
function mergeList<T extends Matchable>(
  oldList: T[],
  newList: T[],
  text: (x: T) => string | undefined,
  keepOld: (x: T) => boolean
): T[] {
  const used = new Set<T>();
  const result: T[] = [];
  newList.forEach((n) => {
    const old = oldList.find((o) => !used.has(o) && sameItem(o, text(o), n, text(n)));
    if (old) used.add(old);
    result.push(old && keepOld(old) ? old : n);
  });
  oldList.forEach((o) => {
    if (!used.has(o) && keepOld(o)) result.push(o);
  });
  return result;
}

const mergeAnalysis = (
  prev: AIAnalysisResult | null,
  next: AIAnalysisResult,
  boardTasks: Task[],
  loggedDecisions: Decision[]
): AIAnalysisResult => {
  const dismissed = prev?.dismissedTasks || [];
  const onBoard = (t: SuggestedTask) => boardTasks.some((b) => sameItem(b, b.title, t, t.title));
  const isDismissed = (t: SuggestedTask) => dismissed.some((d) => sameItem(d, d.title, t, t.title));

  const proposedTasks = mergeList(
    prev?.proposedTasks || [],
    next.proposedTasks.filter((t) => !onBoard(t) && !isDismissed(t)),
    (t) => t.title,
    (t) => Boolean(t.approved || t.edited)
  ).filter((t) => !onBoard(t));

  // A newly found decision that is already in the Decision Log takes the log's id + status
  const withLog = next.decisions.map((d) => {
    const logged = loggedDecisions.find((l) => sameItem(l, l.title, d, d.title));
    if (!logged) return d;
    const id = logged.decisionId || logged.id;
    return { ...d, id, decisionId: id, title: logged.title, description: logged.description, status: logged.status, confirmedBy: logged.confirmedBy };
  });
  const decisions = mergeList(prev?.decisions || [], withLog, (d) => d.title, (d) => d.status !== 'proposed' || Boolean(d.edited));

  const unresolvedQuestions = mergeList<Question>(
    prev?.unresolvedQuestions || [],
    next.unresolvedQuestions,
    (q) => q.question,
    (q) => q.status !== 'unresolved' || Boolean(q.ownerId)
  );

  return { ...next, proposedTasks, decisions, unresolvedQuestions, dismissedTasks: dismissed };
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
  const pendingInviteChannel = useRef<string | null>(null);
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
  const [activeTab, setActiveTab] = useState<ViewTab>('home');
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  /** Which channel holds this message? Checks loaded messages first, then asks Firestore. */
  const findMessageChannel = async (messageId: string): Promise<string | null> => {
    const loaded = Object.keys(messages).find((ch) => (messages[ch] || []).some((m) => m.id === messageId));
    if (loaded) return loaded;
    if (!IS_CLOUD || !db || !cloudProjectId) return null;
    // Message doc id == message id, so one cheap lookup per channel finds it
    const hits = await Promise.all(
      channels.map(async (ch) => {
        try {
          const snap = await getDoc(doc(db!, 'projects', cloudProjectId, 'channels', ch.id, 'messages', messageId));
          return snap.exists() ? ch.id : null;
        } catch {
          return null; // e.g. a channel this user can't read
        }
      })
    );
    return hits.find((id): id is string => Boolean(id)) || null;
  };

  const jumpToMessage = async (messageId: string, channelId?: string) => {
    const known = channelId && channels.some((c) => c.id === channelId) ? channelId : null;
    const targetChannel = known || (await findMessageChannel(messageId));
    if (!targetChannel) {
      addToast({ type: 'warning', title: 'Message not found', message: 'The source message may have been deleted.' });
      return;
    }
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
  const activeChannelAvailable = channels.some((channel) => channel.id === activeChannelId);

  const workspaceReady = IS_CLOUD
    ? Boolean(authUser && projectLoaded && (!cloudProjectId || channelsLoaded))
    : true;

  const isChannelGuest = IS_CLOUD && Boolean(authUser && project.ownerId !== authUser.uid && !project.members.includes(authUser.uid));

  const inviteLink =
    IS_CLOUD && cloudProjectId
      ? `${window.location.origin}${window.location.pathname}?project=${cloudProjectId}`
      : null;

  // ---------- toasts ----------
  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [
      ...prev.filter((t) => !toast.groupKey || t.groupKey !== toast.groupKey).slice(-4),
      { ...toast, id },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.action ? 7000 : 4500);
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
      adminId: user.uid,
      topic: 'Welcome and project onboarding',
      description: 'Welcome and project onboarding',
      createdAt: now,
    };
    await setDoc(doc(db!, `projects/${pid}/channels`, general.id), general);
    return pid;
  };

  const ensureMembership = async (projectId: string, _uid: string): Promise<boolean> => {
    if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) return false;
    try {
      return (await getDoc(doc(db!, 'projects', projectId))).exists();
    } catch {
      return false;
    }
  };

  const acceptRecruitInvite = async (token: string, uid: string): Promise<string | null> => {
    if (!db || !/^[a-zA-Z0-9_-]{3,128}$/.test(token)) return null;
    const invitation = await getDoc(doc(db, 'recruitInvites', token));
    if (!invitation.exists()) return null;
    const invite = invitation.data();
    if (invite.expiresAt <= Date.now()) return null;
    const ref = doc(db, 'projects', invite.projectId);
    let fullMember = false;
    try {
      const snapshot = await getDoc(ref);
      fullMember = snapshot.exists() && (snapshot.data().members.includes(uid) || snapshot.data().ownerId === uid);
    } catch { /* New invitees cannot read the workspace until the batch commits. */ }
    const batch = writeBatch(db);
    batch.set(doc(db, 'projects', invite.projectId, 'joinRequests', uid), { token });
    if (invite.scope === 'workspace') {
      batch.update(ref, { members: arrayUnion(uid), guests: arrayRemove(uid) });
    } else {
      if (!fullMember) batch.update(ref, { guests: arrayUnion(uid) });
      batch.update(doc(db, 'projects', invite.projectId, 'channels', invite.channelId), {
        members: arrayUnion(uid),
      });
    }
    await batch.commit();
    if (invite.scope === 'channel') {
      pendingInviteChannel.current = invite.channelId;
      setActiveChannelId(invite.channelId);
    }
    return invite.projectId;
  };

  const createRecruitInvite = async (channelId?: string): Promise<string | null> => {
    if (!IS_CLOUD || !db || !cloudProjectId || !authUser) {
      addToast({ type: 'info', title: 'Firebase required', message: 'Recruit links need a connected workspace.' });
      return null;
    }
    const channel = channels.find((entry) => entry.id === channelId);
    if (channelId ? !channel || (getChannelAdminId(channel) !== authUser.uid && project.ownerId !== authUser.uid) : project.ownerId !== authUser.uid) {
      throw new Error(channelId ? 'Only this channel’s admin can create its recruit link.' : 'Only the workspace owner can create a workspace invite.');
    }
    try {
      const ref = doc(collection(db, 'recruitInvites'));
      await setDoc(ref, {
        projectId: cloudProjectId, channelId: channelId || null,
        scope: channelId ? 'channel' : 'workspace', createdBy: authUser.uid,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      return `${window.location.origin}${window.location.pathname}?invite=${ref.id}`;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'permission-denied') {
        throw new Error('Firebase blocked invite creation. Publish the updated firestore.rules in the correct Firebase project and database, then try again.');
      }
      throw new Error('Invite creation failed (' + (code || 'connection error') + '). Check your connection and retry.');
    }
  };

  useEffect(() => {
    if (!IS_CLOUD || !db || !authUser) return;
    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const inviteToken = params.get('invite');
        const invited = params.get('project');
        const remembered = safeLocalGet(LAST_PROJECT_KEY) || safeLocalGet(OLD_LAST_PROJECT_KEY);

        let chosen: string | null = null;
        if (inviteToken) {
          chosen = await acceptRecruitInvite(inviteToken, authUser.uid);
          if (!chosen) addToast({ type: 'warning', title: 'Invite unavailable', message: 'Ask the recruiter for a fresh link.' });
          else setActiveTab('channels');
          params.delete('invite');
          window.history.replaceState({}, '', window.location.pathname);
        }
        if (!chosen && invited && (await ensureMembership(invited, authUser.uid))) {
          chosen = invited; // ?project= links only open workspaces you already belong to
          addToast({ type: 'success', title: 'Workspace opened', message: 'Switched to the shared workspace.' });
        } else if (!chosen && invited) {
          addToast({
            type: 'warning',
            title: 'Invite link not valid',
            message: 'That link only works for existing members. Ask for a fresh invite link.',
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
          if (!chosen) {
            const guestProjects = await getDocs(query(collection(db!, 'projects'), where('guests', 'array-contains', authUser.uid), limit(1)));
            if (!guestProjects.empty) chosen = guestProjects.docs[0].id;
          }
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

  // Workspace members and channel guests can both return to their workspaces.
  useEffect(() => {
    if (!IS_CLOUD || !db || !authUser) return;
    const groups: Record<string, Project[]> = { members: [], guests: [] };
    const unsubscribers = ['members', 'guests'].map((field) => onSnapshot(
      query(collection(db!, 'projects'), where(field, 'array-contains', authUser.uid)),
      (snapshot) => {
        groups[field] = snapshot.docs.map((entry) => entry.data() as Project);
        const projects = new Map([...groups.members, ...groups.guests].map((entry) => [entry.id, entry]));
        setMyProjects([...projects.values()].sort(byCreatedDesc).map((entry) => ({ id: entry.id, name: entry.name, tagline: entry.tagline })));
      }, reportCloudError('project list')
    ));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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
          } else {
            setProject(EMPTY_PROJECT);
            setChannels([]);
            setMessages({});
            setTasks([]);
            setDecisions([]);
            setAnalyses({});
            setTeamMembers([]);
            setActiveChannelId('');
            setCloudProjectId(null);
            safeLocalRemove(LAST_PROJECT_KEY);
            setProjectLoaded(true);
            setChannelsLoaded(true);
          }
        },
        reportCloudError('project')
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

  useEffect(() => {
    if (!IS_CLOUD || !db || !authUser || !cloudProjectId || !projectLoaded || project.id !== cloudProjectId) return;
    const pid = cloudProjectId;
    setChannelsLoaded(false);
    setChannels([]);
    setMessages({});
    setAnalyses({});
    setTasks([]);
    setDecisions([]);
    if (isChannelGuest) setActiveTab('channels');
    const source = collection(db, 'projects', pid, 'channels');
    const unsubscribers = [onSnapshot(
      isChannelGuest ? query(source, where('members', 'array-contains', authUser.uid)) : source,
      (snapshot) => {
        setChannels(snapshot.docs.map((entry) => entry.data() as Channel).sort(byCreatedAsc));
        setChannelsLoaded(true);
      }, reportCloudError('channels')
    )];
    if (!isChannelGuest) {
      unsubscribers.push(onSnapshot(collection(db, 'projects', pid, 'tasks'),
        (snapshot) => setTasks(snapshot.docs.map((entry) => entry.data() as Task).sort(byCreatedDesc)), reportCloudError('tasks')));
      unsubscribers.push(onSnapshot(collection(db, 'projects', pid, 'decisions'),
        (snapshot) => setDecisions(snapshot.docs.map((entry) => entry.data() as Decision).sort(byCreatedDesc)), reportCloudError('decisions')));
    }
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      setMessages({});
      setAnalyses({});
    };
  }, [cloudProjectId, projectLoaded, project.id, isChannelGuest, authUser]);

  // Keep the active channel valid as channels load/change
  useEffect(() => {
    const invited = pendingInviteChannel.current;
    if (invited && channels.some((channel) => channel.id === invited)) {
      pendingInviteChannel.current = null;
      setActiveChannelId(invited);
      setActiveTab('channels');
    } else if (channels.length > 0 && !channels.some((c) => c.id === activeChannelId)) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // ---------- cloud: live messages + analysis for the active channel ----------
  useEffect(() => {
    if (!IS_CLOUD || !db || !cloudProjectId || !activeChannelId || !activeChannelAvailable) return;
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
      
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudProjectId, activeChannelId, activeChannelAvailable]);

  // ---------- cloud: pop-up notifications + unread counts for every channel ----------
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  // Listener callbacks are created once, so they read the latest values from this ref
  const liveRef = useRef({ activeChannelId, activeTab, uid: '', channels, jump: (_id: string, _ch?: string) => {} });
  liveRef.current = {
    activeChannelId,
    activeTab,
    uid: authUser?.uid || '',
    channels,
    jump: (id: string, ch?: string) => void jumpToMessage(id, ch),
  };

  const notifyNewMessage = (channelId: string, msg: Message) => {
    const live = liveRef.current;
    if (!msg || msg.senderId === live.uid) return; // never notify about your own messages
    const looking =
      channelId === live.activeChannelId && live.activeTab === 'channels' && document.visibilityState === 'visible';
    if (looking) return;

    setUnreadCounts((prev) => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
    const channelName = live.channels.find((c) => c.id === channelId)?.name || 'channel';
    const mentioned = (msg.mentions || []).includes(live.uid);
    const preview = (msg.content || (msg.codeSnippet ? 'shared a code snippet' : '')).slice(0, 120);
    const title = mentioned ? `${msg.senderName} mentioned you in #${channelName}` : `New message in #${channelName}`;
    const open = () => live.jump(msg.id, channelId);

    addToast({
      type: mentioned ? 'warning' : 'info',
      title,
      message: `${msg.senderName}: ${preview}`,
      action: { label: 'Open', run: open },
      groupKey: mentioned ? undefined : `chan_${channelId}`, // one toast per channel, newest wins
    });

    // System notification when the Sermona tab is in the background
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body: `${msg.senderName}: ${preview}`, tag: `sermona_${channelId}` });
        n.onclick = () => {
          window.focus();
          open();
          n.close();
        };
      } catch {
        /* some browsers only allow notifications from a service worker */
      }
    }
  };

  const channelKey = channels.map((c) => c.id).join(',');
  useEffect(() => {
    if (!IS_CLOUD || !db || !cloudProjectId || !authUser || !channelKey) return;
    const since = new Date().toISOString(); // only messages sent from now on
    const unsubs = channelKey.split(',').map((chId) =>
      onSnapshot(
        query(collection(db!, `projects/${cloudProjectId}/channels/${chId}/messages`), where('timestamp', '>', since)),
        (snap) =>
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') notifyNewMessage(chId, change.doc.data() as Message);
          }),
        (err) => console.warn('Notification listener:', err)
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudProjectId, authUser, channelKey]);

   // Saved AI analysis for EVERY channel (the flashcard shows each channel's AI-suggested tasks)
  useEffect(() => {
    if (!IS_CLOUD || !db || !cloudProjectId || !channelKey) return;
    const pid = cloudProjectId;
    const unsubs = channelKey.split(',').map((ch) =>
      onSnapshot(
        doc(db!, `projects/${pid}/analyses`, ch),
        (snap) =>
          setAnalyses((prev) => {
            const next = { ...prev };
            if (snap.exists()) next[ch] = snap.data() as AIAnalysisResult;
            else delete next[ch];
            return next;
          }),
        reportCloudError('analysis')
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudProjectId, channelKey]);

  // Top contributor without downloading messages: Firestore count queries, cached for 60s
  const contributorCache = useRef<Record<string, { at: number; data: ChannelContributors }>>({});
  const getChannelContributors = async (channelId: string): Promise<ChannelContributors> => {
    const fromLoaded = (): ChannelContributors => {
      const list = messages[channelId] || [];
      const counts: Record<string, { name: string; count: number }> = {};
      list.forEach((m) => {
        counts[m.senderId] = { name: m.senderName, count: (counts[m.senderId]?.count || 0) + 1 };
      });
      const top = Object.values(counts).sort((a, b) => b.count - a.count)[0] || null;
      return { total: list.length, top };
    };
    if (!IS_CLOUD || !db || !cloudProjectId) return fromLoaded();

    const cached = contributorCache.current[channelId];
    if (cached && Date.now() - cached.at < 60_000) return cached.data;

    const col = collection(db, 'projects', cloudProjectId, 'channels', channelId, 'messages');
    try {
      const [totalSnap, ...perMember] = await Promise.all([
        getCountFromServer(col),
        ...teamMembers.map((m) => getCountFromServer(query(col, where('senderId', '==', m.id)))),
      ]);
      const ranked = teamMembers
        .map((m, i) => ({ name: m.name, count: perMember[i].data().count }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count);
      const data = { total: totalSnap.data().count, top: ranked[0] || null };
      contributorCache.current[channelId] = { at: Date.now(), data };
      return data;
    } catch (err) {
      console.warn('Contributor count failed:', err);
      return fromLoaded();
    }
  };
  // Opening a channel clears its unread count
  useEffect(() => {
    if (activeTab !== 'channels' || !activeChannelId) return;
    setUnreadCounts((prev) => (prev[activeChannelId] ? { ...prev, [activeChannelId]: 0 } : prev));
  }, [activeChannelId, activeTab]);

  // Ask for browser notification permission on the first click (browsers block asking without one)
  useEffect(() => {
    if (!IS_CLOUD || !('Notification' in window) || Notification.permission !== 'default') return;
    const ask = () => {
      Notification.requestPermission().catch(() => {});
    };
    window.addEventListener('pointerdown', ask, { once: true });
    return () => window.removeEventListener('pointerdown', ask);
  }, []);

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
    setActiveChannelId(pendingInviteChannel.current || '');
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
    const token = raw.match(/[?&]invite=([A-Za-z0-9_-]+)/)?.[1];
    if (token) {
      try {
        const pid = await acceptRecruitInvite(token, authUser.uid);
        if (!pid) throw new Error('Expired invite');
        switchProject(pid);
        setActiveTab('channels');
        addToast({ type: 'success', title: 'Invite accepted', message: 'Your invited channels are now available.' });
        return true;
      } catch {
        addToast({ type: 'error', title: 'Could not join', message: 'Ask for a fresh invite link and try again.' });
        return false;
      }
    }
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
      addToast({ type: 'success', title: 'Workspace opened', message: 'Switched to the shared workspace.' });
    } else {
      addToast({ type: 'error', title: 'Could not join', message: 'You are not a member yet. Ask for an invite link (it contains ?invite=).' });
    }
    return ok;
  };

  const setCurrentUser = (user: User) => {
    if (IS_CLOUD) return; // in cloud mode you are whoever you signed in as
    setLocalUserId(user.id);
  };

  const setMyChannelCharacter = async (theme: ChannelTheme, handle: string) => {
    if (!CHARACTERS[theme]?.some((character) => character.handle === handle)) return;

    if (IS_CLOUD) {
      if (!db || !cloudProjectId || !authUser) return;
      try {
        await updateDoc(doc(db, 'projects', cloudProjectId, 'members', authUser.uid), {
          [`channelCharacters.${theme}`]: handle,
        });
      } catch (error) {
        reportCloudError('save character preference')(error);
      }
      return;
    }

    setTeamMembers((previous) => previous.map((member) => member.id === currentUser.id
      ? { ...member, channelCharacters: { ...member.channelCharacters, [theme]: handle } }
      : member));
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
  const sendMessage = (
    content: string,
    codeSnippet?: { language: string; code: string },
    extras?: { mentions?: string[]; replyTo?: MessageReply }
  ) => {
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
      ...(extras?.mentions && extras.mentions.length > 0 ? { mentions: extras.mentions } : {}),
      ...(extras?.replyTo ? { replyTo: extras.replyTo } : {}),
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
            replyToId: m.replyTo?.messageId || null,
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

      const raw: AIAnalysisResult = await response.json();
      // Give every extracted item an id that is unique across channels and re-runs.
      // Gemini / basic mode reuse ids like "dec_1" or "dec_basic_0_0", which made
      // confirming a decision in one channel overwrite a decision from another.
      const fresh: AIAnalysisResult = {
        ...raw,
        tasks: undefined,
        decisions: (raw.decisions || []).map((d) => {
          const id = newId('dec');
          return { ...d, id, decisionId: id };
        }),
        proposedTasks: (raw.proposedTasks || []).map((t) => {
          const id = newId('task');
          return { ...t, id, taskId: id };
        }),
        unresolvedQuestions: (raw.unresolvedQuestions || []).map((q) => ({ ...q, id: newId('q') })),
        ideas: (raw.ideas || []).map((i) => ({ ...i, id: newId('idea') })),
      };
      // Keep what the team already reviewed (edits, ticks, confirmations, owners, rejections)
      const data = mergeAnalysis(analyses[channelId] || null, fresh, tasks, decisions);
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

  const buildTaskFromSuggestion = (t: SuggestedTask, channelId: string): Task => {
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
      channelId,
    };
  };

  const approveProposedTask = (taskId: string) => {
    if (!currentAnalysis) return;
    const task = currentAnalysis.proposedTasks.find((t) => (t.taskId || t.id) === taskId);
    if (!task) return;

    const newTask = buildTaskFromSuggestion(task, currentAnalysis.channelId || activeChannelId);
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
    const rejected = currentAnalysis.proposedTasks.find((t) => (t.taskId || t.id) === taskId);
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.filter((t) => (t.taskId || t.id) !== taskId),
      // Remember it so re-running analysis doesn't propose it again
      dismissedTasks: [
        ...(currentAnalysis.dismissedTasks || []),
        ...(rejected ? [{ title: rejected.title, sourceMessageIds: rejected.sourceMessageIds || [] }] : []),
      ].slice(-200),
    });
    addToast({ type: 'info', title: 'Task Rejected', message: 'Proposed task dismissed.' });
  };

  const editProposedTask = (taskId: string, updates: Partial<SuggestedTask>) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.map((t) =>
        (t.taskId || t.id) === taskId ? { ...t, ...updates, edited: true } : t
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

    const newTasks = approvedList.map((t) => buildTaskFromSuggestion(t, currentAnalysis.channelId || activeChannelId));
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
          (d.decisionId || d.id) === decisionId ? { ...d, ...updates, edited: true } : d
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
      channelId: taskData.channelId,
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

  const isProjectOwner = Boolean(project.ownerId && project.ownerId === currentUser.id);

  const renameWorkspace = async (name: string) => {
    if (!isProjectOwner) throw new Error('Only the workspace owner can rename the workspace.');
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 100) throw new Error('Use a workspace name between 1 and 100 characters.');
    const pid = project.id;
    if (IS_CLOUD) {
      if (!db || !cloudProjectId || cloudProjectId !== pid) throw new Error('Wait for the workspace to finish loading.');
      await updateDoc(doc(db, 'projects', pid), { name: cleanName });
    }
    setProject((previous) => previous.id === pid ? { ...previous, name: cleanName } : previous);
  };

  const renameChannel = async (channelId: string, name: string) => {
    if (!isProjectOwner) throw new Error('Only the workspace owner can rename channels.');
    if (!channels.some((channel) => channel.id === channelId)) throw new Error('This channel is no longer available.');
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(cleanName)) {
      throw new Error('Use 1–100 letters, numbers, hyphens or underscores. Start with a letter or number.');
    }
    if (IS_CLOUD) {
      if (!db || !cloudProjectId) throw new Error('Wait for the workspace to finish loading.');
      await updateDoc(doc(db, 'projects', cloudProjectId, 'channels', channelId), { name: cleanName });
    }
    setChannels((previous) => previous.map((channel) => channel.id === channelId ? { ...channel, name: cleanName } : channel));
  };

  const deleteWorkspace = async (): Promise<boolean> => {
    if (!isProjectOwner || !IS_CLOUD || !db || !cloudProjectId || !authUser) return false;
    const pid = cloudProjectId;
    try {
      await deleteOwnedWorkspace(db, pid, authUser.uid);
      addToast({ type: 'success', title: 'Workspace deleted', message: 'The workspace and its collected records were removed.' });
      return true;
    } catch (error) {
      addToast({ type: 'error', title: 'Workspace not deleted', message: error instanceof Error ? error.message : 'Please retry.' });
      return false;
    }
  };

  const getChannelAdminId = (channel: Channel) => {
    const members = IS_CLOUD ? project.members : teamMembers.map((member) => member.id);
    const ownerId = project.ownerId || currentUser.id;
    return channel.adminId && (channel.adminId === ownerId || members.includes(channel.adminId))
      ? channel.adminId
      : ownerId;
  };

  const setChannelAdmin = async (channelId: string, adminId: string) => {
    const members = IS_CLOUD ? project.members : teamMembers.map((member) => member.id);
    if (!isProjectOwner || !channels.some((channel) => channel.id === channelId)) return;
    if (adminId !== project.ownerId && !members.includes(adminId)) return;

    if (IS_CLOUD) {
      if (!db || !cloudProjectId) return;
      try {
        await updateDoc(doc(db, 'projects', cloudProjectId, 'channels', channelId), { adminId });
      } catch (error) {
        reportCloudError('transfer channel admin')(error);
        return;
      }
    } else {
      setChannels((previous) => previous.map((channel) => channel.id === channelId ? { ...channel, adminId } : channel));
    }
    addToast({ type: 'success', title: 'Channel admin updated', message: 'The new admin can moderate messages in this channel.' });
  };

  const canDeleteMessage = (message: Message) => {
    return !IS_CLOUD || message.senderId === currentUser.id || isProjectOwner;
  };

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
        await updateDoc(doc(db, 'projects', cloudProjectId), { members: arrayRemove(memberId), guests: arrayRemove(memberId) });
        // … and delete their profile in this workspace
        await deleteDoc(doc(db, `projects/${cloudProjectId}/members`, memberId));
      } catch (err) {
        reportCloudError('remove member')(err);
        return;
      }
    }
    addToast({ type: 'info', title: 'Removed from squad', message: `${member?.name || 'Member'} no longer has access.` });
  };

  const setChannelTheme = async (channelId: string, theme: ChannelTheme | null): Promise<boolean> => {
    const channel = channels.find((entry) => entry.id === channelId);
    if (!channel || !isProjectOwner) return false;
    if (theme !== null && !['pokemon', 'avengers', 'harry-potter', 'whimsy'].includes(theme)) return false;
    // Persist only this field: never overwrite concurrent channel or message edits.
    if (IS_CLOUD) {
      if (!db || !cloudProjectId) return false;
      try {
        await updateDoc(doc(db, 'projects', cloudProjectId, 'channels', channelId), { theme });
      } catch (error) {
        reportCloudError('save channel theme')(error);
        return false;
      }
    }
    setChannels((previous) => previous.map((channel) => channel.id === channelId ? { ...channel, theme } : channel));
    return true;
  };

  const createChannel = (name: string, topic: string) => {
    if (!isProjectOwner) return;
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newChannel: Channel = {
      id: newId('chan'),
      projectId: projectPath() || project.id,
      name: cleanName,
      adminId: currentUser.id,
      members: [currentUser.id],
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
        isChannelGuest,
        createRecruitInvite,
        myProjects,
        switchProject,
        joinProject,
        allowedEmailDomains: ALLOWED_EMAIL_DOMAINS,
        updateMyProfile,
        setMyChannelCharacter,
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
        unreadCounts,
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
        setChannelTheme,
        deleteChannel,
        removeMember,
        deleteMessage,
        canDeleteMessage,
        isProjectOwner,
        deleteWorkspace,
        renameWorkspace,
        renameChannel,
        getChannelAdminId,
        setChannelAdmin,
        createNewProject,
        resetToDemoData,
        channelAnalyses: analyses,
        getChannelContributors,
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
