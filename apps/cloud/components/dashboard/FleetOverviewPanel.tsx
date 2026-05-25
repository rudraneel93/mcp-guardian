'use client';

interface FleetOverviewPanelProps {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export default function FleetOverviewPanel({
  data,
  loading,
  error,
}: FleetOverviewPanelProps) {
  if (loading) return <div className="loading">Loading fleet data...</div>;
  if (error || !data) {
    return (
      <div className="error-panel">
        <p>Unable to load fleet data</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <div className="fleet-panel">
      <div className="panel-title">Fleet Overview</div>

      <div className="fleet-stats">
        <div className="stat-card">
          <div className="stat-label">Total Instances</div>
          <div className="stat-value">{data.totalInstances || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Instances</div>
          <div className="stat-value" style={{ color: '#238636' }}>
            {data.activeInstances || 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{(data.totalRequests || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Blocked</div>
          <div className="stat-value" style={{ color: '#f85149' }}>
            {(data.totalBlocked || 0).toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Cost</div>
          <div className="stat-value">${(data.totalCostUsd || 0).toFixed(2)}</div>
        </div>
      </div>

      {data.instances && data.instances.length > 0 ? (
        <div className="instances-table">
          <table>
            <thead>
              <tr>
                <th>Instance Name</th>
                <th>Hostname</th>
                <th>Status</th>
                <th>Region</th>
                <th>Total Requests</th>
                <th>Blocked</th>
                <th>Cost (USD)</th>
                <th>Avg Latency (ms)</th>
              </tr>
            </thead>
            <tbody>
              {data.instances.map((instance: any, idx: number) => (
                <tr key={idx}>
                  <td>{instance.instanceName}</td>
                  <td>{instance.hostname}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor:
                          instance.status === 'active' ? '#238636' : '#d29922',
                      }}
                    >
                      {instance.status}
                    </span>
                  </td>
                  <td>{instance.region || '—'}</td>
                  <td>{(instance.totalRequests || 0).toLocaleString()}</td>
                  <td>{(instance.blockedRequests || 0).toLocaleString()}</td>
                  <td>${(instance.totalCostUsd || 0).toFixed(4)}</td>
                  <td>{instance.avgLatencyMs || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No instances found</div>
      )}

      <style jsx>{`
        .fleet-panel {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .panel-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #e1e8ed;
          margin-bottom: 1rem;
        }

        .fleet-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #8b949e;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #e1e8ed;
        }

        .instances-table {
          overflow-x: auto;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        thead {
          background: #161b22;
          border-bottom: 1px solid #30363d;
        }

        th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #8b949e;
          white-space: nowrap;
        }

        tbody tr {
          border-bottom: 1px solid #30363d;
        }

        tbody tr:hover {
          background: #161b22;
        }

        td {
          padding: 1rem;
          color: #e1e8ed;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .empty-state,
        .loading,
        .error-panel {
          padding: 3rem;
          text-align: center;
          color: #8b949e;
          background: #0d1117;
          border-radius: 8px;
          border: 1px solid #30363d;
        }

        .error-text {
          color: #f85149;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
