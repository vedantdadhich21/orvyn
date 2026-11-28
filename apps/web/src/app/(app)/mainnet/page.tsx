import type {Metadata} from 'next';

import {MainnetReaderScreen} from '@/features/base/mainnet-reader-screen';
import {mainnetReadsEnabled} from '@/server/base/flags';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Base Mainnet reader',
  description: 'Read-only Base Mainnet balances and Coinbase tokenized stock reference data.',
};

export default function MainnetReaderPage() {
  return <MainnetReaderScreen enabled={mainnetReadsEnabled()} />;
}
