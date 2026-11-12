
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
  "expiresAtNs": 1794500000000000000
}
```

The agent identity is loaded from `AGENT_ACCOUNT_ID`, not accepted from the body. The API returns `executionMode: SIMULATED`, `onChain: false`, and `nearTxHash: null`.

## `POST /api/transactions/:id/approve` and `/reject`
Return HTTP 410. Backend approval is intentionally not an authority. The owner must sign the contract call with the owner account.

## `POST /api/transactions/:id/approval-intent`
Requires `Authorization: Bearer <OWNER_API_TOKEN>`. Returns unsigned call arguments only. It does not sign or submit the call.

## Limitations
The route module's `TESTNET` branch is an interface contract only. The included `LocalSimulationChain` throws if asked to submit a testnet request. A production API needs an audited authentication/session system, persistent database, real ChainPort adapter, transaction finality checks, and monitoring.
