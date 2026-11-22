import type { Metadata } from 'next';

import { AdminScreen } from '@/features/orvyn/admin-screen';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminScreen />;
}
