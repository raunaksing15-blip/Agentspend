
# Verification Evidence

**Current status: no build, tests, deployment, or real payment has been verified.**

| Gate | Command / evidence | Status |
|---|---|---|
| Rust formatting | `cargo fmt --check` | NOT RUN |
| Contract unit tests | `cargo test` | NOT RUN |
| WASM build | `cargo build --target wasm32-unknown-unknown --release` | NOT RUN |
| Sandbox tests | `node --test tests-sandbox/async.test.cjs` | NOT RUN |
| API typecheck/build | `npm run build:api` | NOT RUN |
| Frontend build | `npm run build:web` | NOT RUN |
| Testnet deployment | Contract account + code hash | NOT DEPLOYED |
| Real payment | Transaction hash + receipt IDs + balance delta | NOT EXECUTED |
| Owner approval | Owner-signed receipt + final contract state | NOT EXECUTED |
| Agent approval denial | Agent-key protocol error | NOT EXECUTED |
| Demo recording | Video and screenshots | NOT RECORDED |

Fill this document only with captured command output and verifiable testnet evidence. Do not replace NOT RUN with PASS based on code inspection.
