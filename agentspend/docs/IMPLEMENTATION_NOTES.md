
# Implementation Notes and Source Provenance

This repository is assembled from the supplied 9,783-line conversation archive.

## Chosen source version
- Active contract source: the later hardened v2 contract authored in the critical judge review (conversation lines around 2,261–3,135).
- Contract manifest: pinned `near-sdk = 5.17.2` from the same review.
- Contract unit tests: `contracts/agentspend/tests/security.rs`.
- Sandbox tests: `contracts/agentspend/tests-sandbox/async.test.cjs`.
- Backend transaction route: later route that removes backend approval authority and returns `nearTxHash: null` in simulation mode.
- Deploy and scoped-key scripts: later review versions.

## Deliberately excluded
The initial v1 snippets are not used as active source because later review identified:
- daily spending bypass through pending approvals;
- unsafe accounting and balance assumptions;
- backend HTTP approval that bypassed owner wallet authority;
- fabricated `sim_exec_*` / `sim_approved_*` transaction hashes;
- initialization front-running;
- unverified SDK/API assumptions.

## Known incomplete pieces
- The backend route expects an actual ChainPort implementation for TESTNET; none is included. The server therefore refuses TESTNET mode.
- The API test snippet from the conversation refers to undefined `api` and `validBody` fixtures. It is preserved as a template, not a passing test suite.
- The frontend is a visual scaffold, not a full transaction dashboard.
- No persistent database, real wallet session, live contract adapter, or evidence pipeline is supplied.
- Some docs in the conversation describe desired/claimed functionality that was never verified. This package uses status labels and verification gates instead.

## Do not represent this package as compiled, deployed, audited, or testnet-integrated until the evidence is produced.
