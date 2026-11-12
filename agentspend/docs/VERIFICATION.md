
# Verification Evidence

**Current status: contract and API local verification is complete; PostgreSQL runtime, sandbox, deployment, and real-payment verification remain pending.**

| Gate | Command / evidence | Status |
|---|---|---|
| Rust formatting | `cd contracts/agentspend && cargo fmt --check` | PASS |
| Contract unit tests | `cd contracts/agentspend && cargo test` | PASS — 23 passed |
| WASM build | `cd contracts/agentspend && cargo build --target wasm32-unknown-unknown --release` | PASS |
| Sandbox tests | `npm run test:sandbox` | BLOCKED — near-sandbox binary download failed; dependent workers reported lock contention |
| API typecheck/build | `npm run build:api` | PASS |
| API security tests | `npm run test:api` | PASS — 7 passed |
| PostgreSQL adapter typecheck | `npm run build:api` | PASS |
| PostgreSQL integration | `PERSISTENCE_MODE=postgres` with live PostgreSQL | NOT RUN — no database configured |
| Frontend build | `npm run build:web` | NOT RUN |
| Testnet deployment | Contract account + code hash | NOT DEPLOYED |
| Real payment | Transaction hash + receipt IDs + balance delta | NOT EXECUTED |
| Owner approval | Owner-signed receipt + final contract state | NOT EXECUTED |
| Agent approval denial | Agent-key protocol error | NOT EXECUTED |
| Demo recording | Video and screenshots | NOT RECORDED |

Fill this document only with captured command output and verifiable testnet evidence. Do not replace blocked or pending gates with PASS based on code inspection.
