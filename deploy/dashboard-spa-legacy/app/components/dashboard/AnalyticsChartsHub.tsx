'use client';

import { InfrastructureVisualsPanel } from '../InfrastructureVisualsPanel';
import { DashboardSection } from './DashboardSection';

type Props = {
  refreshKey?: number;
};

/** Shared analytics chart hub for Overview, Analysis, and Agent flow surfaces. */
export function AnalyticsChartsHub({ refreshKey = 0 }: Props) {
  return (
    <DashboardSection
      title="Infrastructure analytics"
      subtitle="Traffic, AI learning, semantic audit, and regression probes from live proxy data"
    >
      <InfrastructureVisualsPanel refreshKey={refreshKey} />
    </DashboardSection>
  );
}

export { InfrastructureVisualsPanel };
