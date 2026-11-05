/**
 * Rule-based conversation extractor used when Gemini is unavailable.
 *
 * It is deliberately simple and honest: it only reports things it can point to
 * in the actual messages (with their message IDs), and the response is labelled
 * "basic mode" in the UI so nobody mistakes it for real AI output.
 */

interface InMessage {
  id: string;
  senderId?: string;
  senderName?: string;
  content?: string;
}

const MAX_ITEMS = 8;

const DECISION_RE =
  /\b(decision confirmed|confirmed:|we(?:'ve| have)? decided|decided to|let(?:'s| us) go with|we(?:'re| are) going with|we(?:'ll| will) go with|we agree|agreed|final decision|we will use|we'll use|going forward we)\b/i;
const CONFIRMED_RE = /\b(decision confirmed|confirmed:|decided|agreed|we agree|final decision)\b/i;

const SELF_COMMIT_RE = /\b(i(?:'ll| will)|i can|i(?:'m| am) going to|i(?:'ll| will) take|i(?:'m| am) on it|i(?:'ll| will) handle)\b/i;
const REQUEST_RE = /\b(can you|could you|would you|please|todo|to-do|action item|needs? to|we need to|someone should)\b/i;

const IDEA_RE = /\b(what if|how about|maybe we (?:could|should)|idea:|we could|i suggest|suggestion:|it might be worth)\b/i;

const DEADLINE_RE =
  /\b(?:by|before|until|due|on)\s+((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*(?:day)?(?:,?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2})?(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight|morning|afternoon|evening|night|eod))?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight|morning|afternoon|evening|night|eod))?|tomorrow(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight|morning|afternoon|evening|night|eod))?|tonight|end of (?:the )?(?:day|week)|eod|eow|noon|\d{1,2}(?::\d{2})?\s*(?:am|pm))/i;

const STOPWORDS = new Set(
  'about above after again against because before being below between could doing during further having other should their there these those through under until where which while would your yours yourself been were will with that this from they them then than what when into just also have more most some such only very okay yeah thanks think going really maybe need needs want lets sure great right make sounds'.split(
    ' '
  )
);

const stripMarkdown = (text: string) => text.replace(/\*\*|__|`/g, '');

const splitSentences = (text: string) =>
  stripMarkdown(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Turn "I'll push the cleaned parquet files by Wednesday." into "Push the cleaned parquet files". */
function taskTitleFrom(sentence: string): string {
  const t = sentence
    .replace(/^(ok(?:ay)?|so|also|and|yes|yeah|great|sure)[,!]?\s+/i, '')
    .replace(/^@?[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)?,\s+/, '') // leading "@Liam Scott," / "Sophia,"
    .replace(/^(ok(?:ay)?|so|also|and)[,!]?\s+/i, '')
    .replace(/\b(i(?:'ll| will)|i can|i(?:'m| am) going to|i(?:'ll| will) take care of|can you|could you|would you|please|we need to|someone should|needs? to)\s+/i, '')
    .replace(DEADLINE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/[?.!,]+$/, '')
    .trim();
  return clip(capitalise(t), 90) || clip(sentence, 90);
}

export function basicExtract(
  messages: InMessage[],
  memberMap: Map<string, string>, // id -> full name
  channelName: string,
  existingTaskTitles: string[]
) {
  const members = Array.from(memberMap.entries()).map(([id, name]) => ({
    id,
    name,
    first: name.split(/\s+/)[0].toLowerCase(),
  }));
  const existing = existingTaskTitles.map((t) => t.toLowerCase());

  const decisions: any[] = [];
  const proposedTasks: any[] = [];
  const unresolvedQuestions: any[] = [];
  const ideas: any[] = [];
  const perSender = new Map<string, number>();
  const wordCounts = new Map<string, number>();

  messages.forEach((m, mi) => {
    const content = String(m.content || '');
    const sender = m.senderName || 'Someone';
    perSender.set(sender, (perSender.get(sender) || 0) + 1);

    for (const w of content.toLowerCase().match(/[a-z][a-z0-9+#-]{4,}/g) || []) {
      if (!STOPWORDS.has(w)) wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    }

    for (const sentence of splitSentences(content)) {
      const isQuestion = sentence.endsWith('?');

      // Decisions
      if (DECISION_RE.test(sentence) && !isQuestion && decisions.length < MAX_ITEMS) {
        const confirmed = CONFIRMED_RE.test(sentence);
        decisions.push({
          decisionId: `dec_basic_${mi}_${decisions.length}`,
          title: clip(sentence.replace(/^(decision confirmed|confirmed)\s*[:\-–]\s*/i, ''), 90),
          description: sentence,
          status: confirmed ? 'confirmed' : 'proposed',
          supportingMessageIds: [m.id],
          confidence: confirmed ? 0.7 : 0.5,
          evidenceSnippet: clip(sentence, 160),
          confirmedBy: confirmed ? sender : undefined,
        });
        continue;
      }

      // Tasks: someone commits ("I'll…") or asks someone to do something ("Alex, can you…")
      const selfCommit = SELF_COMMIT_RE.test(sentence) && !isQuestion;
      const request = REQUEST_RE.test(sentence);
      if ((selfCommit || request) && proposedTasks.length < MAX_ITEMS) {
        const title = taskTitleFrom(sentence);
        if (existing.some((e) => e && (e.includes(title.toLowerCase()) || title.toLowerCase().includes(e)))) continue;

        let assigneeId: string | null = null;
        let suggestedAssignee: string | null = null;
        if (selfCommit && m.senderId && memberMap.has(m.senderId)) {
          assigneeId = m.senderId;
          suggestedAssignee = memberMap.get(m.senderId) || null;
        } else {
          const lower = sentence.toLowerCase();
          const named = members.find(
            (mem) => mem.first.length >= 2 && new RegExp(`(^|[^a-z])@?${mem.first}([^a-z]|$)`).test(lower) && mem.id !== m.senderId
          );
          if (named) {
            assigneeId = named.id;
            suggestedAssignee = named.name;
          }
        }
        const deadlineMatch = sentence.match(DEADLINE_RE);
        const deadline = deadlineMatch ? deadlineMatch[1] : null;

        proposedTasks.push({
          taskId: `task_basic_${mi}_${proposedTasks.length}`,
          title,
          description: `From ${sender} in #${channelName}: "${clip(sentence, 200)}"`,
          assigneeId,
          suggestedAssignee,
          deadline,
          priority: /\b(urgent|asap|blocker|critical)\b/i.test(sentence) ? 'urgent' : deadline ? 'high' : 'medium',
          status: 'proposed',
          supportingMessageIds: [m.id],
          confidence: selfCommit ? 0.65 : 0.5,
          evidenceSnippet: clip(sentence, 160),
          recommendedSkills: [],
        });
        continue; // a request phrased as a question ("can you…?") is a task, not an open question
      }

      // Open questions
      if (isQuestion && unresolvedQuestions.length < MAX_ITEMS) {
        // Treat it as answered if a different person replied right after
        const next = messages[mi + 1];
        const likelyAnswered = Boolean(next && next.senderId !== m.senderId && !String(next.content || '').trim().endsWith('?'));
        unresolvedQuestions.push({
          id: `q_basic_${mi}_${unresolvedQuestions.length}`,
          question: clip(sentence, 200),
          supportingMessageIds: [m.id],
          category: 'explicitly_asked',
          context: `Asked by ${sender}${likelyAnswered ? '; someone replied, but check whether it was actually settled' : '; no reply found'}.`,
          suggestedNextStep: likelyAnswered ? 'Confirm the answer and mark it resolved.' : 'Assign someone to answer this.',
          urgency: likelyAnswered ? 'low' : 'medium',
        });
        continue;
      }

      // Ideas
      if (IDEA_RE.test(sentence) && ideas.length < MAX_ITEMS) {
        ideas.push({
          id: `idea_basic_${mi}_${ideas.length}`,
          title: clip(sentence, 90),
          description: sentence,
          proposedBy: sender,
          supportingMessageIds: [m.id],
        });
      }
    }
  });

  const participants = Array.from(perSender.entries()).sort((a, b) => b[1] - a[1]);
  const topics = Array.from(wordCounts.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => capitalise(w));

  const summary =
    `${messages.length} message${messages.length === 1 ? '' : 's'} in #${channelName} from ` +
    `${participants.map(([n]) => n).slice(0, 4).join(', ')}${participants.length > 4 ? ` and ${participants.length - 4} more` : ''}. ` +
    `Keyword scan found ${decisions.length} decision${decisions.length === 1 ? '' : 's'}, ` +
    `${proposedTasks.length} possible task${proposedTasks.length === 1 ? '' : 's'} and ` +
    `${unresolvedQuestions.length} question${unresolvedQuestions.length === 1 ? '' : 's'}.`;

  const unassigned = proposedTasks.filter((t) => !t.assigneeId).length;

  return {
    summary,
    decisions,
    proposedTasks,
    unresolvedQuestions,
    ideas,
    teamInsights: {
      observations: participants.length > 0 ? [`Most active: ${participants[0][0]} (${participants[0][1]} messages).`] : [],
      workloadDistribution: participants.map(([n, c]) => `${n}: ${c} msg`).join(' · ') || 'No messages.',
      collaborationGaps: unassigned > 0 ? [`${unassigned} possible task(s) have no clear owner.`] : [],
      keyTopics: topics.length > 0 ? topics : ['General discussion'],
      teamAlignment: 'Not assessed in basic mode.',
      sentiment: 'collaborative',
    },
  };
}
