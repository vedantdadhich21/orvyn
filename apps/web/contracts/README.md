# Testnet MVP contracts

These are the launch contracts for the 48-hour testnet MVP. They are not the
audited Chapter 1 registry and they are not financial infrastructure. Testnet
only, no real money, no custody.

| Contract | Job |
| --- | --- |
| `TestUSD.sol` | tUSDC with six decimals and a 1,000 tUSDC daily faucet. No owner. |
| `TestStock.sol` | Seven stock tokens. The exchange is the only minter and burner. |
| `PriceOracle.sol` | Demo USD prices with eight decimals, in the Chainlink shape. Owner is the launch updater. |
| `OrvynExchange.sol` | tUSDC in, stock minted; stock burned, tUSDC out. No owner, no fees. |
| `StrategyRegistryV2.sol` | Publish plus follow and unfollow. No owner. |

## Build and deploy

```bash
cd apps/web
forge build
bun run launch:deploy
```

The deploy script writes `deployments/base-sepolia-launch.json` and prints every
address. The UI reads that record through generated artifacts.

## Limits

- The oracle is a demo feed, not Chainlink. Replacing it is a week two task.
- The exchange pool is only the tUSDC buyers have paid in.
- Follows are public signals, not positions.
- No contract has an owner function that can move user funds.
