'use client';

import KpiCard from './KpiCard';

interface ExecutiveOverviewPanelProps {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export default function ExecutiveOverviewPanel({
  data,
  loading,
  error,
}: ExecutiveOverviewPanelProps) {
  if (loading) return <div className="loading">Loading executive overview...</div>;
  if (error || !data) {
    return (
      <div className="error-panel">
        <p>Unable to load executive overview</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  const passRatePct = data.passRatePct ?? 0;
  const blockRatePct = data.blockRatePct ?? 0;

  return (
    <div className="executive-panel">
      <div className="panel-title">Executive Overview</div>

      <div className="kpi-grid">
        <KpiCard
          title="Total Requests"
          value={data.totalRequests?.toLocaleString() || '0'}
          comparison={data.comparison?.totalRequests}
        />
        <KpiCard
          title="Pass Rate"
          value={`${passRatePct.toFixed(1)}%`}
          comparison={data.comparison?.passRatePct}
          isPct={true}
        />
        <KpiCard
          title="Blocked Requests"
          value={data.blockedRequests?.toLocaleString() || '0'}
          comparison={data.comparison?.blockedRequests}
        />
        <KpiCard
          title="Block Rate"
          value={`${blockRatePct.toFixed(1)}%`}
          isPct={true}
        />
        <KpiCard
          title="Total Cost"
          value={`$${data.totalCostUsd?.toFixed(2) || '0.00'}`}
          comparison={data.comparison?.totalCostUsd}
          isMoney={true}
        />
        <KpiCard
          title="Avg Latency"
          value={`${data.avgLatencyMs || 0}ms`}
        />
      </div>

      {data.budgetUsd !== null && (
        <div className="budget-section">
          <h3>Budget Status</h3>
          <div className="budget-info">
            <div>
              Daily Budget: <strong>${data.budgetUsd?.toFixed(2)}</strong>
            </div>
            <div>
              Utilization: <strong>{data.budgetUtilizationPct?.toFixed(1)}%</strong>
            </div>
            {data.runwayDays !== null && (
              <div>
                Runway: <strong>{data.runwayDays} days</strong>
              </div>
            )}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(data.budgetUtilizationPct ?? 0, 100)}%`,
                backgroundColor:
                  (data.budgetUtilizationPct ?? 0) > 100 ? '#f85149' : '#238636',
              }}
            />
          </div>
        </div>
      )}

      <div className="top-items">
        <div className="top-servers">
          <h3>Top Servers by Cost</h3>
          <ul>
            {(data.topServersByCost || []).slice(0, 5).map((server: any, idx: number) => (
              <li key={idx}>
                <span>{server.server}</span>
                <span>${server.costUsd?.toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="top-tools">
          <h3>Top Tools by Calls</h3>
          <ul>
            {(data.topToolsByCalls || []).slice(0, 5).map((tool: any, idx: number) => (
              <li key={idx}>
                <span>{tool.tool}</span>
                <span>{tool.calls?.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        .executive-panel {
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

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .budget-section {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .budget-section h3 {
          margin: 0 0 1rem 0;
          color: #e1e8ed;
          font-size: 1.1rem;
        }

        .budget-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
          color: #8b949e;
        }

        .budget-info div {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .budget-info strong {
          color: #e1e8ed;
          font-weight: 600;
        }

        .progress-bar {
          height: 8px;
          background: #161b22;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 1rem;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .top-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .top-servers,
        .top-tools {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .top-servers h3,
        .top-tools h3 {
          margin: 0 0 1rem 0;
          color: #e1e8ed;
          font-size: 1.1rem;
        }

        .top-servers ul,
        .top-tools ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .top-servers li,
        .top-tools li {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #30363d;
          color: #8b949e;
          font-size: 0.9rem;
        }

        .top-servers li:last-child,
        .top-tools li:last-child {
          border-bottom: none;
        }

        .top-servers span:first-child,
        .top-tools span:first-child {
          font-weight: 600;
          color: #e1e8ed;
        }

        .loading,
        .error-panel {
          padding: 2rem;
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
