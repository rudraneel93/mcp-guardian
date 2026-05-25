'use client';

interface CostGovernancePanelProps {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export default function CostGovernancePanel({
  data,
  loading,
  error,
}: CostGovernancePanelProps) {
  if (loading) return <div className="loading">Loading cost data...</div>;
  if (error || !data) {
    return (
      <div className="error-panel">
        <p>Unable to load cost data</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <div className="cost-panel">
      <div className="panel-title">Cost Governance</div>

      <div className="cost-metrics">
        <div className="metric-card">
          <div className="metric-label">Total Cost (USD)</div>
          <div className="metric-value">${(data.totalCostUsd || 0).toFixed(2)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Burn Rate (per hour)</div>
          <div className="metric-value">${(data.burnRatePerHour || 0).toFixed(4)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Projected Monthly</div>
          <div className="metric-value">${(data.projectedMonthlyUsd || 0).toFixed(2)}</div>
        </div>
        {data.budgetUsd !== null && (
          <>
            <div className="metric-card">
              <div className="metric-label">Daily Budget</div>
              <div className="metric-value">${(data.budgetUsd || 0).toFixed(2)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Budget Utilization</div>
              <div
                className="metric-value"
                style={{
                  color:
                    (data.budgetUtilizationPct || 0) > 100 ? '#f85149' : '#238636',
                }}
              >
                {(data.budgetUtilizationPct || 0).toFixed(1)}%
              </div>
            </div>
            {data.runwayDays !== null && (
              <div className="metric-card">
                <div className="metric-label">Runway (days)</div>
                <div
                  className="metric-value"
                  style={{
                    color:
                      (data.runwayDays || 0) < 7 ? '#f85149' : '#238636',
                  }}
                >
                  {data.runwayDays}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {data.topServersByCost && data.topServersByCost.length > 0 && (
        <div className="cost-breakdown">
          <h3>Top Cost Drivers</h3>
          <div className="cost-list">
            {data.topServersByCost.map((server: any, idx: number) => {
              const totalCost = data.totalCostUsd || 0;
              const pct = totalCost > 0 ? (server.costUsd / totalCost) * 100 : 0;
              return (
                <div key={idx} className="cost-item">
                  <div className="cost-details">
                    <div className="cost-name">{server.server}</div>
                    <div className="cost-calls">{server.calls?.toLocaleString()} calls</div>
                  </div>
                  <div className="cost-value">
                    <div className="cost-amount">${(server.costUsd || 0).toFixed(4)}</div>
                    <div className="cost-pct">{pct.toFixed(1)}%</div>
                  </div>
                  <div className="cost-bar">
                    <div
                      className="cost-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          pct > 50 ? '#f85149' : pct > 25 ? '#d29922' : '#238636',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.windowDays && (
        <div className="window-info">
          <p>Data from last {data.windowDays} day(s)</p>
          {data.lastUpdate && (
            <p className="update-time">
              Last updated: {new Date(data.lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .cost-panel {
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

        .cost-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .metric-card:hover {
          border-color: #58a6ff;
        }

        .metric-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #8b949e;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: #e1e8ed;
        }

        .cost-breakdown {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .cost-breakdown h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.1rem;
          color: #e1e8ed;
        }

        .cost-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cost-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 1rem;
        }

        .cost-details {
          flex: 1;
          min-width: 0;
        }

        .cost-name {
          font-weight: 600;
          color: #e1e8ed;
          margin-bottom: 0.25rem;
        }

        .cost-calls {
          font-size: 0.9rem;
          color: #8b949e;
        }

        .cost-value {
          text-align: right;
          min-width: 120px;
        }

        .cost-amount {
          font-weight: 700;
          color: #e1e8ed;
          font-size: 1.1rem;
        }

        .cost-pct {
          font-size: 0.875rem;
          color: #8b949e;
        }

        .cost-bar {
          width: 150px;
          height: 6px;
          background: #0d1117;
          border-radius: 3px;
          overflow: hidden;
        }

        .cost-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .window-info {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1rem;
          font-size: 0.9rem;
          color: #8b949e;
        }

        .window-info p {
          margin: 0.5rem 0;
        }

        .update-time {
          font-size: 0.85rem;
          color: #6e7681;
        }

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
