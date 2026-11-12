
import type { ChainPort, RequestInput, Decision } from './ports.js';

const YOCTO = 10n ** 24n;

/**
 * Explicitly local-only simulator. It is not the source of truth for funds,
 * does not submit transactions, and never produces a transaction hash.
 */
export class LocalSimulationChain implements ChainPort {
  contractId = 'SIMULATION_ONLY';
  private seen = new Set<string>();
  private spent = 0n;
  private reserved = 0n;
  private recipients = new Set(['vendor.test.near', 'cloud.test.near']);

  async simulate(input: RequestInput) {
    const amount = BigInt(input.amountYocto);
    let decision: Decision = 'APPROVED_FOR_EXECUTION';
    let reason = 'Simulation policy checks passed.';
    if (this.seen.has(input.id)) {
      decision = 'REJECTED'; reason = 'Duplicate transaction ID.';
    } else if (!this.recipients.has(input.recipient)) {
      decision = 'REJECTED'; reason = 'Recipient is not on the simulation allowlist.';
    } else if (amount > 2n * YOCTO) {
      decision = 'REJECTED'; reason = 'Exceeds maximum transaction limit (2 NEAR).';
    } else if (this.spent + this.reserved + amount > 5n * YOCTO) {
      decision = 'REJECTED'; reason = 'Exceeds remaining daily budget (5 NEAR).';
    } else if (amount > YOCTO) {
      decision = 'PENDING_APPROVAL'; reason = 'Owner approval required above 1 NEAR.';
    }
    this.seen.add(input.id);
    if (decision === 'APPROVED_FOR_EXECUTION') this.spent += amount;
    if (decision === 'PENDING_APPROVAL') this.reserved += amount;
    return { decision, reason, status: decision === 'APPROVED_FOR_EXECUTION' ? 'SIMULATED_APPROVED' :
      decision === 'PENDING_APPROVAL' ? 'SIMULATED_PENDING' : 'REJECTED' };
  }

  async submitAgentRequest(_input: RequestInput): Promise<{ transactionHash: string }> {
    throw new Error('TESTNET ChainPort adapter is not implemented; refusing to submit.');
  }
  async awaitFinalOutcome(_hash: string) { throw new Error('TESTNET adapter unavailable.'); }
  async viewTransaction(_id: string) { throw new Error('TESTNET adapter unavailable.'); }
}
