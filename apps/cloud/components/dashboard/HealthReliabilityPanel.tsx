'use client';

interface HealthReliabilityPanelProps {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export default function HealthReliabilityPanel({
  data,
  loading,
  error,
}: HealthReliabilityPanelProps) {
  if (loading) return <div className="loading">Loading health data...</div>;
  if (error || !data) {
    return (
      <div className="error-panel">
        <p>Unable to load health data</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  const uptime = Math.min(data.uptime || 100, 100);
  const uptimeColor = uptime >= 99 ? '#238636' : uptime >= 95 ? '#d29922' : '#f85149';
  const errorRate = data.errorRate || 0;

  return (
    <div className="health-panel">
      <div className="panel-title">Health & Reliability</div>

      <div className="health-metrics">
        <div className="metric-card">
          <div className="metric-label">Uptime</div>
          <div className="metric-value" style={{ color: uptimeColor }}>
            {uptime.toFixed(2)}%
          </div>
          <div className="metric-subtext">
            {uptime >= 99
              ? 'Excellent'
              : uptime >= 95
              ? 'Good'
              : 'Needs attention'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Error Rate</div>
          <div
            className="metric-value"
            style={{
              color: errorRate < 1 ? '#238636' : errorRate < 5 ? '#d29922' : '#f85149',
            }}
          >
            {errorRate.toFixed(2)}%
          </div>
          <div className="metric-subtext">
            {data.errorRate === undefined
              ? 'N/A'
              : `${(data.errors || 0).toLocaleString()} errors`}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Avg Latency</div>
          <div className="metric-value">
            {(data.avgLatencyMs || 0).toLocaleString()}ms
          </div>
          <div className="metric-subtext">
            {data.avgLatencyMs < 100
              ? 'Fast'
              : data.avgLatencyMs < 500
              ? 'Normal'
              : 'Slow'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Requests</div>
          <div className="metric-value">
            {(data.totalRequests || 0).toLocaleString()}
          </div>
          <div className="metric-subtext">
            {data.successfulRequests ? (
              <>
                {(data.successfulRequests || 0).toLocaleString()} successful
              </>
            ) : (
              'N/A'
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Active Servers</div>
          <div className="metric-value">{data.servers || 0}</div>
          <div className="metric-subtext">Connected instances</div>
        </div>
      </div>

      <div className="health-status">
        <h3>System Status</h3>
        <div className="status-table">
          <div className="status-row">
            <span className="status-label">Uptime</span>
            <div
              className="status-indicator"
              style={{
                backgroundColor: uptimeColor,
              }}
            />
            <span className="status-value">{uptime.toFixed(2)}%</span>
          </div>
          <div className="status-row">
            <span className="status-label">Error Rate</span>
            <div
              className="status-indicator"
              style={{
                backgroundColor:
                  errorRate < 1 ? '#238636' : errorRate < 5 ? '#d29922' : '#f85149',
              }}
            />
            <span className="status-value">{errorRate.toFixed(2)}%</span>
          </div>
          <div className="status-row">
            <span className="status-label">Latency</span>
            <div
              className="status-indicator"
              style={{
                backgroundColor:
                  (data.avgLatencyMs || 0) < 100
                    ? '#238636'
                    : (data.avgLatencyMs || 0) < 500
                    ? '#d29922'
                    : '#f85149',
              }}
            />
            <span className="status-value">{(data.avgLatencyMs || 0).toLocaleString()}ms</span>
          </div>
        </div>
      </div>

      {data.lastUpdate && (
        <div className="last-update">
          <p>
            Last updated: {new Date(data.lastUpdate).toLocaleTimeString()}
          </p>
        </div>
      )}

      <style jsx>{`
        .health-panel {
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

        .health-metrics {
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
          font-size: 2.5rem;
          font-weight: 700;
          color: #e1e8ed;
        }

        .metric-subtext {
          font-size: 0.875rem;
          color: #8b949e;
        }

        .health-status {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .health-status h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.1rem;
          color: #e1e8ed;
        }

        .status-table {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
        }

        .status-label {
          flex: 1;
          font-weight: 600;
          color: #e1e8ed;
        }

        .status-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
        }

        .status-value {
          min-width: 80px;
          text-align: right;
          font-weight: 700;
          color: #e1e8ed;
        }

        .last-update {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1rem;
          font-size: 0.9rem;
          color: #8b949e;
        }

        .last-update p {
          margin: 0;
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
