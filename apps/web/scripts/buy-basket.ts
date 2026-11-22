/**
 * Prove the core loop: claim tUSDC, buy a three-stock basket, follow the seed
 * strategy.
 *
 * Run from apps/web:
 *
 *   BUYER_PRIVATE_KEY=0x... bun run launch:basket
 *
 * If no buyer key is supplied, the script creates one at ~/.orvyn-buyer-key,
 * prints its address and waits for gas before you run it again.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  isHex,
  parseUnits,
} from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import {
  ORVYN_EXCHANGE_ABI,
  STRATEGY_REGISTRY_V2_ABI,
  TEST_STOCK_ABI,
  TEST_USD_ABI,
} from '../src/lib/orvyn/launch-contracts';

type Deployment = {
  chainId: number;
  contracts: { testUSD: `0x${string}`; exchange: `0x${string}`; registryV2: `0x${string}` };
  stocks: Record<string, { address: `0x${string}`; name: string; priceUsd: number }>;
  seedStrategy: { id: string; payload: string; txHash: string };
};

const here = dirname(fileURLToPath(import.meta.url));
const deployment = JSON.parse(
  readFileSync(join(here, '..', 'deployments', 'base-sepolia-launch.json'), 'utf8'),
) as Deployment;

function buyerKey(): { key: `0x${string}`; created: boolean } {
  const env = process.env.BUYER_PRIVATE_KEY?.trim();
  if (env) {
    const key = env.startsWith('0x') ? env : `0x${env}`;
    if (!isHex(key, { strict: true }) || key.length !== 66) throw new Error('Buyer key is malformed.');
    return { key: key as `0x${string}`, created: false };
  }

  const path = `${process.env.HOME}/.orvyn-buyer-key`;
  if (existsSync(path)) {
    return { key: readFileSync(path, 'utf8').trim() as `0x${string}`, created: false };
  }

  const key = generatePrivateKey();
  writeFileSync(path, `${key}\n`, { mode: 0o600 });
  return { key, created: true };
}

const basket = ['NVDA', 'MSFT', 'GOOGL'] as const;
const PER_LINE = parseUnits('100', 6);

async function main() {
  const { key, created } = buyerKey();
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org'),
  });
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org') });

  console.log(`Buyer     ${account.address}`);
  const gas = await publicClient.getBalance({ address: account.address });
  if (gas === BigInt(0)) {
    console.log(`No Base Sepolia ETH for gas. Fund ${account.address}, then run this again.`);
    process.exit(1);
  }
  if (created) console.log('Created a fresh buyer key at ~/.orvyn-buyer-key');

  const balance = (await publicClient.readContract({
    address: deployment.contracts.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })) as bigint;

  if (balance < PER_LINE * BigInt(basket.length)) {
    console.log('Claiming 1,000 tUSDC...');
    const claimHash = await wallet.writeContract({
      address: deployment.contracts.testUSD,
      abi: TEST_USD_ABI,
      functionName: 'claim',
      account,
      chain: baseSepolia,
    });
    const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
    if (claimReceipt.status !== 'success') throw new Error('The faucet transaction reverted.');
  }

  const total = PER_LINE * BigInt(basket.length);
  const approveHash = await wallet.writeContract({
    address: deployment.contracts.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'approve',
    args: [deployment.contracts.exchange, total],
    account,
    chain: baseSepolia,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  for (const ticker of basket) {
    const stock = deployment.stocks[ticker];
    if (!stock) throw new Error(`No deployment for ${ticker}`);
    const preview = (await publicClient.readContract({
      address: deployment.contracts.exchange,
      abi: ORVYN_EXCHANGE_ABI,
      functionName: 'previewBuy',
      args: [stock.address, PER_LINE],
    })) as bigint;
    const minOut = (preview * BigInt(99)) / BigInt(100);

    const hash = await wallet.writeContract({
      address: deployment.contracts.exchange,
      abi: ORVYN_EXCHANGE_ABI,
      functionName: 'buy',
      args: [stock.address, PER_LINE, minOut],
      account,
      chain: baseSepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${ticker} buy reverted.`);
    console.log(`Bought ${ticker.padEnd(6)} ${formatUnits(preview, 18)} at $${stock.priceUsd}`);
  }

  const seedId = BigInt(deployment.seedStrategy.id);
  const author = (await publicClient.readContract({
    address: deployment.contracts.registryV2,
    abi: STRATEGY_REGISTRY_V2_ABI,
    functionName: 'get',
    args: [seedId],
  })) as { author: `0x${string}` };
  const alreadyFollowing = (await publicClient.readContract({
    address: deployment.contracts.registryV2,
    abi: STRATEGY_REGISTRY_V2_ABI,
    functionName: 'isFollowing',
    args: [seedId, account.address],
  })) as boolean;

  if (author.author.toLowerCase() === account.address.toLowerCase()) {
    console.log('Buyer authored the seed, so follow is skipped. Use a different buyer to test follow.');
  } else if (!alreadyFollowing) {
    const hash = await wallet.writeContract({
      address: deployment.contracts.registryV2,
      abi: STRATEGY_REGISTRY_V2_ABI,
      functionName: 'follow',
      args: [seedId],
      account,
      chain: baseSepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Follow reverted.');
    console.log(`Followed strategy #${seedId.toString()}`);
  } else {
    console.log(`Already following strategy #${seedId.toString()}`);
  }

  for (const ticker of basket) {
    const stock = deployment.stocks[ticker];
    if (!stock) continue;
    const held = (await publicClient.readContract({
      address: stock.address,
      abi: TEST_STOCK_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })) as bigint;
    console.log(`Held ${ticker.padEnd(6)} ${formatUnits(held, 18)}`);
  }

  const left = (await publicClient.readContract({
    address: deployment.contracts.testUSD,
    abi: TEST_USD_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })) as bigint;
  console.log(`tUSDC left ${formatUnits(left, 6)}`);
  console.log('Basket complete. Testnet only; no real value.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Basket failed: ${message.split('\n')[0]}`);
  process.exit(1);
});
