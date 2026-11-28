import 'server-only';

/**
 * Mainnet capabilities are deliberately separate from the testnet app.
 * Reads can be enabled independently. Writes require both a flag and an
 * explicit owner approval flag, and remain unavailable in this phase.
 */
export function mainnetReadsEnabled(): boolean {
  return process.env.MAINNET_READS_ENABLED === 'true';
}

export function mainnetWritesEnabled(): boolean {
  return (
    process.env.MAINNET_WRITES_ENABLED === 'true' &&
    process.env.MAINNET_WRITES_APPROVED === 'true'
  );
}

export function builderProofEnabled(): boolean {
  return process.env.BUILDER_PROOF_ENABLED === 'true';
}
