import type { Metadata } from 'next';

import { CreateScreen } from '@/features/orvyn/create-screen';

export const metadata: Metadata = {
  title: 'Create a portfolio',
  description: 'Pick the stocks that belong in a simulated ORVYN portfolio.',
};

export default function CreatePage() {
  return <CreateScreen />;
}
