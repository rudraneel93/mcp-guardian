'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminAuditTrail,
  fetchLogs,
  fetchTenantContext,
  setTenantId,
  getTenantId,
} from '@/lib/guardian-api';
import { hasPermission } from '@/lib/dashboard-roles';

type Props = {
  roles?: string[];
  tenantLocked?: boolean;
};

export function AdminPanel({ roles, tenantLocked = false }: Props) {
  const canAdmin = hasPermission(roles, 'admin');
  const [tenantId, setTenantIdLocal] = useState('default');
  const [multiTenant, setMultiTenant] = useState(false);
  const [trail, setTrail] = useState<unknown[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setTenantIdLocal(getTenantId());
    const ctx = await fetchTenantContext();
    if (ctx) {
      setTenantIdLocal(ctx.tenantId);
      setMultiTenant(ctx.multiTenantMode);
    }
    if (canAdmin) {
      setTrail(await fetchAdminAuditTrail());
      setLogs(await fetchLogs());
    }
  }, [canAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyTenant = () => {
    setTenantId(tenantId);
    window.location.reload();
  };

  return (
    <section>
      <h2>Admin &amp; compliance</h2>

      <div className="session-bar">
        {tenantLocked ? (
          <span>
            Tenant ID: <strong>{tenantId}</strong> <span className="muted">(session-bound)</span>
          </span>
        ) : (
          <>
            <span className="tenant-inline">
              Tenant ID:
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantIdLocal(e.target.value)}
              />
            </span>
            <button type="button" className="secondary" onClick={applyTenant}>
              Apply tenant &amp; reload
            </button>
          </>
        )}
        {multiTenant ? <span className="muted">Multi-tenant mode on</span> : null}
      </div>

      {canAdmin ? (
        <>
          <h3>Policy audit trail</h3>
          {trail.length === 0 ? (
            <p className="muted">No audit trail entries.</p>
          ) : (
            <pre className="code-block">{JSON.stringify(trail.slice(0, 20), null, 2)}</pre>
          )}

          <h3>Operational logs</h3>
          {logs.length === 0 ? (
            <p className="muted">No log lines (swarm job.log when present).</p>
          ) : (
            <pre className="code-block log-tail">{logs.join('\n')}</pre>
          )}
        </>
      ) : (
        <p className="muted">Admin role required for audit trail and logs.</p>
      )}
    </section>
  );
}
