
# AgentSpend
### The Financial Firewall for Autonomous AI Agents

AgentSpend is a prototype financial-security layer for autonomous AI agents. Its core design is that an agent may **request** a payment, while deterministic policy enforcement and owner authority remain outside the agent's control.

> **Important status:** This repository is assembled from the implementation and review material in the supplied conversation transcript. The transcript explicitly states that the code was not compiled, tested, or deployed. The NEAR contract is authored but unverified. The included API runs in local simulation mode only. No real testnet transfer is claimed.

## Problem
Agents may purchase APIs, compute, datasets and software. Unrestricted wallet access creates risks including prompt injection, excess spending, unauthorized recipients, replay, and missing accountability. Natural-language instructions are not financial guarantees.

## Intended solution
- Rust/NEAR contract as the enforcement boundary.
- Per-transaction and daily spending limits.
- Recipient allowlist and agent permissions.
- Pending owner approval for higher-value requests.
- Duplicate/replay protection and auditable NEP-297 events.
- Explicit distinction between simulated and on-chain outcomes.

## Repository
- `contracts/agentspend/` — Rust NEAR contract and unit/sandbox test sources.
- `apps/api/` — Express API scaffold; simulation-only server; no live ChainPort.
- `apps/web/` — Next.js landing/dashboard presentation scaffold.
- `scripts/` — deploy and scoped-agent-key scripts from the transcript.
- `docs/` — architecture, security, demo, deployment and verification notes.

## Local API
Requires Node.js 20+.

```bash
cp .env.example .env
# Set AGENT_API_TOKEN, AGENT_ACCOUNT_ID and OWNER_API_TOKEN to local random values.
npm install
npm run dev:api
```

Health check: `GET http://localhost:4000/api/health`.

The transaction request route is simulation-only. It does not sign, broadcast, or execute a NEAR transfer. Simulated responses must have `nearTxHash: null` and `onChain: false`.

## Web scaffold
```bash
npm run dev:web
```
The dashboard is a presentation scaffold and does not yet connect to the API.

## Contract build and tests
Requires Rust stable, `wasm32-unknown-unknown`, and a compatible NEAR SDK toolchain.

```bash
cd contracts/agentspend
cargo fmt --check
cargo test
cargo build --target wasm32-unknown-unknown --release
```

The conversation's Cargo manifest pins `near-sdk = 5.17.2`; verify compatibility against the current official NEAR SDK before relying on it. These commands have **not** been run in the environment that authored the transcript. This packaging environment also has no Rust toolchain, so no compile/test result is claimed here.

## Testnet
Deployment and payment execution are intentionally manual. Read `docs/DEPLOYMENT.md` and `docs/VERIFICATION.md`. Do not fund or deploy until the contract has compiled, tests have passed, the init/deploy procedure has been checked against the installed NEAR CLI, and a human has reviewed the security assumptions.

## Track
Primary: AI Security & Defense (`security`). Additional relevance: Agent Economy (`agents`) and Autonomous Business (`business`).

## Security
This is not an externally audited product, not production-ready, and not a custody service. See [docs/SECURITY.md](docs/SECURITY.md) and [docs/VERIFICATION.md](docs/VERIFICATION.md).

## License
MIT — see [LICENSE](LICENSE).
