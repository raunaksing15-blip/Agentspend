
# Three-Builder Task Board

| Workstream | Owner | Status | Acceptance gate |
|---|---|---|---|
| Rust contract and contract tests | Builder 1 — blockchain | Authored / unverified | `cargo test` and WASM build pass; review async settlement and invariants |
| Sandbox async tests | Builder 1 + Builder 3 | Authored / unverified | Real sandbox receipts prove success, failure, replay and approval paths |
| API, auth and persistence | Builder 2 — full-stack | Partial scaffold | API tests pass; real agent auth and owner wallet/session integration |
| Web dashboard | Builder 2 — full-stack | Presentation scaffold | Responsive UI connected to real API states; no simulated values shown as on-chain |
| Scoped agent key | Builder 1 | Script authored / unverified | Testnet key cannot call owner methods and has bounded allowance |
| Integration and QA | Builder 3 | Not verified | E2E tests, threat model review, regression suite |
| Documentation and demo | Builder 3 | Drafted | Actual build/test/receipt evidence and recorded demo |

## Shared interface contract
- Amounts are decimal strings in yoctoNEAR.
- Agent identity is derived from authenticated credentials, never trusted from request JSON.
- Simulation results have `executionMode=SIMULATED`, `onChain=false`, and `nearTxHash=null`.
- Owner approvals are signed by the owner account and enforced by the contract.
