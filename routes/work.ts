import { Router } from 'express';
import pool from '../db';
import requireAuth, { AuthedRequest } from '../middleware/auth';

const router = Router();

// ---------- helpers ----------
const memberOf = async (pid: string, uid: string) =>
  (await pool.query(
    'SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',
    [pid, uid]
  )).rowCount! > 0;

const projectOf = async (table: 'tasks' | 'decisions' | 'questions' | 'messages' | 'channels', id: string) =>
  (await pool.query(`SELECT project_id FROM ${table} WHERE id=$1`, [id])).rows[0]?.project_id as string | undefined;

function buildUpdate(body: any, fields: Record<string, string>) {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, col] of Object.entries(fields)) {
    if (k in body) {
      vals.push(body[k]);
      sets.push(`${col}=$${vals.length}`);
    }
  }
  return { sets, vals };
}

// ---------- shapes ----------
const taskShape = (t: any) => ({
  id: t.id,
  projectId: t.project_id,
  title: t.title,
  description: t.description,
  assigneeId: t.assignee_id,
  assigneeName: t.assignee_name || null,
  assigneeAvatar: t.assignee_avatar || null,
  deadline: t.deadline,
  status: t.status,
  priority: t.priority,
  sourceMessageIds: t.source_message_ids || [],
  source: t.source,
  confidence: t.confidence,
  evidenceSnippet: t.evidence_snippet,
  missingInformation: t.missing_information,
  completed: t.completed,
  tags: t.tags || [],
  recommendedSkills: t.recommended_skills || [],
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

const decisionShape = (d: any) => ({
  id: d.id,
  projectId: d.project_id,
  channelId: d.channel_id,
  title: d.title,
  description: d.description,
  rationale: d.rationale,
  status: d.status,
  sourceMessageIds: d.source_message_ids || [],
  evidenceSnippet: d.evidence_snippet,
  confidence: d.confidence,
  confirmedBy: d.confirmed_by,
  createdAt: d.created_at,
});

const questionShape = (q: any) => ({
  id: q.id,
  projectId: q.project_id,
  channelId: q.channel_id,
  question: q.question,
  status: q.status,
  sourceMessageIds: q.source_message_ids || [],
  category: q.category,
  context: q.context,
  suggestedNextStep: q.suggested_next_step,
  urgency: q.urgency,
  ownerId: q.owner_id,
  ownerName: q.owner_name || null,
  createdAt: q.created_at,
});

const TASK_SELECT = `
  SELECT t.*, a.name AS assignee_name, a.avatar AS assignee_avatar
  FROM tasks t LEFT JOIN users a ON a.id = t.assignee_id`;
const QUESTION_SELECT = `
  SELECT q.*, o.name AS owner_name
  FROM questions q LEFT JOIN users o ON o.id = q.owner_id`;

const fail = (res: any, err: any) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
};

// ================= TASKS =================
router.get('/projects/:pid/tasks', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!(await memberOf(req.params.pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const r = await pool.query(`${TASK_SELECT} WHERE t.project_id=$1 ORDER BY t.created_at DESC`, [req.params.pid]);
    res.json(r.rows.map(taskShape));
  } catch (e) { fail(res, e); }
});

router.post('/projects/:pid/tasks', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'Title required' });
  try {
    if (!(await memberOf(req.params.pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const ins = await pool.query(
      `INSERT INTO tasks (project_id, channel_id, title, description, assignee_id, deadline, status, priority,
         source_message_ids, source, confidence, evidence_snippet, missing_information, tags, recommended_skills)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [
        req.params.pid, b.channelId || null, String(b.title).trim(), b.description || '',
        b.assigneeId || null, b.deadline || null, b.status || 'todo', b.priority || 'medium',
        b.sourceMessageIds || [], b.source || 'manual', b.confidence ?? null,
        b.evidenceSnippet || null, b.missingInformation || null, b.tags || [], b.recommendedSkills || [],
      ]
    );
    const r = await pool.query(`${TASK_SELECT} WHERE t.id=$1`, [ins.rows[0].id]);
    res.status(201).json(taskShape(r.rows[0]));
  } catch (e) { fail(res, e); }
});

router.patch('/tasks/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const pid = await projectOf('tasks', req.params.id);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const { sets, vals } = buildUpdate(req.body || {}, {
      title: 'title', description: 'description', assigneeId: 'assignee_id', deadline: 'deadline',
      status: 'status', priority: 'priority', completed: 'completed', tags: 'tags',
      evidenceSnippet: 'evidence_snippet', missingInformation: 'missing_information', confidence: 'confidence',
    });
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE tasks SET ${sets.join(', ')}, updated_at=now() WHERE id=$${vals.length}`, vals);
    const r = await pool.query(`${TASK_SELECT} WHERE t.id=$1`, [req.params.id]);
    res.json(taskShape(r.rows[0]));
  } catch (e) { fail(res, e); }
});

router.delete('/tasks/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const pid = await projectOf('tasks', req.params.id);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

// ================= DECISIONS =================
router.get('/projects/:pid/decisions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!(await memberOf(req.params.pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const r = await pool.query('SELECT * FROM decisions WHERE project_id=$1 ORDER BY created_at DESC', [req.params.pid]);
    res.json(r.rows.map(decisionShape));
  } catch (e) { fail(res, e); }
});

router.post('/projects/:pid/decisions', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'Title required' });
  try {
    if (!(await memberOf(req.params.pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const r = await pool.query(
      `INSERT INTO decisions (project_id, channel_id, title, description, rationale, status,
         source_message_ids, evidence_snippet, confidence, confirmed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.params.pid, b.channelId || null, String(b.title).trim(), b.description || '', b.rationale || null,
        b.status || 'proposed', b.sourceMessageIds || [], b.evidenceSnippet || null,
        b.confidence ?? null, b.confirmedBy || null,
      ]
    );
    res.status(201).json(decisionShape(r.rows[0]));
  } catch (e) { fail(res, e); }
});

router.patch('/decisions/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const pid = await projectOf('decisions', req.params.id);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const { sets, vals } = buildUpdate(req.body || {}, {
      title: 'title', description: 'description', rationale: 'rationale', status: 'status',
      confirmedBy: 'confirmed_by', evidenceSnippet: 'evidence_snippet',
    });
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE decisions SET ${sets.join(', ')} WHERE id=$${vals.length} RETURNING *`, vals);
    res.json(decisionShape(r.rows[0]));
  } catch (e) { fail(res, e); }
});

// ================= QUESTIONS =================
router.get('/projects/:pid/questions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!(await memberOf(req.params.pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const r = await pool.query(`${QUESTION_SELECT} WHERE q.project_id=$1 ORDER BY q.created_at DESC`, [req.params.pid]);
    res.json(r.rows.map(questionShape));
  } catch (e) { fail(res, e); }
});

router.post('/projects/:pid/questions', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body || {};
  if (!b.question || !String(b.question).trim()) return res.status(400).json({ error: 'Question required' });
  try {
    if (!(await memberOf(req.params.pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const ins = await pool.query(
      `INSERT INTO questions (project_id, channel_id, question, status, source_message_ids, category,
         context, suggested_next_step, urgency, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [
        req.params.pid, b.channelId || null, String(b.question).trim(), b.status || 'unresolved',
        b.sourceMessageIds || [], b.category || null, b.context || null,
        b.suggestedNextStep || null, b.urgency || null, b.ownerId || null,
      ]
    );
    const r = await pool.query(`${QUESTION_SELECT} WHERE q.id=$1`, [ins.rows[0].id]);
    res.status(201).json(questionShape(r.rows[0]));
  } catch (e) { fail(res, e); }
});

router.patch('/questions/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const pid = await projectOf('questions', req.params.id);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const { sets, vals } = buildUpdate(req.body || {}, {
      status: 'status', ownerId: 'owner_id', question: 'question', context: 'context',
      suggestedNextStep: 'suggested_next_step', urgency: 'urgency',
    });
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    await pool.query(`UPDATE questions SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
    const r = await pool.query(`${QUESTION_SELECT} WHERE q.id=$1`, [req.params.id]);
    res.json(questionShape(r.rows[0]));
  } catch (e) { fail(res, e); }
});

// ================= AI ANALYSES =================
router.post('/channels/:cid/analyses', requireAuth, async (req: AuthedRequest, res) => {
  const result = req.body?.result;
  if (!result || typeof result !== 'object') return res.status(400).json({ error: 'result object required' });
  try {
    const pid = await projectOf('channels', req.params.cid);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const r = await pool.query(
      'INSERT INTO analyses (project_id, channel_id, result) VALUES ($1,$2,$3) RETURNING id, created_at',
      [pid, req.params.cid, JSON.stringify(result)]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { fail(res, e); }
});

router.get('/channels/:cid/analyses/latest', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const pid = await projectOf('channels', req.params.cid);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const r = await pool.query(
      'SELECT result, created_at FROM analyses WHERE channel_id=$1 ORDER BY created_at DESC LIMIT 1',
      [req.params.cid]
    );
    res.json(r.rows[0] ? { ...r.rows[0].result, savedAt: r.rows[0].created_at } : null);
  } catch (e) { fail(res, e); }
});

// ================= REACTIONS =================
router.post('/messages/:mid/reactions', requireAuth, async (req: AuthedRequest, res) => {
  const emoji = String(req.body?.emoji || '').trim();
  if (!emoji || emoji.length > 16) return res.status(400).json({ error: 'emoji required' });
  try {
    const pid = await projectOf('messages', req.params.mid);
    if (!pid || !(await memberOf(pid, req.user!.id))) return res.status(403).json({ error: 'Forbidden' });
    const m = await pool.query('SELECT reactions FROM messages WHERE id=$1', [req.params.mid]);
    const reactions: Record<string, string[]> = m.rows[0].reactions || {};
    const list = reactions[emoji] || [];
    reactions[emoji] = list.includes(req.user!.id) ? list.filter((u) => u !== req.user!.id) : [...list, req.user!.id];
    if (!reactions[emoji].length) delete reactions[emoji];
    await pool.query('UPDATE messages SET reactions=$1 WHERE id=$2', [JSON.stringify(reactions), req.params.mid]);
    res.json({ reactions });
  } catch (e) { fail(res, e); }
});

export default router;