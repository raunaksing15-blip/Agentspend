
import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: { agentAccountId?: string; role?: 'agent' | 'owner' };
      requestId?: string;
    }
  }
}
export {};
