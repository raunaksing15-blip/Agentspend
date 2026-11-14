# AgentSpend demonstration

This is a reproducible **local simulation**. It does not sign, broadcast, or
settle a NEAR transfer. Run `./scripts/demo.sh` from the repository root.
The API uses `demo-agent-token` and `demo-owner-token` by default.

## Narrative (90 seconds)

1. Introduce the risk: an autonomous procurement agent can request purchases.
2. Show the simulation policy: maximum 2 NEAR per request, 5 NEAR daily,
   1 NEAR approval threshold, and two allowlisted recipients.
3. Run the script and point out that every response includes
   `executionMode=SIMULATED`, `onChain=false`, and no transaction hash.
4. Walk through the cap rejection, valid request, recipient rejection,
   pending approval, duplicate ID, and daily-budget rejection.
5. Open `/dashboard`, authenticate with `demo-owner-token`, and show the
   owner-only activity and pending approval views.
6. Explain that the Rust contract is intended to be the independent enforcement
   authority; the current API intentionally refuses TESTNET mode.

## Testnet mode

There is no verified live adapter in this repository. Do not describe the local
demo as a testnet payment, and do not add explorer links unless a real receipt,
receipt outcome, and contract state have been captured.

For a future testnet presentation, attempt `approve_payment` using an
agent-scoped key only after deployment and key scoping have been independently
verified. Capture the actual protocol error; do not use a fabricated screenshot
or mock error.
