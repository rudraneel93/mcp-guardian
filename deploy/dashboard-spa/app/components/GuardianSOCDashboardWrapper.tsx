'use client';

import { DashboardClient } from './DashboardClient';

/** Legacy export — full live dashboard (all API-backed panels). */
export function GuardianSOCDashboardWrapper() {
  return <DashboardClient />;
}
