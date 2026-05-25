import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';
import { GuardianDashboard } from './components/v2/GuardianDashboard';

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <GuardianDashboard />
    </DashboardErrorBoundary>
  );
}
