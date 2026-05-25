export type DashboardRole =
  | 'viewer'
  | 'analyst'
  | 'operator'
  | 'admin'
  | 'tenant-admin';

const ORDER: DashboardRole[] = [
  'viewer',
  'analyst',
  'operator',
  'admin',
  'tenant-admin',
];

export type DashboardPermission =
  | 'read'
  | 'export'
  | 'policy_test'
  | 'policy_mutate'
  | 'admin'
  | 'ai';

const MIN_ROLE: Record<DashboardPermission, DashboardRole> = {
  read: 'viewer',
  export: 'analyst',
  policy_test: 'operator',
  policy_mutate: 'operator',
  admin: 'admin',
  ai: 'admin',
};

function rank(role: DashboardRole): number {
  return ORDER.indexOf(role);
}

export function normalizeRole(raw: string): DashboardRole | null {
  const r = raw.trim().toLowerCase().replace(/_/g, '-');
  if (r === 'tenantadmin') return 'tenant-admin';
  return ORDER.includes(r as DashboardRole) ? (r as DashboardRole) : null;
}

export function hasPermission(
  roles: string[] | undefined,
  perm: DashboardPermission,
): boolean {
  if (!roles?.length) return true;
  const required = MIN_ROLE[perm];
  return roles.some((r) => {
    const role = normalizeRole(r);
    if (!role) return false;
    if (role === 'tenant-admin' && required !== 'tenant-admin') {
      return rank('admin') >= rank(required);
    }
    if (required === 'tenant-admin') {
      return role === 'tenant-admin' || role === 'admin';
    }
    return rank(role) >= rank(required);
  });
}
