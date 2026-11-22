# ORVYN

**Portfolios, programmed.**

Live: <https://orvyn-io.vercel.app>

Most portfolios are a list of stocks and a lot of instinct. ORVYN adds the part that was
missing: the rules. Pick what you own, set the limits, and see exactly when the portfolio
drifts off plan.

> **Simulated. Testnet only.** Chapter 1 uses demo reference prices and simulated holdings.
> No money moves, no brokerage is connected, and nothing here is investment advice.

## Status

Chapter 1 is complete. The builder covers the whole path: pick the stocks, set the
allocation, write the limits, read the drift dashboard, price the rebalance, approve it, and
publish the strategy to a testnet registry. A sentence can fill the limits through the same
validation a model's answer would face. The home gallery reads published strategies back
from the chain and copies one into a local draft.

Everything is simulated. Drafts and approvals live in the browser; no account, brokerage,
custody or real money is involved. The registry contract is included and ownerless; set
`NEXT_PUBLIC_STRATEGY_REGISTRY` to a deployment to turn publishing on.

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

The current Base Sepolia deployment is
[`0xa434adf3a61c52c734bf39e7ab30086e32737293`](https://sepolia.basescan.org/address/0xa434adf3a61c52c734bf39e7ab30086e32737293).
Set `NEXT_PUBLIC_STRATEGY_REGISTRY` to that address to turn publishing and the gallery on.

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

To verify the source on BaseScan, open the contract, choose **Verify and Publish**, select
Solidity single file, compiler `0.8.24`, optimizer `200` and EVM version `cancun`.

The gallery at the bottom of the home page reads `count()` and `get()` through
`/api/registry`, parses each published line back into limits and targets, and can copy one
into an editable local draft. Copying needs no wallet. `BASE_SEPOLIA_RPC_URL` selects the
read endpoint and defaults to the public Base Sepolia RPC.

### Trust pages

- `/s/<id>` renders one published strategy with its targets, limits and exact line, plus a
  generated share card for X.
- `/proof` reads live registry counts from the contract and links to the address.
- `/how-it-works` explains the four steps and what the product deliberately does not do.
- `/changelog` lists what shipped in each release.
- `/admin` is a wallet signature gate. Set `ADMIN_WALLETS` to a comma separated list; an
  empty list disables it.

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
