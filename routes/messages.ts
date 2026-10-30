import { Router } from 'express';
import pool from '../db';
import requireAuth, { AuthedRequest } from '../middleware/auth';

const router = Router();

const getChannel = async (channelId: string) =>
  (await pool.query('SELECT id, project_id FROM channels WHERE id = $1', [channelId])).rows[0];

const isMember = async (projectId: string, userId: string) =>
  (await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )).rowCount! > 0;

const MESSAGE_QUERY = `
  SELECT m.*, u.name, u.avatar, u.role
  FROM messages m
  JOIN users u ON u.id = m.sender_id
`;

const shape = (m: any) => ({
  id: m.id,
  channelId: m.channel_id,
  projectId: m.project_id,
  senderId: m.sender_id,
  senderName: m.name,
  senderAvatar: m.avatar,
  senderRole: m.role,
  content: m.content,
  timestamp: m.created_at,
  reactions: m.reactions || {},
  codeSnippet: m.code_snippet || undefined,
});

router.get('/channels/:cid/messages', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ch = await getChannel(req.params.cid);
    if (!ch || !(await isMember(ch.project_id, req.user!.id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const r = await pool.query(
      `${MESSAGE_QUERY} WHERE m.channel_id = $1 ORDER BY m.created_at ASC LIMIT 500`,
      [req.params.cid]
    );
    res.json(r.rows.map(shape));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/channels/:cid/messages', requireAuth, async (req: AuthedRequest, res) => {
  const content = (req.body.content || '').trim();
  if (!content || content.length > 4000) {
    return res.status(400).json({ error: 'Content required (max 4000 chars)' });
  }
  try {
    const ch = await getChannel(req.params.cid);
    if (!ch || !(await isMember(ch.project_id, req.user!.id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const ins = await pool.query(
      `INSERT INTO messages (channel_id, project_id, sender_id, content, code_snippet)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [ch.id, ch.project_id, req.user!.id, content, req.body.codeSnippet || null]
    );
    const r = await pool.query(`${MESSAGE_QUERY} WHERE m.id = $1`, [ins.rows[0].id]);
    res.status(201).json(shape(r.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;