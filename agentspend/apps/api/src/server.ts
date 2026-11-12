
import express, { type Express } from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { transactionsRouter } from './routes/transactions.js';
import { requireOwnerSession } from './auth.js';
import { LocalSimulationChain } from './simulation.js';
import { MemoryDb } from './memory-db.js';
import type { ChainPort, Db } from './ports.js';
import { createPostgresDb } from './postgres-db.js';
import { log } from './logger.js';

export function createApp(deps: { chain?: ChainPort; db?: Db } = {}): Express {
  const mode = process.env.EXECUTION_MODE ?? 'SIMULATED';
  if (mode !== 'SIMULATED') {
    throw new Error('TESTNET mode is disabled until a reviewed live ChainPort adapter is configured.');
  }
  const chain = deps.chain ?? new LocalSimulationChain();
  const db = deps.db ?? new MemoryDb();
  if (!deps.db) {
    log('warn', 'persistence.memory_enabled', { mode: process.env.PERSISTENCE_MODE ?? 'memory' });
  }
  const app = express();

  app.use((req, _res, next) => {
    req.requestId = req.header('x-request-id') ?? randomUUID();
    next();
  });
  app.use(helmet());
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin is not allowed'));
    },
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, executionMode: 'SIMULATED', onChain: false }));
  app.use('/api/transactions', transactionsRouter({ chain, db, mode: 'SIMULATED' }));
  app.get('/api/transactions', requireOwnerSession, async (_req, res, next) => {
    try {
      res.json({ items: await db.list(), executionMode: 'SIMULATED' });
    } catch (error) {
      next(error);
    }
  });
  app.get('/api/dashboard/stats', requireOwnerSession, async (_req, res, next) => {
    try {
    const items = await db.list();
    res.json({
      total: items.length,
      simulatedCount: items.length,
      onChainSpentYocto: '0',
      blocked: items.filter(x => x.status === 'REJECTED').length,
      pending: items.filter(x => x.status === 'PendingApproval').length
    });
    } catch (error) {
      next(error);
    }
  });
  app.get('/api/owner-auth-check', requireOwnerSession, (_req, res) => res.json({ authorized: true }));
  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log('error', 'http.request_failed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    res.status(500).json({ error: 'INTERNAL_ERROR', requestId: req.requestId });
  });
  return app;
}

async function start() {
  const persistence = process.env.PERSISTENCE_MODE ?? 'memory';
  let db: Db | undefined;
  if (persistence === 'postgres') {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required when PERSISTENCE_MODE=postgres');
    const postgres = createPostgresDb(databaseUrl);
    await postgres.migrate();
    db = postgres;
  } else if (persistence !== 'memory') {
    throw new Error(`Unsupported PERSISTENCE_MODE: ${persistence}`);
  }
  const port = Number(process.env.PORT ?? 4000);
  createApp({ db }).listen(port, () => log('info', 'api.started', {
    port,
    executionMode: 'SIMULATED',
    persistence,
  }));
}

if (process.argv[1]?.endsWith('/server.ts') || process.argv[1]?.endsWith('/server.js')) {
  start().catch(error => {
    log('error', 'api.start_failed', { error: error instanceof Error ? error.message : 'unknown_error' });
    process.exitCode = 1;
  });
}
