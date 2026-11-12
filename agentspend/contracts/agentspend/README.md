
# NEAR Contract

The contract source is the hardened v2 implementation. It compiles against the pinned
`near-sdk = 5.17.2`, passes the Rust security suite, and produces a release Wasm artifact.
It has not been externally audited or deployed to testnet.

```bash
cargo fmt --check
cargo test
cargo build --target wasm32-unknown-unknown --release
```

Review `docs/SECURITY.md` and `docs/VERIFICATION.md` at repository root before deployment.
