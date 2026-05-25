'use client';

import { DashboardClient } from './DashboardClient';

/**
 * Legacy export — the mock/demo GuardianSOCDashboard UI is retired.
 * All routes use DashboardClient (live `/api/*` data only).
 */
export function GuardianSOCDashboardWrapper() {
  return <DashboardClient />;
}
