
import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal shared-secret demo auth. This is not production wallet authentication.
 * Missing credentials fail closed. Replace with signed agent credentials and
 * owner wallet/session verification before any live deployment.
 */
export function agentAuth(req: Request, res: Response, next: NextFunction) {
  const token = process.env.AGENT_API_TOKEN;
  const accountId = process.env.AGENT_ACCOUNT_ID;
  const supplied = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !accountId || !supplied || supplied !== token) {
    return res.status(401).json({ error: 'UNAUTHENTICATED_AGENT' });
  }
  req.auth = { agentAccountId: accountId, role: 'agent' };
  next();
}

export function requireOwnerSession(req: Request, res: Response, next: NextFunction) {
  const token = process.env.OWNER_API_TOKEN;
  const supplied = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !supplied || supplied !== token) {
    return res.status(403).json({ error: 'OWNER_SESSION_REQUIRED' });
  }
  req.auth = { role: 'owner' };
  next();
}
