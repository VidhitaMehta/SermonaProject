import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { basicExtract } from './basicExtract.ts';

dotenv.config();

const app = express();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

app.use(express.json({ limit: '10mb' }));

// Initialize shared Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health & configuration status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    model: GEMINI_MODEL,
    mode: process.env.NODE_ENV || 'development',
  });
});

// Helper validation function for the extracted result
function validateAndSanitizeAnalysis(
  raw: any,
  validMessageIds: Set<string>,
  validMemberMap: Map<string, string>, // id -> name
  memberNameToId: Map<string, string>, // lowerName -> id
  channelName: string
) {
  // 1. Sanitize summary
  const summary =
    typeof raw.summary === 'string' && raw.summary.trim().length > 0
      ? raw.summary.trim()
      : 'Summary generated from conversation.';

  // 2. Sanitize decisions
  const rawDecisions = Array.isArray(raw.decisions) ? raw.decisions : [];
  const decisions = rawDecisions.map((d: any, idx: number) => {
    const rawStatus = (d.status || '').toLowerCase();
    const status = ['confirmed', 'proposed', 'superseded'].includes(rawStatus)
      ? rawStatus
      : 'proposed';

    // Supporting message IDs must strictly exist in validMessageIds
    const rawMsgIds = Array.isArray(d.supportingMessageIds || d.sourceMessageIds)
      ? (d.supportingMessageIds || d.sourceMessageIds)
      : [];
    const sourceMessageIds = rawMsgIds.filter((id: string) => validMessageIds.has(String(id)));
    const title = d.title || (d.description ? d.description.slice(0, 80) : 'Project Decision');
    const description = d.description || d.rationale || title;
    const confidence = typeof d.confidence === 'number' ? Math.min(Math.max(d.confidence, 0.1), 0.99) : 0.88;
    const confirmationRequirements = d.confirmationRequirements && d.confirmationRequirements !== 'null'
      ? String(d.confirmationRequirements)
      : status === 'proposed'
      ? 'Requires verbal or written confirmation from project lead.'
      : null;

    return {
      decisionId: d.decisionId || d.id || `dec_${Date.now()}_${idx}`,
      id: d.decisionId || d.id || `dec_${Date.now()}_${idx}`,
      title,
      description,
      status,
      sourceMessageIds,
      supportingMessageIds: sourceMessageIds,
      confidence,
      evidenceSnippet: d.evidenceSnippet || d.evidence || '',
      confirmationRequirements,
      confirmedBy: d.confirmedBy || (status === 'confirmed' ? 'Team Lead' : undefined),
    };
  });

  // 3. Sanitize proposed tasks
  const rawTasks = Array.isArray(raw.proposedTasks || raw.tasks) ? (raw.proposedTasks || raw.tasks) : [];
  const proposedTasks = rawTasks.map((t: any, idx: number) => {
    // Member ID resolution
    let assigneeId: string | null = null;
    let suggestedAssignee: string | null = null;

    if (t.assigneeId && validMemberMap.has(t.assigneeId)) {
      assigneeId = t.assigneeId;
      suggestedAssignee = validMemberMap.get(t.assigneeId) || null;
    } else if (t.suggestedAssignee) {
      const lower = String(t.suggestedAssignee).toLowerCase().trim();
      for (const [mName, mId] of memberNameToId.entries()) {
        if (lower.includes(mName) || mName.includes(lower)) {
          assigneeId = mId;
          suggestedAssignee = validMemberMap.get(mId) || null;
          break;
        }
      }
      if (!assigneeId) {
        suggestedAssignee = null;
      }
    }

    const deadline =
      t.deadline && t.deadline !== 'null' && typeof t.deadline === 'string' && t.deadline.trim().length > 0
        ? t.deadline.trim()
        : null;

    const rawPriority = (t.priority || '').toLowerCase();
    const priority = ['urgent', 'high', 'medium', 'low'].includes(rawPriority) ? rawPriority : 'medium';

    const rawMsgIds = Array.isArray(t.supportingMessageIds || t.sourceMessageIds)
      ? (t.supportingMessageIds || t.sourceMessageIds)
      : [];
    const sourceMessageIds = rawMsgIds.filter((id: string) => validMessageIds.has(String(id)));
    const missingInformation =
      t.missingInformation && t.missingInformation !== 'null'
        ? String(t.missingInformation)
        : !assigneeId && !deadline
        ? 'Missing assignee and deadline.'
        : !assigneeId
        ? 'Missing assigned team member.'
        : !deadline
        ? 'Missing explicit target deadline.'
        : null;

    const needsConfirmation = Boolean(missingInformation || !assigneeId || !deadline || t.needsConfirmation);
    const confidence = typeof t.confidence === 'number' ? Math.min(Math.max(t.confidence, 0.1), 0.99) : 0.85;

    return {
      taskId: t.taskId || t.id || `task_${Date.now()}_${idx}`,
      id: t.taskId || t.id || `task_${Date.now()}_${idx}`,
      title: t.title || 'Extracted Task',
      description: t.description || '',
      assigneeId,
      suggestedAssignee,
      deadline,
      priority,
      status: 'proposed',
      sourceMessageIds,
      supportingMessageIds: sourceMessageIds,
      confidence,
      missingInformation,
      needsConfirmation,
      evidenceSnippet: t.evidenceSnippet || '',
      recommendedSkills: Array.isArray(t.recommendedSkills) ? t.recommendedSkills : [],
      approved: false,
      rejected: false,
    };
  });

  // 4. Sanitize unresolved questions
  const rawQuestions = Array.isArray(raw.unresolvedQuestions) ? raw.unresolvedQuestions : [];
  const unresolvedQuestions = rawQuestions.map((q: any, idx: number) => {
    const rawCategory = (q.category || '').toLowerCase();
    const category = ['explicitly_asked', 'inferred_gap'].includes(rawCategory) ? rawCategory : 'explicitly_asked';

    const rawMsgIds = Array.isArray(q.supportingMessageIds || q.sourceMessageIds)
      ? (q.supportingMessageIds || q.sourceMessageIds)
      : [];
    const sourceMessageIds = rawMsgIds.filter((id: string) => validMessageIds.has(String(id)));

    return {
      id: q.id || `q_${Date.now()}_${idx}`,
      question: q.question || 'Unresolved project inquiry',
      category,
      context: q.context || '',
      suggestedNextStep: q.suggestedNextStep || 'Discuss during next team sync',
      status: 'unresolved',
      urgency: ['high', 'medium', 'low'].includes(q.urgency) ? q.urgency : 'medium',
      sourceMessageIds,
      supportingMessageIds: sourceMessageIds,
      createdAt: new Date().toISOString(),
    };
  });

  // 5. Sanitize team insights
  const rawTI = raw.teamInsights || {};
  const teamInsights = {
    keyTopics: Array.isArray(rawTI.keyTopics) && rawTI.keyTopics.length > 0
      ? rawTI.keyTopics
      : ['Architecture', 'Execution'],
    teamAlignment: rawTI.teamAlignment || 'Consensus on technical direction.',
    potentialBottlenecks: Array.isArray(rawTI.potentialBottlenecks) ? rawTI.potentialBottlenecks : [],
    sentiment: ['collaborative', 'aligned', 'debating', 'blocked'].includes(rawTI.sentiment)
      ? rawTI.sentiment
      : 'collaborative',
    workloadDistribution: rawTI.workloadDistribution || 'Tasks distributed across engineering leads.',
    observations: Array.isArray(rawTI.observations)
      ? rawTI.observations
      : ['Team communicated clearly on algorithm choice and benchmarks.'],
    collaborationGaps: Array.isArray(rawTI.collaborationGaps) ? rawTI.collaborationGaps : [],
  };

  return {
    summary,
    channelName,
    analyzedAt: new Date().toISOString(),
    messageCount: validMessageIds.size,
    decisions,
    proposedTasks,
    tasks: proposedTasks, // compatibility
    unresolvedQuestions,
    ideas: (Array.isArray(raw.ideas) ? raw.ideas : []).map((i: any, idx: number) => ({
      id: i.id || `idea_${Date.now()}_${idx}`,
      title: i.title || 'Idea',
      description: i.description || '',
      proposedBy: i.proposedBy || undefined,
      sourceMessageIds: (Array.isArray(i.supportingMessageIds || i.sourceMessageIds)
        ? i.supportingMessageIds || i.sourceMessageIds
        : []
      ).filter((id: string) => validMessageIds.has(String(id))),
    })),
    insights: Array.isArray(raw.insights) ? raw.insights : [],
    teamInsights,
  };
}

// AI Conversation Analysis Endpoint
app.post('/api/analyze-conversation', async (req, res) => {
  try {
    const {
      projectId,
      channelId,
      channelName,
      messages,
      workspaceMembers,
      existingTasks,
      existingDecisions,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and must not be empty' });
    }

    // Set of valid message IDs for exact evidence linking
    const validMessageIds = new Set<string>();
    messages.forEach((m: any) => {
      if (m && m.id) validMessageIds.add(String(m.id));
    });

    // Maps for member name <-> memberId resolution
    const validMemberMap = new Map<string, string>(); // id -> name
    const memberNameToId = new Map<string, string>(); // lowerName -> id

    const membersArray = Array.isArray(workspaceMembers) ? workspaceMembers : [];
    membersArray.forEach((m: any) => {
      if (m && m.id && m.name) {
        validMemberMap.set(String(m.id), String(m.name));
        memberNameToId.set(String(m.name).toLowerCase().trim(), String(m.id));
      }
    });

    // Provide default ML capstone members if not provided
    if (validMemberMap.size === 0) {
      validMemberMap.set('user_maya', 'Maya Patel');
      validMemberMap.set('user_alex', 'Alex Chen');
      validMemberMap.set('user_liam', 'Liam Scott');
      validMemberMap.set('user_sophia', 'Sophia Taylor');
      memberNameToId.set('maya patel', 'user_maya');
      memberNameToId.set('maya', 'user_maya');
      memberNameToId.set('alex chen', 'user_alex');
      memberNameToId.set('alex', 'user_alex');
      memberNameToId.set('liam scott', 'user_liam');
      memberNameToId.set('liam', 'user_liam');
      memberNameToId.set('sophia taylor', 'user_sophia');
      memberNameToId.set('sophia', 'user_sophia');
    }

    const memberDetails = new Map<string, { role?: string; skills?: string[] }>();
    membersArray.forEach((m: any) => {
      if (m && m.id) memberDetails.set(String(m.id), { role: m.role, skills: Array.isArray(m.skills) ? m.skills : [] });
    });
    const membersRosterText = Array.from(validMemberMap.entries())
      .map(([id, name]) => {
        const d = memberDetails.get(id);
        const role = d?.role ? `, role: ${d.role}` : '';
        const skills = d?.skills && d.skills.length > 0 ? `, skills: ${d.skills.join(', ')}` : '';
        return `• ${name} (ID: "${id}"${role}${skills})`;
      })
      .join('\n');

    const conversationTranscript = messages
      .map((m: any) => {
        const id = m.id || 'unknown';
        const sender = m.senderName || 'Anonymous';
        const senderId = m.senderId ? ` [senderId: "${m.senderId}"]` : '';
        const role = m.senderRole ? ` (${m.senderRole})` : '';
        const text = m.content || '';
        return `[Msg ID: "${id}"]${senderId} ${sender}${role}: ${text}`;
      })
      .join('\n\n');

    const existingTasksContext = Array.isArray(existingTasks) && existingTasks.length > 0
      ? `Existing tasks already logged in project (DO NOT DUPLICATE THESE):\n` +
        existingTasks.map((t: any) => `• [Task: "${t.title}"] (Status: ${t.status || 'open'})`).join('\n')
      : 'No existing tasks recorded yet.';

    const existingDecisionsContext = Array.isArray(existingDecisions) && existingDecisions.length > 0
      ? `Existing decisions already logged (Flag if any are superseded by new agreements):\n` +
        existingDecisions.map((d: any) => `• [Decision: "${d.title}"] (Status: ${d.status || 'confirmed'})`).join('\n')
      : 'No prior decisions logged.';

    let fallbackReason =
      'No GEMINI_API_KEY is set on the server, so these results come from simple keyword rules, not AI.';

    // Try Gemini API if available
    if (ai) {
      try {
        const systemInstruction = `You are Sermona Intelligence, an authoritative engineering workspace reasoning engine.
Your purpose is to transform team conversations into validated, structured project intelligence.
The core workflow is: Talk → Understand → Organize → Validate → Execute.

CRITICAL EXTRACTION RULES:
1. Suggestions vs Decisions: A suggestion or proposal is NEVER a confirmed decision. Only mark a decision as "confirmed" if an authoritative lead or explicit consensus agreed (e.g. "Decision confirmed", "We agree on X"). Otherwise, set status to "proposed". If an earlier decision is overturned, mark it as "superseded".
2. No Hallucinated Assignments: NEVER invent or guess a team member assignment. ONLY resolve an assignee to an exact workspace member ID from the roster when the identity is unambiguous in the text. If unassigned or unclear, set assigneeId to null and note in missingInformation.
3. No Hallucinated Deadlines: ONLY set deadline if an explicit date/time was stated in the conversation. Never invent deadlines. If missing, set deadline to null and note in missingInformation.
4. Supporting Evidence: For every decision, task, and question, you MUST provide supportingMessageIds containing the exact Msg ID strings (e.g. ["msg_102", "msg_104"]) from the transcript as verifiable proof.
5. De-duplication: Do NOT generate duplicate tasks if the item is already present in Existing Tasks.
6. Questions vs Commitments: Distinguish explicitly asked questions from inferred gaps. Set category to "explicitly_asked" or "inferred_gap".
7. Team Insights: Provide cautious, data-grounded observations on workload distribution and collaboration gaps.
8. Skills: For every proposed task, list 1-4 short recommendedSkills needed to do it (e.g. "Python", "Figma", "Data Cleaning"). Prefer the exact skill names used in the member roster when they fit. Do NOT use skills to pick an assignee — assignment rules above still apply.
9. Ideas: Capture suggestions and brainstormed ideas that are not yet decisions or tasks in "ideas", with who proposed them.`;

        const prompt = `Analyze this project conversation from channel #${channelName || 'channel'} in project ${projectId || 'default'}.

WORKSPACE MEMBER ROSTER (assigneeId MUST be one of these exact IDs, or null):
${membersRosterText}

${existingTasksContext}

${existingDecisionsContext}

CONVERSATION TRANSCRIPT:
${conversationTranscript}

Provide structured output conforming strictly to the requested schema.`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: 'Concise executive summary of what was discussed, agreed, and planned in this channel.',
                },
                decisions: {
                  type: Type.ARRAY,
                  description: 'Architectural and operational decisions detected.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      decisionId: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['proposed', 'confirmed', 'superseded'] },
                      supportingMessageIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      confidence: { type: Type.NUMBER },
                      confirmationRequirements: { type: Type.STRING },
                      evidenceSnippet: { type: Type.STRING },
                    },
                    required: ['decisionId', 'title', 'description', 'status', 'supportingMessageIds', 'confidence', 'evidenceSnippet'],
                  },
                },
                proposedTasks: {
                  type: Type.ARRAY,
                  description: 'Proposed actionable tasks extracted from discussion.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      taskId: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      assigneeId: { type: Type.STRING },
                      suggestedAssignee: { type: Type.STRING },
                      deadline: { type: Type.STRING },
                      priority: { type: Type.STRING, enum: ['urgent', 'high', 'medium', 'low'] },
                      status: { type: Type.STRING, enum: ['proposed'] },
                      supportingMessageIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      confidence: { type: Type.NUMBER },
                      missingInformation: { type: Type.STRING },
                      evidenceSnippet: { type: Type.STRING },
                      recommendedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['taskId', 'title', 'description', 'priority', 'status', 'supportingMessageIds', 'confidence', 'evidenceSnippet'],
                  },
                },
                unresolvedQuestions: {
                  type: Type.ARRAY,
                  description: 'Open questions or ambiguities requiring follow-up.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      question: { type: Type.STRING },
                      supportingMessageIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING, enum: ['explicitly_asked', 'inferred_gap'] },
                      suggestedNextStep: { type: Type.STRING },
                      urgency: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                      context: { type: Type.STRING },
                    },
                    required: ['id', 'question', 'supportingMessageIds', 'category', 'suggestedNextStep', 'urgency'],
                  },
                },
                ideas: {
                  type: Type.ARRAY,
                  description: 'Ideas and suggestions raised that are not yet decisions or tasks.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      proposedBy: { type: Type.STRING },
                      supportingMessageIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['id', 'title', 'description', 'supportingMessageIds'],
                  },
                },
                teamInsights: {
                  type: Type.OBJECT,
                  description: 'Observations regarding collaboration, workload balance, and bottlenecks.',
                  properties: {
                    observations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    workloadDistribution: { type: Type.STRING },
                    collaborationGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    keyTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    teamAlignment: { type: Type.STRING },
                    sentiment: { type: Type.STRING, enum: ['collaborative', 'aligned', 'debating', 'blocked'] },
                  },
                  required: ['observations', 'workloadDistribution', 'collaborationGaps', 'keyTopics', 'teamAlignment', 'sentiment'],
                },
              },
              required: ['summary', 'decisions', 'proposedTasks', 'unresolvedQuestions', 'teamInsights'],
            },
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text.trim());
          const validated = validateAndSanitizeAnalysis(
            parsed,
            validMessageIds,
            validMemberMap,
            memberNameToId,
            channelName || 'channel'
          );
          return res.json({ ...validated, mode: 'ai', notice: null });
        }
      } catch (geminiError: any) {
        console.warn(`Gemini (${GEMINI_MODEL}) unavailable, falling back to basic keyword extraction:`, geminiError.message);
        fallbackReason = `Gemini request failed (${String(geminiError.message || geminiError).slice(0, 120)}). These results come from simple keyword rules instead.`;
      }
    }

    // Honest fallback: a rule-based extractor that actually reads THIS conversation.
    // The UI labels the result as "Basic mode — not AI".
    const fallbackData = basicExtract(
      messages,
      validMemberMap,
      channelName || 'channel',
      Array.isArray(existingTasks) ? existingTasks.map((t: any) => String(t.title || '')) : []
    );

    const validated = validateAndSanitizeAnalysis(
      fallbackData,
      validMessageIds,
      validMemberMap,
      memberNameToId,
      channelName || 'channel'
    );
    return res.json({ ...validated, mode: 'basic', notice: fallbackReason });
  } catch (err: any) {
    console.error('Error in /api/analyze-conversation:', err);
    return res.status(500).json({
      error: 'Failed to analyze conversation',
      details: err.message || String(err),
    });
  }
});


export default app;
