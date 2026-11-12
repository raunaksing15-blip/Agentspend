
import type { Db, RequestInput, Decision } from './ports.js';

export class MemoryDb implements Db {
  private rows: Array<Record<string, unknown>> = [];
  async recordSimulated(input: RequestInput & { decision: { decision: Decision; reason: string; status: string } }) {
    const row = {
      id: input.id, agentId: input.agentId, recipient: input.recipient,
      amountYocto: input.amountYocto, purpose: input.purpose,
      decision: input.decision.decision, reason: input.decision.reason,
      status: input.decision.status, executionMode: 'SIMULATED',
      nearTxHash: null, onChain: false, createdAt: new Date().toISOString()
    };
    this.rows.push(row);
    return row;
  }
  list() { return [...this.rows]; }
}
