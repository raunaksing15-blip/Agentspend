# Final engineering report

**Date:** 2026-11-14  
**Scope:** Phases 5–8, simulation/demo, documentation, and available local verification.

## Work completed

- Added `scripts/demo.sh` and `scripts/demo.mjs`, which start the simulation API
  when needed and exercise cap, allowlist, approval, replay, and daily-budget
  scenarios.
- Added pitch, technical differentiators, and judging checklist documents.
- Updated README, architecture, API, project status, task board, demo, and
  verification notes to distinguish implemented simulation behavior from
  unverified testnet behavior.
- Confirmed the Phase 4 Next.js dashboard is connected to owner-protected API
  endpoints and documented that integration.

## Commands executed and actual results

| Command | Result |
|---|---|
| `cargo fmt --manifest-path contracts/agentspend/Cargo.toml --check` | PASS |
| `cargo test --manifest-path contracts/agentspend/Cargo.toml` | PASS — 23 passed |
| `cargo build --manifest-path contracts/agentspend/Cargo.toml --target wasm32-unknown-unknown --release` | BLOCKED — Rust target not installed |
| `npm run build:api` | PASS |
| `npm run test:api` | PASS — 7 passed |
| `./scripts/demo.sh` | PASS — 8 request scenarios and owner dashboard check |
| `npm run build:web` | PASS — Next.js production build |
| `git diff --check` | PASS |
| `npm audit --omit=dev --json` | 3 production vulnerabilities: 1 critical, 2 high |
| `npm run test:sandbox` | BLOCKED — `near-workspaces` module unavailable |

## Security findings and limitations

The API remains simulation-only and refuses TESTNET startup without a reviewed
ChainPort adapter. Owner approval is represented as an unsigned intent; the API
does not sign or submit it. The default memory database is suitable for local
demos only. The dependency audit reports an unpatched Next.js advisory and
high-severity transitive findings; these must be resolved before production
use.

## Deployment status

No testnet deployment, contract account, transaction hash, receipt outcome,
balance delta, or owner-signed approval is claimed. No private key, seed phrase,
or API credential is committed.

## Recommended next steps

1. Install and pin the `wasm32-unknown-unknown` target, then rerun the Wasm
   build.
2. Install the exact sandbox dependencies and run the near-workspaces tests
   against a working near-sandbox binary.
3. Upgrade/adjudicate audited web dependencies, especially Next.js, without
   weakening the security boundary.
4. Implement and independently review a real NEAR adapter and wallet/session
   authentication before any testnet funds are used.
