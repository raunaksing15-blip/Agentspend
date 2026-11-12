# AgentSpend Improvement Audit

**Audit date:** 2026-11-12  
**Scope:** repository source, tests, scripts, documentation, dependency manifests, and available local verification commands.

## Executive assessment

AgentSpend contains a promising contract design and honest simulation boundaries, but it is not yet a working end-to-end hackathon submission. The contract currently does not compile, the API does not type-check, the sandbox dependency is undeclared, the frontend is static, and no API tests are discovered. The highest-value next step is to make the contract and API build reproducibly, then add executable regression tests before attempting live NEAR integration.

## Evidence captured

Commands were run from `agentspend/` unless noted:

| Command | Result |
|---|---|
| `node --version && npm --version` | Node `v26.12.1`, npm `11.20.0` |
| `cargo --version && rustc --version` | cargo `1.99.1`, rustc `1.99.1` |
| `npm install --ignore-scripts` | Completed; reported 3 vulnerabilities (2 high, 1 critical) |
| `npm run build:api` | Failed with TypeScript errors in `routes/transactions.ts` and `simulation.ts` |
| `npm run build:web` | Passed; Next.js `14.2.25` static build completed |
| `npm run test:api` | Exit 0 but discovered 0 tests |
| `npm audit --omit=dev --audit-level=high` | Failed: vulnerable `next`, nested `postcss`, and `zod`; force fix requires breaking upgrades |
| `cargo fmt --check` from `contracts/agentspend/` | Failed: source and tests are not rustfmt-clean |
| `cargo test` from `contracts/agentspend/` | Failed: moved `tx.reason` compile error in `src/lib.rs:509` |
| `cargo build --target wasm32-unknown-unknown --release` | Blocked: `wasm32-unknown-unknown` target is not installed |

`npm install` generated `package-lock.json`; Cargo generated `contracts/agentspend/Cargo.lock`. These lockfiles improve reproducibility and should be retained after review.

## Critical findings

### C1 — Contract does not compile

`contracts/agentspend/src/lib.rs:498-509` moves `tx` into storage and then reads `tx.reason` to construct the return value. This is a hard Rust error (`E0382`) and blocks unit tests and Wasm compilation.

### C2 — API does not type-check

`apps/api/src/simulation.ts:42-43` returns `Promise<void>` for methods required by `ChainPort` to return structured outcomes. `apps/api/src/routes/transactions.ts:64` passes `req.params.id`, typed as `string | string[]`, where a string is required. The API cannot be built until these interface and route typing defects are fixed.

### C3 — No real blockchain adapter or settlement path

`apps/api/src/server.ts:12-15` rejects every non-simulation mode. `apps/api/src/simulation.ts:38-43` explicitly throws for submission, finality, and transaction views. There is no actual NEAR RPC/signing/receipt integration, so the repository cannot demonstrate testnet settlement.

### C4 — Frontend is not integrated

`apps/web/app/dashboard/page.tsx` contains hard-coded scenarios and metrics. It has no API client, loading/error states, transaction submission, approval intent flow, audit history, or verified receipt display. The successful frontend build proves only that the static scaffold renders.

## High findings

### H1 — Contract approval can bypass tightened agent policy

`contracts/agentspend/src/lib.rs:675-706` rechecks pause, expiry, recipient allowlisting, and the global transaction cap, but does not re-evaluate the pending transaction against the agent's current per-agent cap or daily limit. Tightening an agent policy after reservation can still allow approval of an amount that the current agent policy forbids.

### H2 — Reconciliation is not a complete audit record

`settle_stuck` (`src/lib.rs:748-777`) accepts an arbitrary owner-provided receipt reference and does not persist it in `Transaction`. Successful reconciliation also omits `agent.lifetime_executed` accounting. `prune_terminal` removes the transaction record, leaving replay protection but not a durable on-chain audit record.

### H3 — API tests are not executable

`apps/api/package.json:10` runs `node --test`, but `apps/api/tests/` contains only a README and `security.test.template.ts`. The command exits successfully after discovering zero tests, so no authentication, authorization, validation, duplicate, or simulation behavior is covered.

### H4 — Sandbox tests are not reproducible

`contracts/agentspend/tests-sandbox/async.test.cjs` imports `near-workspaces`, but no package manifest declares it and no lockfile previously existed. The sandbox test command cannot be treated as a clean-setup acceptance gate until the dependency and setup are explicit.

### H5 — Deployment script has shell injection risk

`scripts/deploy-firewall.mjs:28-37` interpolates user-controlled `owner` and `wasm` values into `execSync` shell strings. Replace shell interpolation with `spawnSync` argument arrays and validate account/network/path inputs before any deployment is attempted.

### H6 — Owner authentication is a bearer secret, not owner authorization

`apps/api/src/auth.ts:4-24` uses environment bearer tokens with no constant-time comparison, expiry, nonce, signature, account binding, or rotation. This is acceptable only for explicitly local simulation and must not be used to authorize live owner actions.

### H7 — Dashboard endpoints are unauthenticated

`apps/api/src/server.ts:26-34` exposes `/api/transactions` and `/api/dashboard/stats` without agent or owner authentication. Transaction purposes, recipients, amounts, and operational statistics can be disclosed to any caller.

### H8 — Dependency security is unresolved

The installed dependency tree reports a critical `next` advisory plus high-severity `postcss` and `zod` advisories. `npm audit fix --force` proposes breaking upgrades (`next@16.4.6`, `zod@4.6.7`), so upgrades require compatibility testing rather than an unreviewed force fix.

## Medium findings

### M1 — Simulation diverges materially from contract policy

`apps/api/src/simulation.ts` lacks agent lifecycle, per-agent limits, request quotas, pending caps, expiration, pause state, balance checks, asynchronous failure, owner decisions, and day rollover. Simulation results can therefore disagree with the contract's security decisions.

### M2 — Simulation and audit state are process-local

`apps/api/src/memory-db.ts` loses all history and reservations on restart and cannot coordinate multiple API processes. PostgreSQL persistence, migrations, indexes, and explicit simulation-mode semantics are absent.

### M3 — Nanosecond expiration uses unsafe JavaScript numbers

`apps/api/src/routes/transactions.ts:12` models `expiresAtNs` as a JavaScript `number`. NEAR nanosecond timestamps exceed `Number.MAX_SAFE_INTEGER`; the API should accept decimal strings and validate them as bounded unsigned integers.

### M4 — API validation does not match the contract

The API requires IDs of length at least four while the contract accepts nonempty IDs; it does not validate NEAR account IDs; and it does not enforce the contract's maximum one-day TTL. This creates inconsistent behavior between local simulation and on-chain execution.

### M5 — CORS policy is configuration-trusting

`apps/api/src/server.ts:21` accepts any `CORS_ORIGIN`, including `*` or an attacker-controlled origin, without an allowlist or production safety check.

### M6 — Permanent replay markers create storage pressure

The contract intentionally retains `seen_ids`, but valid agents can consume storage with rejected IDs. The cap and funding model need an explicit operational policy, monitoring, and bounded request quotas.

### M7 — Policy configuration permits contradictory limits

`update_policy` allows a daily limit below the per-transaction limit and an approval threshold above the daily limit. The contract remains fail-closed, but owners can create unusable policies without a validation error.

### M8 — Deprecated storage collection and missing reproducibility metadata

The compiler warns that `near_sdk::store::UnorderedSet` is deprecated. The crate had no lockfile before verification, and the API pairs Express 4 with `@types/express` 5. These should be resolved or documented before production-oriented work.

## Low findings and judging weaknesses

- `PROJECT_STATUS.md`, `docs/SECURITY.md`, and `docs/VERIFICATION.md` correctly state that compilation, tests, deployment, receipts, and external audit are unverified, but the project therefore has no evidence-backed demo yet.
- No CI workflow, container definition, database migration, readiness configuration, or reproducible deployment pipeline exists.
- `scripts/create-agent-key.mjs` and `scripts/deploy-firewall.mjs` are unverified against installed NEAR SDK/CLI APIs.
- No end-to-end API-to-contract test exists.
- Contract coverage is missing for expiration cleanup, request quotas, pending caps, agent deactivation, current-policy changes, storage-cap behavior, overflow, and stuck reconciliation accounting.
- The repository has no `docs/PITCH.md`, `docs/JUDGING_CHECKLIST.md`, or `docs/TECHNICAL_DIFFERENTIATORS.md`.

## Recommended implementation order

1. Make the contract rustfmt-clean and fix the moved-value error; install the Wasm target and run unit tests plus the Wasm build.
2. Fix the API `ChainPort` typing and route parameter typing; replace the test template with executable tests and add an app factory so tests do not bind a real listener.
3. Harden approval-time policy revalidation and reconciliation accounting, then add regression tests for those findings.
4. Declare and pin sandbox dependencies; run real near-workspaces tests after the contract build passes.
5. Improve simulation fidelity and replace memory persistence with a PostgreSQL-backed repository behind the same interfaces.
6. Add the real NEAR adapter only after verifying the SDK signing and receipt APIs; keep simulation clearly separate.
7. Connect the web dashboard to authenticated API state and display only verified outcomes.
8. Update documentation and final verification evidence from actual commands, without claiming testnet deployment until receipts exist.
