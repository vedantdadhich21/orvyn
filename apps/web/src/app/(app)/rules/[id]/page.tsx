import type { Metadata } from 'next';

import { RulesScreen } from '@/features/orvyn/rules-screen';

export const metadata: Metadata = {
  title: 'Set the rules',
  description: 'Set the limits a simulated ORVYN portfolio is held to, and check the plan against them.',
};

export default function RulesPage() {
  return <RulesScreen />;
}
