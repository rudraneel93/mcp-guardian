import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';
import { DashboardClient } from './components/DashboardClient';

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardClient />
    </DashboardErrorBoundary>
  );
}
