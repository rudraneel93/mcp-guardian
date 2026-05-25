type Props = {
  status?: string;
  statusIsError?: boolean;
  tenantId?: string;
};

/** Static shell used for loading placeholders (matches pre-hydration HTML). */
export function DashboardShell({
  status = 'Loading…',
  statusIsError = false,
  tenantId,
}: Props) {
  return (
    <main>
      <header>
        <h1>MCP Guardian</h1>
        <p
          className={statusIsError ? 'status status-error' : 'status'}
          suppressHydrationWarning
        >
          {status}
        </p>
        {tenantId ? (
          <p className="tenant-context-bar" suppressHydrationWarning>
            <span className="tenant-label">Tenant</span>
            <strong className="tenant-chip">{tenantId}</strong>
          </p>
        ) : null}
      </header>
    </main>
  );
}
