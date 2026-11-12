
# Deployment Guide — Manual and Unverified

Do not deploy until the contract compiles and all tests pass.

## Prerequisites
- Rust stable and `wasm32-unknown-unknown`.
- Exact NEAR SDK version verified from official documentation/registry.
- NEAR CLI version and `near deploy` syntax verified.
- A funded testnet owner account.
- A separately controlled contract subaccount.

## Build
```bash
cd contracts/agentspend
cargo fmt --check
cargo test
cargo build --target wasm32-unknown-unknown --release
```

## Deploy
The included `scripts/deploy-firewall.mjs` is authored from the conversation and uses a particular `near deploy` CLI argument shape. **Verify that syntax against your installed CLI before running it.** It creates a subaccount and attempts deploy+init. Do not assume it is compatible or atomic until tested.

```bash
node scripts/deploy-firewall.mjs --network testnet --owner <OWNER.test.near>
```

After deployment:
1. Verify contract account and code hash.
2. Verify owner state.
3. Fund contract with a small test amount.
4. Add a recipient and configure an agent.
5. Add a scoped function-call key restricted to `request_payment`.
6. Run the test scenarios with tiny amounts.
7. Capture transaction and receipt IDs from actual RPC/explorer results.

No deployment or real receipt is included in this repository.
