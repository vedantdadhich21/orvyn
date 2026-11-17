import type { Metadata } from 'next';

import { AllocateScreen } from '@/features/orvyn/allocate-screen';

export const metadata: Metadata = {
  title: 'Set weights',
  description: 'Allocate a simulated ORVYN portfolio across its selected lines.',
};

export default function AllocatePage() {
  return <AllocateScreen />;
}
