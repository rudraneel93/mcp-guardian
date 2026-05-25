import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';
import { DashboardClient } from './components/DashboardClient';

/** Live SOC dashboard — all panels load from `/api/*` (SOC API or proxy), no bundled snapshots. */
export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardClient />
    </DashboardErrorBoundary>
  );
}
