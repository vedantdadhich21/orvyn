# ORVYN

**Portfolios, programmed.**

Most portfolios are a list of stocks and a lot of instinct. ORVYN adds the part that was
missing: the rules. Pick what you own, set the limits, and see exactly when the portfolio
drifts off plan.

> **Simulated. Testnet only.** Chapter 1 uses demo reference prices and simulated holdings.
> No money moves, no brokerage is connected, and nothing here is investment advice.

## Status

Chapter 1, in progress. The home page, the stock picker and locally saved drafts are
shipped. Allocation, rules, drift, simulation and the onchain strategy registry follow.

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

## Brand

Palette, type and the logo files live in [BRAND.md](./BRAND.md). The mark, the
favicon, the app icon and the profile picture are all exports of one outline, so
they stay consistent by construction.

## Attribution

ORVYN is built on [TradeTokenStocks](https://github.com/TradeTokenStocks/ui), used under the
MIT License. See [NOTICE.md](./NOTICE.md) and [LICENSE](./LICENSE).

## Licence

MIT.
