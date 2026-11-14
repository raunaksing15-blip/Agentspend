
# Verification Evidence

**Updated 2026-11-14. Current status: contract host tests, API tests, local demo,
and frontend production build are verified; Wasm target, sandbox, PostgreSQL
runtime, deployment, and real-payment verification remain pending.**

| Gate | Command / evidence | Status |
|---|---|---|
| Rust formatting | `cd agentspend && cargo fmt --manifest-path contracts/agentspend/Cargo.toml --check` | PASS |
| Contract unit tests | `cd agentspend && cargo test --manifest-path contracts/agentspend/Cargo.toml` | PASS — 23 passed |
| WASM build | `cd agentspend && cargo build --manifest-path contracts/agentspend/Cargo.toml --target wasm32-unknown-unknown --release` | BLOCKED — target not installed |
| Sandbox tests | `cd agentspend && npm run test:sandbox` | BLOCKED — `near-workspaces` module is unavailable |
| API typecheck/build | `cd agentspend && npm run build:api` | PASS |
| API security tests | `cd agentspend && npm run test:api` | PASS — 7 passed |
| Local demonstration | `cd agentspend && ./scripts/demo.sh` | PASS — policy scenarios and owner dashboard completed |
| Frontend build | `cd agentspend && npm run build:web` | PASS — Next.js production build |
| Diff whitespace | `cd agentspend && git diff --check` | PASS |
| Dependency audit | `cd agentspend && npm audit --omit=dev --json` | FAIL/known risk — 3 vulnerabilities: 1 critical, 2 high |
| PostgreSQL integration | `PERSISTENCE_MODE=postgres` with live PostgreSQL | NOT RUN — no database configured |
| Testnet deployment | Contract account + code hash | NOT DEPLOYED |
| Real payment | Transaction hash + receipt IDs + balance delta | NOT EXECUTED |
| Owner approval | Owner-signed receipt + final contract state | NOT EXECUTED |
| Agent approval denial | Agent-key protocol error | NOT EXECUTED |
| Demo recording | Video and screenshots | NOT RECORDED |

Fill this document only with captured command output and verifiable testnet evidence. Do not replace blocked or pending gates with PASS based on code inspection.
