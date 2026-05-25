'use client';

import { GuardianDashboard } from './v2/GuardianDashboard';

/**
 * Legacy export — routes use GuardianDashboard v2 (live `/api/*` + SSE).
 */
export function GuardianSOCDashboardWrapper() {
  return <GuardianDashboard />;
}
