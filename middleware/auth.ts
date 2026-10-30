import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface AuthedRequest extends Request {
  user?: { id: string; name: string };
}

export default function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; name: string };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}