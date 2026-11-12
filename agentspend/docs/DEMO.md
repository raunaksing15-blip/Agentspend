
# Demo Script

**Do not imply that the included UI or API performs real NEAR transfers.** Current API mode is local simulation; the web dashboard is a static presentation scaffold.

## Narrative (90 seconds)
1. Introduce the risk: an autonomous procurement agent can request purchases.
2. Show the policy boundary: max 2 NEAR per request, 5 NEAR daily, 1 NEAR approval threshold, allowlisted recipients.
3. Explain that the Rust contract is intended to be the enforcement authority.
4. Show the six expected scenarios:
   - 0.5 NEAR to allowlisted recipient: auto-execution path.
   - 3 NEAR: rejected above per-transaction maximum.
   - 1.5 NEAR: pending owner approval.
   - Unknown recipient: rejected.
   - Duplicate ID: second request rejected.
   - Daily budget overrun: rejected.
5. Explain the strongest security property: the agent cannot call owner-only approval methods.
6. Show a real explorer receipt only after deployment and an actual transaction have been independently verified.

## Judge-facing kill shot
Attempt `approve_payment` using an agent-scoped key. The expected contract-level result is `ERR_OWNER_ONLY`. Capture the actual protocol error; do not use a fabricated screenshot or mock error.
