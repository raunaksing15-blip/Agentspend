# Hackathon judging checklist

| Area | Evidence to show | Current status |
|---|---|---|
| Security thesis | Contract is the intended policy boundary; backend approval routes return 410 | Implemented locally |
| Policy enforcement | `./scripts/demo.sh` shows cap, allowlist, approval, replay, and daily-limit decisions | Implemented in simulation |
| Agent permissions | Agent identity comes from bearer credentials, not request JSON | API-tested |
| Honest execution | Simulation returns `nearTxHash: null` and `onChain: false` | API-tested |
| Human approval | Owner-only unsigned approval intent is exposed; owner must sign | API-tested, settlement unverified |
| Persistence | PostgreSQL schema and adapter exist | Not exercised against live PostgreSQL |
| UX | Responsive dashboard with loading, empty, error, and simulation states | Web build verified |
| NEAR integration | Contract source and deployment instructions | Testnet adapter/deployment pending |
| Reproducibility | README and demo script work from a clean Node setup | Requires dependencies |

Do not mark a row as testnet-complete without an actual transaction hash,
receipt outcome, and contract state read from the network.
