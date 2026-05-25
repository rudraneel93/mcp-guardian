'use client';

import type { AuthStatus } from '@/lib/guardian-api';

type Props = {
  authStatus: AuthStatus | null;
};

/** Shown when open-core Community tier — dashboard loads but Pro APIs may return 402. */
export function ProUpgradeBanner({ authStatus }: Props) {
  if (!authStatus) return null;
  if (authStatus.tier === 'pro' || authStatus.licensed === true) return null;
  if (authStatus.openCore === false && authStatus.licenseEnforced === false) return null;

  const upgradeUrl = authStatus.upgradeUrl?.trim();
  return (
    <div className="pro-upgrade-banner" role="status">
      <strong>Community tier</strong>
      <span>
        {' '}
        — Install and proxy are free on npm. Unlock dashboard, security swarm, multi-tenant, and
        semantic audit with{' '}
        <strong>MCP Guardian Pro</strong> ($4.99 lifetime).
      </span>
      {upgradeUrl ? (
        <a className="pro-upgrade-link" href={upgradeUrl} target="_blank" rel="noopener noreferrer">
          Buy Pro
        </a>
      ) : null}
    </div>
  );
}
