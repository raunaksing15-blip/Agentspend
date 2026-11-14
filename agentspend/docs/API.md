
# API

The included Express server is deliberately simulation-only.

## `GET /api/health`
Returns `{ ok: true, executionMode: "SIMULATED", onChain: false }`.

## `POST /api/transactions/request`
Requires `Authorization: Bearer <AGENT_API_TOKEN>`.

Example body:
```json
{
  "id": "demo-request-001",
  "recipient": "vendor.test.near",
  "amountYocto": "500000000000000000000000",
  "purpose": "API credits",
  "expiresAtNs": "1794500000000000000"
}
```

The agent identity is loaded from `AGENT_ACCOUNT_ID`, not accepted from the body. Expiration is a decimal string validated against a 24-hour maximum to avoid JavaScript integer precision loss. The API returns `executionMode: SIMULATED`, `onChain: false`, and `nearTxHash: null`.

## `POST /api/transactions/:id/approve` and `/reject`
Return HTTP 410. Backend approval is intentionally not an authority. The owner must sign the contract call with the owner account.

## `POST /api/transactions/:id/approval-intent`
Requires `Authorization: Bearer <OWNER_API_TOKEN>`. Returns unsigned call arguments only. It does not sign or submit the call.

## Owner dashboard endpoints

`GET /api/dashboard/stats` and `GET /api/transactions` require the owner
token. The Next.js dashboard proxies these paths to the API in local
development and displays the returned execution mode. It does not infer a
receipt from a successful HTTP response.

## Limitations
The route module's `TESTNET` branch is an interface contract only. The included `LocalSimulationChain` throws if asked to submit a testnet request. A production API needs an audited authentication/session system, persistent database, real ChainPort adapter, transaction finality checks, and monitoring.

## Persistence and runtime modes

`PERSISTENCE_MODE=memory` is intended for local demos and tests. Set
`PERSISTENCE_MODE=postgres` with `DATABASE_URL` for persistent transaction
history; startup applies an idempotent schema matching
`apps/api/migrations/001_initial.sql`. `EXECUTION_MODE=TESTNET` remains refused
until a reviewed NEAR adapter is implemented.
