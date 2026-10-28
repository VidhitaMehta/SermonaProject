export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'completed';
export type DecisionStatus = 'confirmed' | 'proposed' | 'superseded' | 'deprecated';
export type QuestionStatus = 'unresolved' | 'resolved' | 'in_progress';
export type QuestionCategory = 'explicitly_asked' | 'inferred_gap';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  skills?: string[];
  online?: boolean;
  initials: string;
}

export interface Project {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  ownerId?: string;
  members: string[];
  createdAt: string;
  deadline?: string;
  tags?: string[];
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  members?: string[];
  projectId?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  channelId: string;
  projectId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  content: string;
  timestamp: string;
  reactions?: Record<string, string[]>;
  attachments?: string[];
  codeSnippet?: {
    language: string;
    code: string;
  };
}

export interface Decision {
  id: string;
  decisionId?: string;
  title: string;
  description: string;
  rationale?: string;
  status: DecisionStatus;
  sourceMessageIds: string[];
  createdAt: string;
  confirmedBy?: string;
  evidenceSnippet?: string;
  evidence?: string;
  confidence?: number;
  confirmationRequirements?: string | null;
  channelId?: string;
  projectId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  deadline: string | null;
  status: TaskStatus;
  priority: Priority;
  sourceMessageIds: string[];
  source: 'manual' | 'ai_extracted';
  confidence?: number | null;
  evidenceSnippet?: string | null;
  evidence?: string | null;
  missingInformation?: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  recommendedSkills?: string[];
  projectId?: string;
}

export interface Question {
  id: string;
  question: string;
  status: QuestionStatus;
  sourceMessageIds: string[];
  category?: QuestionCategory;
  context?: string;
  suggestedNextStep?: string;
  urgency?: 'high' | 'medium' | 'low';
  ownerId?: string | null;
  ownerName?: string | null;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  sourceMessageIds: string[];
  proposedBy?: string;
}

export interface AIInsight {
  id: string;
  type: 'insight' | 'idea' | 'bottleneck' | 'summary';
  content: string;
  confidence: number;
  sourceMessageIds: string[];
}

export interface SuggestedTask {
  id: string;
  taskId?: string;
  title: string;
  description: string;
  assigneeId: string | null;
  suggestedAssignee: string | null;
  deadline: string | null;
  priority: Priority;
  status: 'proposed' | TaskStatus;
  evidenceSnippet: string;
  confidence: number;
  missingInformation?: string | null;
  needsConfirmation: boolean;
  approved?: boolean;
  rejected?: boolean;
  sourceMessageIds: string[];
  recommendedSkills?: string[];
}

export interface DetectedDecision {
  id: string;
  decisionId?: string;
  title: string;
  description: string;
  status: DecisionStatus;
  evidenceSnippet: string;
  confidence: number;
  confirmationRequirements?: string | null;
  sourceMessageIds: string[];
  confirmedBy?: string;
}

export interface TeamInsights {
  keyTopics: string[];
  teamAlignment: string;
  potentialBottlenecks: string[];
  sentiment: 'collaborative' | 'aligned' | 'debating' | 'blocked';
  workloadDistribution?: string;
  observations?: string[];
  collaborationGaps?: string[];
}

export interface AIAnalysisResult {
  summary: string;
  channelName: string;
  analyzedAt: string;
  messageCount: number;
  decisions: DetectedDecision[];
  proposedTasks: SuggestedTask[];
  tasks?: SuggestedTask[]; // alias for compatibility
  unresolvedQuestions: Question[];
  ideas: Idea[];
  insights: AIInsight[];
  teamInsights?: TeamInsights;
}

export type ViewTab = 'channels' | 'dashboard' | 'tasks' | 'decisions' | 'insights' | 'team';
