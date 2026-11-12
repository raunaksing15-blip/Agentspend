import { Pool } from 'pg';
import type { Db, Decision, RequestInput } from './ports.js';

type SimulatedInput = RequestInput & {
  decision: { decision: Decision; reason: string; status: string };
};

export class PostgresDb implements Db {
  constructor(private readonly pool: Pool) {}

  async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_requests (
        record_id BIGSERIAL PRIMARY KEY,
        id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        amount_yocto NUMERIC(78, 0) NOT NULL CHECK (amount_yocto > 0),
        purpose TEXT NOT NULL,
        expires_at_ns NUMERIC(20, 0) NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        execution_mode TEXT NOT NULL,
        near_tx_hash TEXT,
        on_chain BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS transaction_requests_agent_created_idx
        ON transaction_requests (agent_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS transaction_requests_id_created_idx
        ON transaction_requests (id, created_at DESC);
      CREATE INDEX IF NOT EXISTS transaction_requests_status_created_idx
        ON transaction_requests (status, created_at DESC);
    `);
  }

  async recordSimulated(input: SimulatedInput) {
    const result = await this.pool.query(
      `INSERT INTO transaction_requests
        (id, agent_id, recipient, amount_yocto, purpose, expires_at_ns,
         decision, reason, status, execution_mode, near_tx_hash, on_chain)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SIMULATED', NULL, FALSE)
       RETURNING id, agent_id AS "agentId", recipient, amount_yocto::text AS "amountYocto",
         purpose, expires_at_ns::text AS "expiresAtNs", decision, reason, status,
         execution_mode AS "executionMode", near_tx_hash AS "nearTxHash",
         on_chain AS "onChain", created_at AS "createdAt"`,
      [
        input.id,
        input.agentId,
        input.recipient,
        input.amountYocto,
        input.purpose,
        input.expiresAtNs,
        input.decision.decision,
        input.decision.reason,
        input.decision.status,
      ],
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async list() {
    const result = await this.pool.query(
      `SELECT id, agent_id AS "agentId", recipient, amount_yocto::text AS "amountYocto",
        purpose, expires_at_ns::text AS "expiresAtNs", decision, reason, status,
        execution_mode AS "executionMode", near_tx_hash AS "nearTxHash",
        on_chain AS "onChain", created_at AS "createdAt"
       FROM transaction_requests
       ORDER BY created_at DESC
       LIMIT 500`,
    );
    return result.rows as Array<Record<string, unknown>>;
  }

  async close() {
    await this.pool.end();
  }
}

export function createPostgresDb(databaseUrl: string) {
  return new PostgresDb(new Pool({ connectionString: databaseUrl }));
}
