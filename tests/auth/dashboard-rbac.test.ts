import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  canAccessRoute,
  hasAtLeastRole,
  normalizeDashboardRole,
  parseDashboardRolesEnv,
  resolveRolesForApiKey,
  assertTenantAdminScope,
} from '../../src/auth/dashboard-rbac.js';
import { DashboardAuth } from '../../src/auth/dashboard-auth.js';

describe('dashboard-rbac', () => {
  it('normalizes role aliases', () => {
    expect(normalizeDashboardRole('tenant_admin')).toBe('tenant-admin');
    expect(normalizeDashboardRole('VIEWER')).toBe('viewer');
  });

  it('parses GUARDIAN_DASHBOARD_ROLES comma map', () => {
    const map = parseDashboardRolesEnv('dev-key:operator,readonly:viewer');
    expect(map.get('dev-key')).toBe('operator');
    expect(map.get('readonly')).toBe('viewer');
  });

  it('enforces viewer vs admin routes', () => {
    expect(canAccessRoute(['viewer'], 'GET', '/api/aggregate/metrics').allowed).toBe(true);
    expect(canAccessRoute(['viewer'], 'POST', '/api/ai/rollback').allowed).toBe(false);
    expect(canAccessRoute(['admin'], 'POST', '/api/ai/rollback').allowed).toBe(true);
  });

  it('allows analyst export on audit with export=1', () => {
    expect(
      canAccessRoute(['analyst'], 'GET', '/api/aggregate/audit?export=1').allowed,
    ).toBe(true);
    expect(canAccessRoute(['viewer'], 'GET', '/api/aggregate/audit?export=1').allowed).toBe(
      false,
    );
  });

  it('operator can policy test', () => {
    expect(canAccessRoute(['operator'], 'POST', '/api/policy/test').allowed).toBe(true);
    expect(canAccessRoute(['viewer'], 'POST', '/api/policy/test').allowed).toBe(false);
  });

  it('viewer can read AI status; operator can poll and learning cycle', () => {
    expect(canAccessRoute(['viewer'], 'GET', '/api/ai/threats').allowed).toBe(true);
    expect(canAccessRoute(['viewer'], 'POST', '/api/ai/threats/poll').allowed).toBe(false);
    expect(canAccessRoute(['operator'], 'POST', '/api/ai/threats/poll').allowed).toBe(true);
    expect(canAccessRoute(['operator'], 'POST', '/api/ai/learning/cycle').allowed).toBe(true);
    expect(canAccessRoute(['operator'], 'POST', '/api/ai/rollback').allowed).toBe(false);
  });

  it('operator can save policy; viewer cannot', () => {
    expect(canAccessRoute(['operator'], 'PUT', '/api/policy').allowed).toBe(true);
    expect(canAccessRoute(['viewer'], 'PUT', '/api/policy').allowed).toBe(false);
    expect(canAccessRoute(['admin'], 'PUT', '/api/policy').allowed).toBe(true);
  });

  it('tenant-admin inherits admin capabilities', () => {
    expect(hasAtLeastRole('tenant-admin', 'admin')).toBe(true);
  });

  it('tenant-admin scope rejects cross-tenant', () => {
    const r = assertTenantAdminScope(['tenant-admin'], 'acme', 'other');
    expect(r.ok).toBe(false);
  });

  describe('DashboardAuth roles', () => {
    const prevKey = process.env.DASHBOARD_API_KEY;
    const prevRoles = process.env.GUARDIAN_DASHBOARD_ROLES;

    beforeEach(() => {
      process.env.DASHBOARD_API_KEY = 'test-admin-key';
      process.env.GUARDIAN_DASHBOARD_ROLES = 'test-admin-key:admin,read-only:viewer';
    });

    afterEach(() => {
      if (prevKey === undefined) delete process.env.DASHBOARD_API_KEY;
      else process.env.DASHBOARD_API_KEY = prevKey;
      if (prevRoles === undefined) delete process.env.GUARDIAN_DASHBOARD_ROLES;
      else process.env.GUARDIAN_DASHBOARD_ROLES = prevRoles;
    });

    it('maps API key to role from env', () => {
      expect(resolveRolesForApiKey('read-only')).toEqual(['viewer']);
      expect(resolveRolesForApiKey('test-admin-key')).toEqual(['admin']);
    });
  });
});
