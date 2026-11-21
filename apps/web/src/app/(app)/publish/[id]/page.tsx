import type { Metadata } from 'next';

import { PublishScreen } from '@/features/orvyn/publish-screen';

export const metadata: Metadata = { title: 'Publish' };

export default function PublishPage() {
  return <PublishScreen />;
}
