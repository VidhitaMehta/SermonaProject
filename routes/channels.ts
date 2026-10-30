import { Router } from 'express';
import pool from '../db';
import requireAuth, { AuthedRequest } from '../middleware/auth';

const router = Router();

const isMember = async (projectId: string, userId: string) =>
  (await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )).rowCount! > 0;

const shape = (c: any) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  topic: c.topic,
  projectId: c.project_id,
});

router.get('/projects/:pid/channels', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!(await isMember(req.params.pid, req.user!.id))) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }
    const r = await pool.query(
      'SELECT * FROM channels WHERE project_id = $1 ORDER BY created_at',
      [req.params.pid]
    );
    res.json(r.rows.map(shape));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/projects/:pid/channels', requireAuth, async (req: AuthedRequest, res) => {
  const name = (req.body.name || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    if (!(await isMember(req.params.pid, req.user!.id))) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }
    const r = await pool.query(
      'INSERT INTO channels (project_id, name, topic) VALUES ($1, $2, $3) RETURNING *',
      [req.params.pid, name, req.body.topic || '']
    );
    res.status(201).json(shape(r.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;