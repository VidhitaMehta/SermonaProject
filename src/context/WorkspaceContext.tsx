import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Project,
  Channel,
  Message,
  Task,
  Decision,
  Question,
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
import { configStatus, FirebaseStatus, db } from '../lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_KEY = 'collabai_workspace_state_v2';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface WorkspaceContextType {
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
  createNewProject: (name: string, tagline: string, description: string) => void;
  resetToDemoData: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial persistent state
  const loadStoredData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load stored state:', e);
    }
    return null;
  };

  const initialStored = loadStoredData();

  const [currentUser, setCurrentUser] = useState<User>(initialStored?.currentUser || CURRENT_USER);
  const [teamMembers] = useState<User[]>(SAMPLE_USERS);
  const [project, setProject] = useState<Project>(initialStored?.project || SAMPLE_PROJECT);
  const [channels, setChannels] = useState<Channel[]>(initialStored?.channels || SAMPLE_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>(
    initialStored?.activeChannelId || SAMPLE_CHANNELS[0].id
  );
  const [messages, setMessages] = useState<Record<string, Message[]>>(
    initialStored?.messages || SAMPLE_MESSAGES
  );
  const [tasks, setTasks] = useState<Task[]>(initialStored?.tasks || INITIAL_TASKS);
  const [decisions, setDecisions] = useState<Decision[]>(
    initialStored?.decisions || INITIAL_DECISIONS
  );
  const [activeTab, setActiveTab] = useState<ViewTab>('channels');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysisResult | null>(
    initialStored?.currentAnalysis || null
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Automatically save to persistent localStorage whenever relevant state changes
  useEffect(() => {
    try {
      const stateToSave = {
        currentUser,
        project,
        channels,
        activeChannelId,
        messages,
        tasks,
        decisions,
        currentAnalysis,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }, [currentUser, project, channels, activeChannelId, messages, tasks, decisions, currentAnalysis]);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to sync to Firestore if configured
  const syncToFirestore = async (collectionPath: string, docId: string, data: any) => {
    if (configStatus.isConfigured && db) {
      try {
        await setDoc(doc(db, collectionPath, docId), data, { merge: true });
      } catch (err) {
        console.warn(`Firestore sync note for ${collectionPath}/${docId}:`, err);
      }
    }
  };

  // Send a new message to the active channel
  const sendMessage = (content: string, codeSnippet?: { language: string; code: string }) => {
    if (!content.trim() && !codeSnippet) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      channelId: activeChannelId,
      projectId: project.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: currentUser.role,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      codeSnippet,
      reactions: {},
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));

    // If Firestore is available, sync message
    syncToFirestore(`projects/${project.id}/channels/${activeChannelId}/messages`, newMessage.id, newMessage);

    addToast({
      type: 'success',
      title: 'Message posted',
      message: `Posted to #${channels.find((c) => c.id === activeChannelId)?.name || 'channel'}`,
    });
  };

  // Add emoji reaction
  const addReaction = (messageId: string, emoji: string) => {
    setMessages((prev) => {
      const channelMsgs = prev[activeChannelId] || [];
      const updated = channelMsgs.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = msg.reactions || {};
        const userList = currentReactions[emoji] || [];
        const hasReacted = userList.includes(currentUser.id);
        const nextUsers = hasReacted
          ? userList.filter((uid) => uid !== currentUser.id)
          : [...userList, currentUser.id];

        const nextReactions = { ...currentReactions };
        if (nextUsers.length > 0) {
          nextReactions[emoji] = nextUsers;
        } else {
          delete nextReactions[emoji];
        }
        return { ...msg, reactions: nextReactions };
      });
      return { ...prev, [activeChannelId]: updated };
    });
  };

  // AI Conversation Analysis Service Call
  const analyzeCurrentChannel = async () => {
    const channel = channels.find((c) => c.id === activeChannelId);
    const channelMsgs = messages[activeChannelId] || [];

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
          channelId: activeChannelId,
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
          existingTasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
          })),
          existingDecisions: decisions.map((d) => ({
            id: d.id,
            title: d.title,
            status: d.status,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data: AIAnalysisResult = await response.json();
      setCurrentAnalysis(data);

      addToast({
        type: 'success',
        title: 'Intelligence generated',
        message: `Extracted ${data.decisions.length} decisions, ${data.proposedTasks.length} tasks, and ${data.unresolvedQuestions.length} open questions from #${channel?.name}.`,
      });
    } catch (err: any) {
      console.error('Conversation analysis error:', err);
      setAnalysisError(err.message || 'Failed to complete conversation analysis');
      addToast({
        type: 'error',
        title: 'Analysis failed',
        message: err.message || 'Unable to connect to Gemini API',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- PROPOSED TASKS REVIEW WORKFLOW (Approve, Edit, Reject) ---

  // Single Approve: Immediately commits the proposed task to the project board
  const approveProposedTask = (taskId: string) => {
    if (!currentAnalysis) return;
    const task = currentAnalysis.proposedTasks.find((t) => (t.taskId || t.id) === taskId);
    if (!task) return;

    const assignedMember = teamMembers.find(
      (m) => m.id === task.assigneeId || m.name.toLowerCase().includes((task.suggestedAssignee || '').toLowerCase())
    );

    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: project.id,
      title: task.title,
      description: task.description,
      assigneeId: assignedMember ? assignedMember.id : null,
      assigneeName: assignedMember ? assignedMember.name : task.suggestedAssignee || null,
      assigneeAvatar: assignedMember ? assignedMember.avatar : null,
      deadline: task.deadline || null,
      priority: task.priority,
      status: 'todo',
      source: 'ai_extracted',
      sourceMessageIds: task.sourceMessageIds || [],
      evidenceSnippet: task.evidenceSnippet,
      confidence: task.confidence,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['AI-Validated'],
      recommendedSkills: task.recommendedSkills || [],
    };

    setTasks((prev) => [newTask, ...prev]);
    syncToFirestore(`projects/${project.id}/tasks`, newTask.id, newTask);

    // Remove from proposed tasks list
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

  // Reject proposed task
  const rejectProposedTask = (taskId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.filter((t) => (t.taskId || t.id) !== taskId),
    });
    addToast({
      type: 'info',
      title: 'Task Rejected',
      message: 'Proposed task dismissed.',
    });
  };

  // Edit proposed task
  const editProposedTask = (taskId: string, updates: Partial<SuggestedTask>) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.map((t) =>
        (t.taskId || t.id) === taskId ? { ...t, ...updates } : t
      ),
    });
  };

  // Toggle approval on suggested task checkbox for batch commit
  const toggleApproveSuggestedTask = (suggestedTaskId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      proposedTasks: currentAnalysis.proposedTasks.map((t) =>
        (t.taskId || t.id) === suggestedTaskId ? { ...t, approved: !t.approved } : t
      ),
    });
  };

  // Commit all approved suggested tasks into Project Tasks
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

    const newTasks: Task[] = approvedList.map((t) => {
      const assignedMember = teamMembers.find(
        (m) => m.id === t.assigneeId || m.name.toLowerCase().includes((t.suggestedAssignee || '').toLowerCase())
      );
      return {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        projectId: project.id,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['AI-Validated'],
        recommendedSkills: t.recommendedSkills || [],
      };
    });

    setTasks((prev) => [...newTasks, ...prev]);
    newTasks.forEach((t) => syncToFirestore(`projects/${project.id}/tasks`, t.id, t));

    // Remove approved tasks from proposedTasks list
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
    // 1. Update in currentAnalysis if present
    if (currentAnalysis) {
      setCurrentAnalysis({
        ...currentAnalysis,
        decisions: currentAnalysis.decisions.map((d) =>
          (d.decisionId || d.id) === decisionId ? { ...d, status: 'confirmed', confirmedBy: currentUser.name } : d
        ),
      });
    }

    // 2. Check if already in decisions state or add it
    const existing = decisions.find((d) => (d.decisionId || d.id) === decisionId);
    if (existing) {
      setDecisions((prev) =>
        prev.map((d) =>
          (d.decisionId || d.id) === decisionId
            ? { ...d, status: 'confirmed', confirmedBy: currentUser.name }
            : d
        )
      );
    } else if (currentAnalysis) {
      const detected = currentAnalysis.decisions.find((d) => (d.decisionId || d.id) === decisionId);
      if (detected) {
        const newDec: Decision = {
          id: detected.decisionId || detected.id || `dec_${Date.now()}`,
          decisionId: detected.decisionId || detected.id,
          projectId: project.id,
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
        syncToFirestore(`projects/${project.id}/decisions`, newDec.id, newDec);
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
    setDecisions((prev) =>
      prev.map((d) => ((d.decisionId || d.id) === decisionId ? { ...d, ...updates } : d))
    );
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
        q.id === questionId
          ? { ...q, ownerId, ownerName, status: 'in_progress' }
          : q
      ),
    });
    addToast({
      type: 'success',
      title: 'Owner Assigned',
      message: `${ownerName} assigned to address question.`,
    });
  };

  const resolveQuestion = (questionId: string) => {
    if (!currentAnalysis) return;
    setCurrentAnalysis({
      ...currentAnalysis,
      unresolvedQuestions: currentAnalysis.unresolvedQuestions.map((q) =>
        q.id === questionId ? { ...q, status: 'resolved' } : q
      ),
    });
    addToast({
      type: 'info',
      title: 'Question Resolved',
      message: 'Marked as resolved.',
    });
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
    const newTask: Task = {
      id: `task_${Date.now()}`,
      projectId: project.id,
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
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: taskData.tags || ['Engineering'],
      recommendedSkills: taskData.recommendedSkills || [],
    };

    setTasks((prev) => [newTask, ...prev]);
    syncToFirestore(`projects/${project.id}/tasks`, newTask.id, newTask);

    addToast({
      type: 'success',
      title: 'Task created',
      message: `"${newTask.title}" has been created.`,
    });
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
    syncToFirestore(`projects/${project.id}/tasks`, taskId, updates);
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (configStatus.isConfigured && db) {
      deleteDoc(doc(db, `projects/${project.id}/tasks`, taskId)).catch(() => {});
    }
    addToast({
      type: 'info',
      title: 'Task deleted',
      message: 'The task has been removed.',
    });
  };

  const toggleTaskComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          const nextStatus = nextCompleted ? 'completed' : 'todo';
          syncToFirestore(`projects/${project.id}/tasks`, taskId, {
            completed: nextCompleted,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          });
          return {
            ...t,
            completed: nextCompleted,
            status: nextStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  // --- DECISIONS MANAGEMENT ---

  const createDecision = (decisionData: Partial<Decision>) => {
    const newDecision: Decision = {
      id: `dec_${Date.now()}`,
      decisionId: `dec_${Date.now()}`,
      projectId: project.id,
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
    syncToFirestore(`projects/${project.id}/decisions`, newDecision.id, newDecision);

    addToast({
      type: 'success',
      title: 'Decision recorded',
      message: `"${newDecision.title}" logged to project decisions.`,
    });
  };

  // --- CHANNEL & PROJECT CREATION ---

  const createChannel = (name: string, topic: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newChannel: Channel = {
      id: `chan_${Date.now()}`,
      projectId: project.id,
      name: cleanName,
      topic: topic || 'New discussion topic',
      description: topic || 'New discussion topic',
      unreadCount: 0,
    };

    setChannels((prev) => [...prev, newChannel]);
    setActiveChannelId(newChannel.id);
    syncToFirestore(`projects/${project.id}/channels`, newChannel.id, newChannel);

    addToast({
      type: 'success',
      title: 'Channel created',
      message: `#${cleanName} is ready for conversation.`,
    });
  };

  const createNewProject = (name: string, tagline: string, description: string) => {
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name,
      tagline: tagline || 'AI-assisted collaborative initiative',
      description,
      ownerId: currentUser.id,
      members: [currentUser.id],
      createdAt: new Date().toISOString(),
      deadline: '2026-11-15T00:00:00Z',
      tags: ['Active'],
    };

    const defaultChannel: Channel = {
      id: `chan_gen_${Date.now()}`,
      projectId: newProj.id,
      name: 'general',
      topic: 'Welcome and project onboarding',
      description: 'Welcome and project onboarding',
    };

    setProject(newProj);
    setChannels([defaultChannel]);
    setActiveChannelId(defaultChannel.id);
    setMessages({ [defaultChannel.id]: [] });
    setTasks([]);
    setDecisions([]);
    setCurrentAnalysis(null);

    syncToFirestore(`projects`, newProj.id, newProj);
    syncToFirestore(`projects/${newProj.id}/channels`, defaultChannel.id, defaultChannel);

    addToast({
      type: 'success',
      title: 'Project created',
      message: `Switched to workspace: ${name}`,
    });
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(CURRENT_USER);
    setProject(SAMPLE_PROJECT);
    setChannels(SAMPLE_CHANNELS);
    setActiveChannelId(SAMPLE_CHANNELS[0].id);
    setMessages(SAMPLE_MESSAGES);
    setTasks(INITIAL_TASKS);
    setDecisions(INITIAL_DECISIONS);
    setCurrentAnalysis(null);
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
        currentUser,
        setCurrentUser,
        teamMembers,
        project,
        channels,
        activeChannelId,
        setActiveChannelId,
        messages,
        tasks,
        decisions,
        activeTab,
        setActiveTab,
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
