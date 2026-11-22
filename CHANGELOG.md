# Changelog

## v0.1.2 — Registry live on Base Sepolia

### Deployed

- `StrategyRegistry` at
  [`0xa434adf3a61c52c734bf39e7ab30086e32737293`](https://sepolia.basescan.org/address/0xa434adf3a61c52c734bf39e7ab30086e32737293),
  deployed in
  [`0x81ef9068...`](https://sepolia.basescan.org/tx/0x81ef90682da8779611077543badf097667ed3329ed039bb00a29268757dcce6c).
- The first public strategy, `Future of AI`, published in
  [`0x454a8c98...`](https://sepolia.basescan.org/tx/0x454a8c98deaa43bdc395497fa8a0691760be24ec86157426d0d948c890d14d0f).

### App

- The gallery, `/s/<id>`, its share card and `/proof` read the live registry when
  `NEXT_PUBLIC_STRATEGY_REGISTRY` points at the deployment.
- Publishing from the UI needs a funded wallet and Privy sign in.

## v0.1.1 — Trust pages and launch scaffold

### Added

- Public strategy pages at `/s/<id>` with targets, limits, the exact published line and a
  generated share card for X.
- `/proof`: live registry counts, the contract address and an honest list of what is not
  shown yet.
- `/how-it-works` and `/changelog`, linked from a footer on every screen.
- A wallet signature gate at `/admin`, checked on the server with viem against
  `ADMIN_WALLETS`.
- A Postgres schema and the launch API shape for users, strategies, follows, investments,
  trades and events.

### Notes

- Publishing stays off until `NEXT_PUBLIC_STRATEGY_REGISTRY` points at a deployment.
- The onchain MVP still needs the Testnet MVP contracts, a CDP Paymaster, Postgres and a
  funded deployer. The schema and admin gate are ready for them.

## v0.1.0 — Chapter 1

First working release. Simulated and testnet only: no custody, no brokerage and no real
money.

### The builder

- Stock picker, locally saved drafts and allocation sliders gated at exactly 100.
- Rules: a ceiling per stock, a cash floor and a drift band. A sentence can fill them
  through the same validator a model's answer faces.
- Drift dashboard with a donut, per-line drift and three reproducible market scenarios.
- Rebalance simulator: trade list, before and after, value preservation, an approval that
  survives a refresh, and a reset.
- Publish screen: exact payload preview, byte limits, wallet and chain states, receipt
  decoding and BaseScan links.
- Published strategies gallery: reads the registry through `/api/registry`, marks records
  this build cannot parse, and copies a strategy into a local draft without a wallet.

### The registry

- `StrategyRegistry.sol`: `publish`, `count`, `get` and `idsOf`.
- No owner, no admin, no upgrade path and no function that moves funds.
- A record is one readable line: name, limits, target weights and book size. Holdings,
  units, prices and addresses never go onchain.
- Compile and deploy scripts, committed ABI and bytecode, and a Foundry suite covering the
  byte limits, sequential ids, authorship and fuzzed round trips.

### Quality

- 132 unit tests.
- Typecheck, lint and production build clean.
- Lighthouse accessibility passes on the home page and the drift dashboard.
- Keyboard and mobile layouts checked.

### Known limit

The registry is not deployed to a public testnet in this release. Deploy it with
`bun run contracts:deploy` and set `NEXT_PUBLIC_STRATEGY_REGISTRY` to the printed address to
turn publishing and the gallery on.
