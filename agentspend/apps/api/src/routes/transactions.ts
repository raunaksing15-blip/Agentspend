import { z } from 'zod';
import { Router } from 'express';
import { agentAuth, requireOwnerSession } from '../auth.js';
import type { ChainPort, Db } from '../ports.js';
import { log } from '../logger.js';
import { asyncHandler } from '../http.js';

const RequestSchema = z.object({
  id: z.string().min(4).max(64).regex(/^[A-Za-z0-9_-]+$/),
  recipient: z.string().min(2).max(64),
  amountYocto: z.string().regex(/^\d+$/).refine(v => BigInt(v) > 0n),
  purpose: z.string().min(1).max(256),
  expiresAtNs: z.string().regex(/^\d+$/).refine(value => {
    const expiresAt = BigInt(value);
    const now = BigInt(Date.now()) * 1_000_000n;
    return expiresAt > now && expiresAt <= now + 86_400_000_000_000n;
  }, 'Expiration must be within the next 24 hours'),
});

export type ExecutionMode = 'SIMULATED' | 'TESTNET';

export function transactionsRouter(deps: { chain: ChainPort; db: Db; mode: ExecutionMode }) {
  const r = Router();

  r.post('/request', agentAuth, asyncHandler(async (req, res) => {
    const parsed = RequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'VALIDATION', issues: parsed.error.issues });

    // agent identity comes from the authenticated API key, NEVER the body
    const agentId = req.auth?.agentAccountId;
    if (!agentId) return res.status(401).json({ error: 'UNAUTHENTICATED_AGENT' });

    if (deps.mode === 'SIMULATED') {
      const decision = await deps.chain.simulate({ ...parsed.data, agentId });
      const row = await deps.db.recordSimulated({ ...parsed.data, agentId, decision });
      log('info', 'transaction.simulated', {
        requestId: req.requestId,
        id: parsed.data.id,
        decision: decision.decision,
      });
      return res.status(200).json({
        executionMode: 'SIMULATED',
        nearTxHash: null,              // NEVER fabricate a hash
        onChain: false,
        ...row,
      });
    }

    // TESTNET: the agent's own scoped key signs; the API is a relay, not an authority
    const outcome = await deps.chain.submitAgentRequest({ ...parsed.data, agentId });
    const verified = await deps.chain.awaitFinalOutcome(outcome.transactionHash);
    const authoritative = await deps.chain.viewTransaction(parsed.data.id);

    return res.status(200).json({
      executionMode: 'TESTNET',
      onChain: true,
      nearTxHash: verified.transactionHash,
      receiptIds: verified.receiptIds,
      explorerUrl: `https://testnet.nearblocks.io/txns/${verified.transactionHash}`,
      contractStatus: authoritative?.status ?? null,
      settled: authoritative?.status === 'Executed',
    });
  }));

  // Approval authority is on-chain and owner-held. This endpoint is intentionally gone.
  const gone = (_req: any, res: any) => res.status(410).json({
    error: 'APPROVAL_NOT_A_BACKEND_CAPABILITY',
    message: 'The owner must sign approve_payment with their own NEAR key.',
    useInstead: 'POST /api/transactions/:id/approval-intent',
  });
  r.post('/:id/approve', gone);
  r.post('/:id/reject', gone);

  r.post('/:id/approval-intent', requireOwnerSession, asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tx = await deps.chain.viewTransaction(id);
    if (!tx) return res.status(404).json({ error: 'NOT_FOUND' });
    if (tx.status !== 'PendingApproval') return res.status(409).json({ error: 'NOT_PENDING' });
    res.json({
      executionMode: deps.mode,
      unsigned: {
        receiverId: deps.chain.contractId,
        actions: [{ type: 'FunctionCall', methodName: 'approve_payment',
                    args: { id }, gas: '300000000000000', deposit: '0' }],
      },
      cliHint: `near contract call-function as-transaction ${deps.chain.contractId} approve_payment json-args '{"id":"${id}"}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as <OWNER> network-config testnet`,
    });
  }));

  return r;
}
