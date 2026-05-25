'use client';

import dynamic from 'next/dynamic';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { DashboardShell } from './DashboardShell';

const DashboardClient = dynamic(
  () => import('./DashboardClient').then((mod) => mod.DashboardClient),
  {
    ssr: false,
    loading: () => <DashboardShell />,
  },
);

export function DashboardPageClient() {
  return (
    <DashboardErrorBoundary>
      <DashboardClient />
    </DashboardErrorBoundary>
  );
}
