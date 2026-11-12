
# Security Threat Model

**Status:** Self-review notes only. No external audit or certification. Contract source is uncompiled/unverified.

| Threat | Intended mitigation | Residual risk |
|---|---|---|
| Prompt injection / compromised agent | Contract allowlist, per-transaction and daily caps; agent-scoped function-call key | Attacker can spend within the permissions and remaining budget |
| Malicious recipient | Owner-controlled recipient allowlist | Allowlisted vendor can still misuse funds |
| Duplicate/replay | Persistent `seen_ids` map; IDs not reusable after pruning | Storage growth and denial-of-service pressure |
| Daily-budget bypass | Reservations retained across day rollover | Conservative reservations may remain locked pending reconciliation |
| Async transfer failure | Callback settles Executing to Failed and reconciles reservation | Callback loss requires owner-attested reconciliation; trust remains |
| Backend compromise | Backend has no approval endpoint and no signing authority | Backend can misrepresent cached/UI data or deny service |
| Owner key compromise | Two-step ownership transfer | Owner-key compromise can change policy and control funds; no multisig in MVP |
| Initialization front-run | `#[private]` self-init requirement; atomic deploy+init intended | CLI deploy procedure must be verified; wrong deployment sequence can make contract unusable |
| Storage griefing | Length/count caps and storage accounting in contract | Sustained requests can still consume resources |
| Contract implementation bug | Unit/sandbox tests and invariant view are authored | No formal verification or independent audit |

## Security invariants to verify
1. Only the contract owner can modify policy, allowlists, pause state, and owner.
2. Only an authorized agent can request a payment.
3. An agent cannot approve its own pending payment.
4. Every transaction ID is single-use, including rejected or pruned records.
5. Pending reservations survive day rollover.
6. Transfer settlement is callback-only; callbacks cannot settle non-Executing records.
7. Failed transfers restore the appropriate reservation/accounting.
8. Monetary calculations use integer yoctoNEAR.
9. Backend simulation never fabricates a NEAR hash.
10. The API cannot sign owner approvals.

## Before any real funds
- Compile against a pinned, verified NEAR SDK.
- Run all contract unit and sandbox tests.
- Review storage-stake and usable-balance arithmetic.
- Verify gas budgets and callback behavior.
- Verify deploy/init atomicity with the exact CLI version.
- Perform a separate code review and preferably an external audit.
