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
