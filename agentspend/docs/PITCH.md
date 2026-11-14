# AgentSpend pitch

## The problem

Autonomous agents are becoming capable of purchasing services, but giving an
agent a wallet key gives it authority that is difficult to constrain after a
prompt injection, tool compromise, or buggy planning loop.

## The thesis

AgentSpend separates **requesting** money from **controlling** money. An agent
can ask for a payment through a scoped interface. Policy limits, recipient
allowlists, reservation accounting, replay protection, and owner approvals
belong at the financial boundary rather than in an LLM prompt or a trusted
backend handler.

## Demo story

The local demo rejects a 5 NEAR request against a 2 NEAR cap, accepts a valid
request, rejects an unknown recipient, holds an exceptional request for owner
approval, rejects a replayed ID, and rejects a daily-budget overrun. The UI
shows the decisions from the API and labels them as simulation.

## Why NEAR

NEAR's account and function-call-key model is a natural fit for bounded agent
capabilities. The contract can make owner-only policy changes and settlement
rules observable and independently enforceable. A live adapter and testnet
deployment remain planned rather than claimed.

## What is real today

- Rust contract source with policy, reservation, replay, pause, and callback
  logic.
- Local Rust unit-test and Wasm-build evidence recorded in verification notes.
- Express API with input validation, constant-time demo credentials, rate
  limiting, structured logs, PostgreSQL adapter, and explicit simulation mode.
- Next.js dashboard connected to owner-protected API endpoints.

## What is not claimed

No external audit, live testnet deployment, real payment receipt, wallet-based
authentication, or production-ready custody architecture is included.
