
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { transactionsRouter } from './routes/transactions.js';
import { agentAuth, requireOwnerSession } from './auth.js';
import { LocalSimulationChain } from './simulation.js';
import { MemoryDb } from './memory-db.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const mode = process.env.EXECUTION_MODE ?? 'SIMULATED';
if (mode !== 'SIMULATED') {
  throw new Error('TESTNET mode is disabled until a reviewed live ChainPort adapter is configured.');
}
const chain = new LocalSimulationChain();
const db = new MemoryDb();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '16kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ ok: true, executionMode: 'SIMULATED', onChain: false }));
app.use('/api/transactions', agentAuth, transactionsRouter({ chain, db, mode: 'SIMULATED' }));
app.get('/api/transactions', (_req, res) => res.json({ items: db.list(), executionMode: 'SIMULATED' }));
app.get('/api/dashboard/stats', (_req, res) => {
  const items = db.list();
  res.json({
    total: items.length,
    simulatedCount: items.length,
    onChainSpentYocto: '0',
    blocked: items.filter(x => x.status === 'REJECTED').length,
    pending: items.filter(x => x.status === 'SIMULATED_PENDING').length
  });
});
app.get('/api/owner-auth-check', requireOwnerSession, (_req, res) => res.json({ authorized: true }));
app.listen(port, () => console.log(`AgentSpend API listening on :${port} (SIMULATED ONLY)`));
