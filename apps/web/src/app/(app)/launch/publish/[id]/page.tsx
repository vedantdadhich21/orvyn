import type { Metadata } from 'next';

import { PublishScreen } from '@/features/orvyn/publish-screen';

export const metadata: Metadata = { title: 'Publish to launch' };

export default function LaunchPublishPage() {
  return <PublishScreen mode="launch" />;
}
