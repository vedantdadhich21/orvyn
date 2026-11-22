# Launch backend scaffold

This folder is the shape of the 48-hour launch backend. It is deliberately not wired to a
database yet: no driver, ORM or migration tool is committed, because that choice belongs
with the deployment. `schema.sql` is Postgres.

## Environment

```bash
DATABASE_URL=postgres://...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CDP_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...
ADMIN_WALLETS=0x...,0x...
CRON_SECRET=...
```

`CDP_PAYMASTER_URL` stays server-only. The browser talks to `/api/paymaster`, which forwards
only `pm_getPaymasterStubData` and `pm_getPaymasterData` and can check the target contracts.

## Endpoints to build next

| Endpoint | Method | Job |
| --- | --- | --- |
| `/api/tx` | POST | Accept `{ txHash }`, re-read the receipt on the server, decode `Trade`, `Followed` and `StrategyPublished`, write rows idempotently. |
| `/api/proof` | GET | Return the proof counts from `schema.sql`. |
| `/api/strategies` | GET | Newest or most followed, cursor paginated. |
| `/api/admin/users` | POST | Signature gated; searchable user list. |
| `/api/admin/users/[address]/timeline` | POST | Signature gated; that user's events. |
| `/api/price-updater` | GET | Cron only, `CRON_SECRET` header; write the Chainlink readings. |

## Invariants

- The browser never supplies a trusted receipt. The server re-reads the transaction from the
  RPC before writing anything.
- Every ingest is idempotent on `(tx_hash, log_index)`. A replayed POST writes zero rows.
- Addresses are lowercased before insert. The same wallet is one user everywhere.
- The admin gate is a signature over a short lived message, verified with viem against
  `ADMIN_WALLETS`. There is no password and no shared admin key in the client.
- Price rows carry their source and timestamp. A stale price is visible, not silently used.
- Test tokens only. No route accepts a private key.

## Not in this scaffold

- The exchange, tUSDC and stock token contracts, and their ABIs.
- The Coinbase Smart Wallet connector and the paymaster proxy.
- The actual Postgres driver and migrations.

Those need the Testnet MVP doc and the CDP and database accounts.
