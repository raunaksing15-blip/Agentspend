
# AgentSpend Project Status

**Updated:** 2026-11-14 from commands executed in this worktree.
**Overall:** Local demo, API, contract unit tests, and frontend build are verified; Wasm target, sandbox dependencies, PostgreSQL runtime, and testnet deployment remain blocked or pending.

| Component | Status |
|---|---|
| Rust contract source | Hardened; local host tests compile against `near-sdk = 5.17.2` |
| Rust unit tests | Verified: 23 passed |
| Wasm release build | Blocked: `wasm32-unknown-unknown` target is not installed |
| Sandbox async tests | Blocked: `near-workspaces` is not installed; sandbox binary availability is unverified |
| API transaction route | Simulation-only; TypeScript build passes |
| API security tests | 7 passed |
| API authentication | Constant-time shared-secret demo middleware; wallet/session auth still required for production |
| Database | PostgreSQL adapter and indexed migration added; memory store remains local default |
| Testnet adapter | NOT IMPLEMENTED |
| Next.js frontend | API-connected dashboard; production build and type-check verified |
| Testnet deployment | NOT performed |
| Real payment receipts | None supplied |
| External security audit | Not performed |

## Critical integrity note
The conversation's initial v1 code contained fake `sim_exec_*` hashes and backend approval shortcuts. Those are not included as the active implementation. The contract now has evidence-backed local compilation, formatting, unit-test, and Wasm-build results. No testnet deployment, real receipt, or external audit is claimed.

See `docs/VERIFICATION.md` for gates and `docs/SECURITY.md` for residual risks.
