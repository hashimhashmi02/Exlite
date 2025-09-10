import jwt from 'jsonwebtoken';
import { env } from './env.js';

type MagicTokenPayload = { email: string; kind: 'magic'; };
type SessionPayload = { email: string; kind: 'session'; };

export function createMagicToken(email: string) {
  const payload: MagicTokenPayload = { email, kind: 'magic' };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '10m' }); // short TTL
}

export function verifyMagicToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_SECRET) as MagicTokenPayload;
  if (decoded.kind !== 'magic') throw new Error('Invalid token kind');
  return decoded;
}

export function createSessionToken(email: string) {
  const payload: SessionPayload = { email, kind: 'session' };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_SECRET) as SessionPayload;
  if (decoded.kind !== 'session') throw new Error('Invalid token kind');
  return decoded;
}
