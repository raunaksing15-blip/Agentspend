
# AgentSpend — Final Hackathon Report

**Product:** AgentSpend — The Financial Firewall for Autonomous AI Agents  
**Primary track:** AI Security & Defense (`security`)  
**Additional alignment:** Agent Economy (`agents`), Autonomous Business (`business`)  
**Source:** User-supplied conversation archive, dated November 12, 2026.

## Executive summary
AgentSpend is designed as a programmable financial security boundary for autonomous AI agents. Agents request payments; a NEAR Rust smart contract independently enforces spending limits, recipient allowlists, agent authorization, duplicate protection and owner approval.

## Industry problem
Autonomous agents may purchase APIs, cloud services, datasets and subscriptions. Unrestricted wallet access creates risks including prompt injection, excess spending, unauthorized recipients, replay, budget overruns and limited accountability. Natural-language instructions are not enforceable financial controls.

## Proposed solution
A NEAR smart contract holds controlled funds and is intended to enforce:
- maximum per-transaction and daily limits;
- approved recipients and authorized agents;
- human approval above a threshold;
- duplicate transaction ID prevention;
- emergency pause;
- asynchronous transfer settlement and audit events.

The backend is intended to relay requests and provide UI/cache services. It must not be the authority for approving payments.

## NEAR integration
The authored Rust contract uses NEAR SDK APIs and contract-controlled transfers. The conversation proposes scoped FunctionCall keys restricted to `request_payment`, plus owner-signed approvals. These integrations are **not verified** in this package.

## Architecture
Agent → API/authentication → contract request → on-chain policy checks → reject / pending owner approval / transfer → callback settlement → event and indexed history.

## Technical stack
- Rust 2021, `near-sdk` pinned to 5.17.2 in the transcript manifest.
- Node.js / TypeScript / Express.
- Next.js / React / Tailwind.
- NEAR testnet intended for deployment.
- Rust unit and near-workspaces sandbox tests authored.

## Implementation status

| Area | Status |
|---|---|
| Contract source v2 | Authored; not compiled |
| Contract regression tests | Authored; not run |
| Sandbox async tests | Authored; not run |
| API transaction route | Authored; simulation adapter included |
| API live testnet adapter | Not implemented |
| Backend persistence | In-memory simulation only |
| Frontend | Presentation scaffold only |
| Scoped agent-key script | Authored; not run |
| Deployment | Not performed |
| Real transaction receipts | None |
| External audit | Not performed |

## Security architecture and residual risks
The transcript identifies key risks: compromised agent keys, malicious allowlisted vendors, owner-key compromise, storage griefing, callback loss, and contract bugs. Two-step ownership and scoped function-call keys are intended mitigations. Owner-key compromise remains a major residual risk; no multisig or external audit is included.

## Demo scenarios
1. 0.5 NEAR to approved recipient.
2. 3 NEAR above the per-transaction maximum.
3. 1.5 NEAR requiring owner approval.
4. Unapproved recipient.
5. Duplicate request ID.
6. Daily budget exceeded.
7. Kill-shot: agent attempts owner-only `approve_payment` and should receive `ERR_OWNER_ONLY`.

These are expected scenarios, not proof of execution. Capture real receipts before presenting any scenario as an on-chain result.

## Honest readiness assessment
The final audit in the conversation assigned overall readiness 4/10, noting that code existed but compilation, tests, deployment and reproducibility were not verified. This packaged repository preserves that assessment rather than upgrading the status without evidence.

## Immediate next steps
1. Install and pin a compatible Rust/NEAR toolchain.
2. Run formatting, contract tests and WASM build; fix every failure.
3. Run the near-workspaces sandbox tests and capture output.
4. Complete API adapters, authentication and persistence.
5. Connect the frontend to verified API states.
6. Deploy to NEAR testnet only after review.
7. Execute small test transactions and capture hashes, receipts and balance deltas.
8. Record the demo and update `docs/VERIFICATION.md`.
