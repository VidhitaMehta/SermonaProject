import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db';
import requireAuth, { AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const shape = (p: any) => ({
  id: p.id,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  ownerId: p.owner_id,
  members: p.members || [],
  createdAt: p.created_at,
  deadline: p.deadline || undefined,
  inviteCode: p.invite_code,
});

const PROJECT_QUERY = `
  SELECT p.*, COALESCE(array_agg(pm.user_id) FILTER (WHERE pm.user_id IS NOT NULL), '{}') AS members
  FROM projects p
  JOIN project_members me ON me.project_id = p.id AND me.user_id = $1
  LEFT JOIN project_members pm ON pm.project_id = p.id
  GROUP BY p.id
  ORDER BY p.created_at
`;

router.post('/', async (req: AuthedRequest, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const code = crypto.randomBytes(4).toString('hex');
    const p = await pool.query(
      `INSERT INTO projects (name, tagline, description, owner_id, invite_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, req.body.tagline || '', req.body.description || '', req.user!.id, code]
    );
    const id = p.rows[0].id;
    await pool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', [id, req.user!.id]);
    await pool.query("INSERT INTO channels (project_id, name, topic) VALUES ($1, 'general', 'General discussion')", [id]);
    res.status(201).json(shape({ ...p.rows[0], members: [req.user!.id] }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req: AuthedRequest, res) => {
  try {
    const r = await pool.query(PROJECT_QUERY, [req.user!.id]);
    res.json(r.rows.map(shape));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/join', async (req: AuthedRequest, res) => {
  const code = (req.body.code || '').trim();
  if (!code) return res.status(400).json({ error: 'Invite code required' });
  try {
    const p = await pool.query('SELECT * FROM projects WHERE invite_code = $1', [code]);
    if (!p.rows[0]) return res.status(404).json({ error: 'Invalid invite code' });
    await pool.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [p.rows[0].id, req.user!.id]
    );
    const r = await pool.query(PROJECT_QUERY, [req.user!.id]);
    res.json(r.rows.map(shape).find((x: any) => x.id === p.rows[0].id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:pid/members', async (req: AuthedRequest, res) => {
  try {
    const me = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.pid, req.user!.id]
    );
    if (!me.rowCount) return res.status(403).json({ error: 'Not a member of this project' });
    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar, u.role, u.skills
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1 ORDER BY u.name`,
      [req.params.pid]
    );
    res.json(r.rows.map((u: any) => ({
      ...u,
      initials: u.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
export default router;