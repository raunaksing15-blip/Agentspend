
export type Decision = 'APPROVED_FOR_EXECUTION' | 'PENDING_APPROVAL' | 'REJECTED';

export interface RequestInput {
  id: string;
  recipient: string;
  amountYocto: string;
  purpose: string;
  expiresAtNs: string;
  agentId: string;
}

export interface ChainPort {
  contractId: string;
  simulate(input: RequestInput): Promise<{ decision: Decision; reason: string; status: string }>;
  submitAgentRequest(input: RequestInput): Promise<{ transactionHash: string }>;
  awaitFinalOutcome(hash: string): Promise<{ transactionHash: string; receiptIds: string[] }>;
  viewTransaction(id: string): Promise<{ status: string } | null>;
}

export interface Db {
  recordSimulated(input: RequestInput & { decision: { decision: Decision; reason: string; status: string } }): Promise<Record<string, unknown>>;
  list(): Promise<Array<Record<string, unknown>>>;
}
