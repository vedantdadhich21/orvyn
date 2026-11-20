import type { Metadata } from 'next';

import { DashboardScreen } from '@/features/orvyn/dashboard-screen';

export const metadata: Metadata = {
  title: 'Drift dashboard',
  description: 'Simulated book value, live weights and drift against a portfolio’s own rules.',
};

export default function PortfolioPage() {
  return <DashboardScreen />;
}
