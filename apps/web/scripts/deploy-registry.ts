/**
 * Deploy StrategyRegistry to Base Sepolia and record where it landed.
 *
 * Run from apps/web:
 *
 *   DEPLOYER_PRIVATE_KEY=0x... bun run contracts:deploy
 *   DEPLOYER_PRIVATE_KEY=0x... bun run contracts:deploy --dry-run
 *
 * The key is read from the environment, used to sign one deployment, and
 * never printed. `--dry-run` validates the key, reads the balance and prices
 * the deployment without sending anything.
 *
 * Base Sepolia ETH is test money. The script refuses to run against any other
 * chain, because a Chapter 1 registry is meant to be inspectable, not paid for.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  isHex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import { STRATEGY_REGISTRY_ABI, STRATEGY_REGISTRY_BYTECODE } from '../src/lib/orvyn/strategy-registry';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org';
const EXPLORER = baseSepolia.blockExplorers.default.url;
const DRY_RUN = process.argv.includes('--dry-run');
const here = dirname(fileURLToPath(import.meta.url));
const recordPath = join(here, '..', 'deployments', 'base-sepolia.json');

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function readKey(): `0x${string}` {
  const raw = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) {
    fail(
      [
        'DEPLOYER_PRIVATE_KEY is not set.',
        '',
        'Use a dedicated test wallet, never a wallet that holds real funds:',
        '  DEPLOYER_PRIVATE_KEY=0x... bun run contracts:deploy',
        '',
        'Fund it with Base Sepolia ETH first:',
        '  https://portal.cdp.coinbase.com/products/faucet',
      ].join('\n'),
    );
  }

  const prefixed = raw.startsWith('0x') ? raw : `0x${raw}`;
  if (!isHex(prefixed, { strict: true }) || prefixed.length !== 66) {
    fail('DEPLOYER_PRIVATE_KEY must be 32 bytes of hex (64 characters, with or without 0x).');
  }
  return prefixed as `0x${string}`;
}

async function main() {
  const key = readKey();
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  console.log(`Deployer  ${account.address}`);
  console.log(`Network   ${baseSepolia.name} (${baseSepolia.id})`);
  console.log(`RPC       ${RPC_URL}`);
  console.log(`Compiler  solc 0.8.24, optimizer 200 runs, cancun`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance   ${formatEther(balance)} ETH`);

  if (balance === BigInt(0)) {
    fail(
      [
        'This wallet has no Base Sepolia ETH, so it cannot pay for gas.',
        '',
        `Fund ${account.address} from a faucet:`,
        '  https://portal.cdp.coinbase.com/products/faucet',
        '  https://docs.base.org/base-chain/network-information',
        '',
        'Nothing was sent.',
      ].join('\n'),
    );
  }

  const [gas, gasPrice] = await Promise.all([
    publicClient.estimateGas({ account, data: STRATEGY_REGISTRY_BYTECODE }),
    publicClient.getGasPrice(),
  ]);
  const estimated = gas * gasPrice;
  console.log(`Estimate  ${formatEther(estimated)} ETH for ${gas.toString()} gas`);

  if (balance < estimated) {
    fail(
      [
        'The balance does not cover the estimated deployment cost.',
        '',
        `Balance   ${formatEther(balance)} ETH`,
        `Estimate  ${formatEther(estimated)} ETH`,
        '',
        'Fund the wallet from a faucet and run this again. Nothing was sent.',
      ].join('\n'),
    );
  }

  if (DRY_RUN) {
    console.log('\nDry run. The key is valid and the wallet can pay. Nothing was sent.');
    return;
  }

  const hash = await walletClient.deployContract({
    abi: STRATEGY_REGISTRY_ABI,
    bytecode: STRATEGY_REGISTRY_BYTECODE,
    account,
    chain: baseSepolia,
  });
  console.log(`\nSent      ${hash}`);
  console.log(`Waiting   ${EXPLORER}/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success' || !receipt.contractAddress) {
    fail(`The deployment transaction failed. Inspect it at ${EXPLORER}/tx/${hash}`);
  }

  const address = receipt.contractAddress as Address;
  if (!isAddress(address)) fail('The receipt did not contain a contract address.');

  // A read-back is the cheapest proof that the bytecode is live and callable.
  const count = await publicClient.readContract({
    address,
    abi: STRATEGY_REGISTRY_ABI,
    functionName: 'count',
  });

  const record = {
    chainId: baseSepolia.id,
    chain: baseSepolia.name,
    explorer: EXPLORER,
    address,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    deployer: account.address,
    compiler: '0.8.24',
    optimizerRuns: 200,
    deployedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(recordPath), { recursive: true });
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  console.log('\nRegistry deployed.');
  console.log(`  address   ${address}`);
  console.log(`  count     ${count.toString()}`);
  console.log(`  explorer  ${EXPLORER}/address/${address}`);
  console.log(`  record    ${recordPath}`);
  console.log('\nAdd this to apps/web/.env.local and to the Vercel project:');
  console.log(`  NEXT_PUBLIC_STRATEGY_REGISTRY=${address}`);
  console.log('\nRedeploy the web app, then publish from /publish/<draft>.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(`Deployment failed: ${message.split('\n')[0]}`);
});
