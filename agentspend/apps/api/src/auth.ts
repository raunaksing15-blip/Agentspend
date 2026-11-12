
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

function bearerToken(req: Request) {
  const header = req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}

function tokenMatches(supplied: string | null, expected: string | undefined) {
  if (!supplied || !expected) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes);
}

export function agentAuth(req: Request, res: Response, next: NextFunction) {
  const token = process.env.AGENT_API_TOKEN;
  const accountId = process.env.AGENT_ACCOUNT_ID;
  if (!accountId || !tokenMatches(bearerToken(req), token)) {
    return res.status(401).json({ error: 'UNAUTHENTICATED_AGENT' });
  }
  req.auth = { agentAccountId: accountId, role: 'agent' };
  next();
}

export function requireOwnerSession(req: Request, res: Response, next: NextFunction) {
  const token = process.env.OWNER_API_TOKEN;
  if (!tokenMatches(bearerToken(req), token)) {
    return res.status(403).json({ error: 'OWNER_SESSION_REQUIRED' });
  }
  req.auth = { role: 'owner' };
  next();
}
