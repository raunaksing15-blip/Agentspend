Express API scaffold. It only starts in SIMULATED mode; TESTNET mode is deliberately refused because a live ChainPort adapter is not included.

## Persistence

Local development defaults to the explicit in-memory store:

```bash
PERSISTENCE_MODE=memory npm run dev:api
```

For a persistent deployment, provide PostgreSQL and run:

```bash
DATABASE_URL=postgres://... PERSISTENCE_MODE=postgres npm run dev:api
```

The server applies the idempotent schema in `migrations/001_initial.sql` at
startup. The in-memory store is not a production persistence option.
