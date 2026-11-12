# AgentSpend

### The financial firewall for autonomous AI agents

AgentSpend is a prototype financial-security layer for autonomous AI agents. An agent can **request** a payment, but deterministic policy enforcement and owner authority remain outside the agent's control.

> **Status:** This project is not production-ready or externally audited. The API runs in local simulation mode only, and the NEAR contract has not been verified or deployed. No real testnet transfer is claimed.

## Quick start

### Prerequisites

- Node.js 20 or later
- npm
- Rust stable and the `wasm32-unknown-unknown` target (only for contract builds)

### Run the local API

```bash
cp .env.example .env
# Set AGENT_API_TOKEN, AGENT_ACCOUNT_ID, and OWNER_API_TOKEN to local values.
npm install
npm run dev:api
```

The API listens on `http://localhost:4000`. Verify it is running with:

```bash
curl http://localhost:4000/api/health
```

### Run the web scaffold

In a second terminal:

```bash
npm run dev:web
```

The dashboard is a presentation scaffold and does not yet connect to the API.

## How it works

- The Rust/NEAR contract is the intended enforcement boundary.
- Per-transaction and daily spending limits constrain requests.
- Recipient allowlists and agent permissions restrict who can be paid.
- Higher-value requests can remain pending for owner approval.
- Duplicate/replay protection and NEP-297 events support auditability.
- Simulated and on-chain outcomes are kept explicitly separate.

The transaction request route does not sign, broadcast, or execute a NEAR transfer. Simulated responses must have `nearTxHash: null` and `onChain: false`.

## Repository layout

- `contracts/agentspend/` — Rust/NEAR contract and unit/sandbox test sources.
- `apps/api/` — Express API scaffold and local simulation server.
- `apps/web/` — Next.js landing page and dashboard scaffold.
- `scripts/` — deployment and scoped-agent-key scripts.
- `docs/` — architecture, security, demo, deployment, and verification notes.

## Contract build and tests

From `contracts/agentspend/`, run:

```bash
cd contracts/agentspend
cargo fmt --check
cargo test
cargo build --target wasm32-unknown-unknown --release
```

The manifest pins `near-sdk = 5.17.2`; verify compatibility with the current official NEAR SDK before relying on it. These commands have not been run in the packaging environment, so this repository makes no compile or test claim.

## Testnet

Deployment and payment execution are intentionally manual. Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and [`docs/VERIFICATION.md`](docs/VERIFICATION.md). Do not fund or deploy until the contract has compiled, tests have passed, the init/deploy procedure has been checked against the installed NEAR CLI, and a human has reviewed the security assumptions.

## Track

Primary: AI Security & Defense (`security`). Additional relevance: Agent Economy (`agents`) and Autonomous Business (`business`).

## Security

This is not an externally audited product, not production-ready, and not a custody service. See [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## License

MIT — see [LICENSE](LICENSE).
