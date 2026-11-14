#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_URL="${AGENTSPEND_API_URL:-http://127.0.0.1:4000}"
API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! curl --silent --fail "$API_URL/api/health" >/dev/null 2>&1; then
  echo "Starting local simulation API..."
  (
    cd "$ROOT_DIR"
    AGENT_API_TOKEN="${AGENT_API_TOKEN:-demo-agent-token}" \
    AGENT_ACCOUNT_ID="${AGENT_ACCOUNT_ID:-agent.demo.near}" \
    OWNER_API_TOKEN="${OWNER_API_TOKEN:-demo-owner-token}" \
    EXECUTION_MODE=SIMULATED \
    PERSISTENCE_MODE=memory \
    npm --workspace @agentspend/api exec tsx src/server.ts
  ) &
  API_PID=$!
  for _ in {1..30}; do
    curl --silent --fail "$API_URL/api/health" >/dev/null 2>&1 && break
    sleep 1
  done
fi

cd "$ROOT_DIR"
AGENTSPEND_API_URL="$API_URL" \
AGENT_API_TOKEN="${AGENT_API_TOKEN:-demo-agent-token}" \
OWNER_API_TOKEN="${OWNER_API_TOKEN:-demo-owner-token}" \
node scripts/demo.mjs
