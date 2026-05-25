'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchAuthStatus,
  fetchTenantContext,
  getTenantId,
  setTenantId,
  type AuthStatus,
} from '@/lib/guardian-api';

type Props = {
  authStatus: AuthStatus | null;
};

export function TenantContextBar({ authStatus }: Props) {
  const [tenantId, setTenantIdLocal] = useState('default');
  const [multiTenant, setMultiTenant] = useState(false);
  const [draft, setDraft] = useState('default');

  const locked =
    !!authStatus?.tenantLocked
    || (!!authStatus?.multiTenantMode && !!authStatus?.sessionTenantId);

  const refresh = useCallback(async () => {
    setTenantIdLocal(getTenantId());
    setDraft(getTenantId());
    const ctx = await fetchTenantContext();
    if (ctx) {
      setTenantIdLocal(ctx.tenantId);
      setDraft(ctx.tenantId);
      setMultiTenant(ctx.multiTenantMode);
    }
    const auth = authStatus ?? (await fetchAuthStatus());
    if (auth?.sessionTenantId && auth.multiTenantMode) {
      setTenantId(auth.sessionTenantId);
      setTenantIdLocal(auth.sessionTenantId);
      setDraft(auth.sessionTenantId);
    }
  }, [authStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyTenant = () => {
    if (locked) return;
    setTenantId(draft);
    window.location.reload();
  };

  return (
    <div className="tenant-context-bar" role="status" aria-label="Active tenant">
      <span className="tenant-label">Tenant</span>
      {locked ? (
        <strong className="tenant-chip">{tenantId}</strong>
      ) : (
        <span className="tenant-inline">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Tenant ID"
          />
          <button type="button" className="secondary" onClick={applyTenant}>
            Apply
          </button>
        </span>
      )}
      {multiTenant ? <span className="muted">Multi-tenant mode</span> : null}
      {locked ? <span className="muted">Bound to session</span> : null}
    </div>
  );
}
