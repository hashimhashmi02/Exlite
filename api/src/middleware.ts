import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from './auth.js';
import './types.js'; // Import to extend Express Request

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.session as string | undefined;

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) return res.status(401).json({ error: 'Unauthenticated' });
  try {
    const payload = verifySessionToken(token);
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

export function getUserEmail(req: Request): string {
  return req.userEmail as string;
}
