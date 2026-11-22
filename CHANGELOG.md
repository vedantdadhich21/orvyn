# Changelog

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
