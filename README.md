# ORVYN

**Portfolios, programmed.**

Most portfolios are a list of stocks and a lot of instinct. ORVYN adds the part that was
missing: the rules. Pick what you own, set the limits, and see exactly when the portfolio
drifts off plan.

> **Simulated. Testnet only.** Chapter 1 uses demo reference prices and simulated holdings.
> No money moves, no brokerage is connected, and nothing here is investment advice.

## Status

Chapter 1, in progress. The home page, the stock picker, locally saved drafts, allocation
sliders, the market data adapter and the portfolio engine are shipped. A portfolio now
carries rules, the dashboard shows what the book is worth and how far each line has
drifted, and the engine prices the trades a rebalance would need. A sentence can fill the
limits, through the same check a model's answer would face. The simulate screen shows the
trade list, the book on either side of it, and an approval that survives a refresh. A
publish screen writes the strategy to a testnet registry and links to the transaction;
the registry deployment address is the last external step.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- shadcn/ui primitives on a shared design-token package
- Bun + Turborepo monorepo

The web app is `apps/web`. Shared colour, spacing and type values live in
`packages/design-tokens`. The repo also contains an inherited native client
(`apps/mobile`) that is not part of Chapter 1.

## Run it locally

```bash
bun install
bun run dev:web
```

Open <http://localhost:3000>. The app runs in simulation mode with no credentials
configured; copy `apps/web/.env.example` to `apps/web/.env.local` only when a task needs a
third-party key.

## Checks

```bash
bun run check     # generated tokens, lint, strict typecheck
bun run build     # production build
bun test          # domain tests
```

## The strategy registry

`apps/web/contracts/StrategyRegistry.sol` is a small, ownerless contract on Base Sepolia.
`publish(name, payload)` stores a readable line: the strategy name, its limits and its
target weights. Holdings, units, prices and addresses never go onchain.

Deploy it with a funded test wallet:

```bash
cd apps/web
DEPLOYER_PRIVATE_KEY=0x... bun run contracts:deploy
```

The script checks the balance, prices the deployment, waits for the receipt, writes
`apps/web/deployments/base-sepolia.json`, and prints the value for
`NEXT_PUBLIC_STRATEGY_REGISTRY`. Set that variable locally and on the host, then redeploy;
`/publish/<draft>` turns on. Without it the screen still shows the exact payload and says
why it cannot sign.

The compiled ABI and bytecode are committed in `src/lib/orvyn/strategy-registry.ts`.
Regenerate them after a contract change with `bun run contracts:build`. The contract has no
owner, no upgrade path and no function that moves funds.

## Contributing and bounties

Bugs, security reports and pull requests are welcome. Accepted reports and merged changes
get credit and early access; the full scope, process and reporting rules are in
[BOUNTY.md](./BOUNTY.md). Posting about a report on X is appreciated, never required.

## Brand

Palette, type and the logo files live in [BRAND.md](./BRAND.md). The mark, the
favicon, the app icon and the profile picture are all exports of one outline, so
they stay consistent by construction.

## Attribution

ORVYN is built on [TradeTokenStocks](https://github.com/TradeTokenStocks/ui), used under the
MIT License. See [NOTICE.md](./NOTICE.md) and [LICENSE](./LICENSE).

## Licence

MIT.
