/**
 * Deploy the testnet MVP suite to Base Sepolia:
 * tUSDC, price oracle, exchange, seven stock tokens and Registry v2.
 * Then set the demo prices and publish one seed strategy.
 *
 * Run from apps/web:
 *
 *   DEPLOYER_PRIVATE_KEY=0x... bun run launch:deploy
 *
 * The printed addresses are public. The key is never printed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isHex,
  type Abi,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import {
  ORVYN_EXCHANGE_ABI,
  ORVYN_EXCHANGE_BYTECODE,
  PRICE_ORACLE_ABI,
  PRICE_ORACLE_BYTECODE,
  STRATEGY_REGISTRY_V2_ABI,
  STRATEGY_REGISTRY_V2_BYTECODE,
  TEST_STOCK_ABI,
  TEST_STOCK_BYTECODE,
  TEST_USD_ABI,
  TEST_USD_BYTECODE,
} from '../src/lib/orvyn/launch-contracts';
import { LAUNCH_STOCKS } from '../src/lib/orvyn/launch-stocks';
import { buildStrategy } from '../src/lib/orvyn/strategy';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
const EXPLORER = baseSepolia.blockExplorers.default.url;
const here = dirname(fileURLToPath(import.meta.url));
const recordPath = join(here, '..', 'deployments', 'base-sepolia-launch.json');

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function readKey(): `0x${string}` {
  const env = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  const file = `${process.env.HOME}/.orvyn-deployer-key`;
  const raw = env || (existsSync(file) ? readFileSync(file, 'utf8').trim() : '');
  if (!raw) fail('DEPLOYER_PRIVATE_KEY is missing and ~/.orvyn-deployer-key does not exist.');
  const key = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!isHex(key, { strict: true }) || key.length !== 66) fail('The deployer key is malformed.');
  return key as `0x${string}`;
}

async function main() {
  const account = privateKeyToAccount(readKey());
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  console.log(`Deployer  ${account.address}`);
  console.log(`Network   ${baseSepolia.name} (${baseSepolia.id})`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance   ${formatEther(balance)} ETH`);
  if (balance === BigInt(0)) fail('The deployer has no Base Sepolia ETH.');

  const transactions: Record<string, Hash> = {};

  async function deploy(
    label: string,
    abi: Abi,
    bytecode: `0x${string}`,
    args: readonly unknown[] = [],
  ): Promise<Address> {
    const hash = await wallet.deployContract({ abi, bytecode, args, account, chain: baseSepolia });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success' || !receipt.contractAddress) {
      fail(`${label} deployment failed: ${EXPLORER}/tx/${hash}`);
    }
    transactions[label] = hash;
    console.log(`${label.padEnd(20)} ${receipt.contractAddress}  ${hash}`);
    return receipt.contractAddress;
  }

  const testUSD = await deploy(
    'testUSD',
    TEST_USD_ABI as unknown as Abi,
    TEST_USD_BYTECODE,
  );
  const priceOracle = await deploy(
    'priceOracle',
    PRICE_ORACLE_ABI as unknown as Abi,
    PRICE_ORACLE_BYTECODE,
  );
  const exchange = await deploy(
    'exchange',
    ORVYN_EXCHANGE_ABI as unknown as Abi,
    ORVYN_EXCHANGE_BYTECODE,
    [testUSD, priceOracle],
  );

  const stocks: Record<string, { address: Address; name: string; priceUsd: number }> = {};
  for (const stock of LAUNCH_STOCKS) {
    const address = await deploy(
      `stock:${stock.ticker}`,
      TEST_STOCK_ABI as unknown as Abi,
      TEST_STOCK_BYTECODE,
      [stock.name, stock.ticker, exchange],
    );
    stocks[stock.ticker] = { address, name: stock.name, priceUsd: stock.usd };
  }

  const registryV2 = await deploy(
    'registryV2',
    STRATEGY_REGISTRY_V2_ABI as unknown as Abi,
    STRATEGY_REGISTRY_V2_BYTECODE,
  );

  const stockAddresses = LAUNCH_STOCKS.map((stock) => stocks[stock.ticker]!.address);
  const prices = LAUNCH_STOCKS.map((stock) => BigInt(stock.usd) * BigInt(100_000_000));
  const priceHash = await wallet.writeContract({
    address: priceOracle,
    abi: PRICE_ORACLE_ABI,
    functionName: 'setPrices',
    args: [stockAddresses, prices],
    account,
    chain: baseSepolia,
  });
  await publicClient.waitForTransactionReceipt({ hash: priceHash });
  transactions.setPrices = priceHash;
  console.log(`prices set             ${priceHash}`);

  const seed = buildStrategy({
    name: 'Future of AI',
    tickers: ['NVDA', 'MSFT', 'GOOGL', 'CASH'],
    weights: { NVDA: 40, MSFT: 20, GOOGL: 20, CASH: 20 },
    rules: { ceilingPct: 40, cashFloorPct: 0, driftBandPct: 5 },
  });
  if (!seed.ok) fail(seed.reason);

  const seedHash = await wallet.writeContract({
    address: registryV2,
    abi: STRATEGY_REGISTRY_V2_ABI,
    functionName: 'publish',
    args: [seed.name, seed.payload],
    account,
    chain: baseSepolia,
  });
  const seedReceipt = await publicClient.waitForTransactionReceipt({ hash: seedHash });
  if (seedReceipt.status !== 'success') fail(`Seed publish failed: ${EXPLORER}/tx/${seedHash}`);
  transactions.seedStrategy = seedHash;
  console.log(`seed strategy #0       ${seedHash}`);

  const record = {
    chainId: baseSepolia.id,
    chain: baseSepolia.name,
    explorer: EXPLORER,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts: { testUSD, priceOracle, exchange, registryV2 },
    stocks,
    seedStrategy: { id: '0', payload: seed.payload, txHash: seedHash },
    transactions,
  };

  mkdirSync(dirname(recordPath), { recursive: true });
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  console.log('\nLaunch suite deployed.');
  console.log(`  tUSDC       ${testUSD}`);
  console.log(`  exchange    ${exchange}`);
  console.log(`  registry v2 ${registryV2}`);
  console.log(`  record      ${recordPath}`);
  console.log('\nAdd these to Vercel and apps/web/.env.local:');
  console.log(`NEXT_PUBLIC_LAUNCH_TUSD=${testUSD}`);
  console.log(`NEXT_PUBLIC_LAUNCH_EXCHANGE=${exchange}`);
  console.log(`NEXT_PUBLIC_LAUNCH_REGISTRY_V2=${registryV2}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Deployment failed: ${message.split('\n')[0]}`);
});
