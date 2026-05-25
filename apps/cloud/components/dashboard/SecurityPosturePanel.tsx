'use client';

interface SecurityPosturePanelProps {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export default function SecurityPosturePanel({
  data,
  loading,
  error,
}: SecurityPosturePanelProps) {
  if (loading) return <div className="loading">Loading security data...</div>;
  if (error || !data) {
    return (
      <div className="error-panel">
        <p>Unable to load security data</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  const overallScore = data.overallScore || 0;
  const scoreColor =
    overallScore >= 80 ? '#238636' : overallScore >= 60 ? '#d29922' : '#f85149';

  return (
    <div className="security-panel">
      <div className="panel-title">Security Posture</div>

      <div className="security-score">
        <div className="score-display">
          <div className="score-value" style={{ color: scoreColor }}>
            {overallScore}
          </div>
          <div className="score-label">/100</div>
        </div>
        <div className="score-breakdown">
          <div className="score-bar">
            <div
              className="score-fill"
              style={{
                width: `${Math.min(overallScore, 100)}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
          <div className="score-text">
            {overallScore >= 80
              ? 'Excellent security posture'
              : overallScore >= 60
              ? 'Good security posture'
              : 'Needs improvement'}
          </div>
        </div>
      </div>

      <div className="threats-summary">
        <div className="threat-card threat-active">
          <div className="threat-label">Active Threats</div>
          <div className="threat-count">{data.activeThreats || 0}</div>
        </div>
        <div className="threat-card threat-last-scan">
          <div className="threat-label">Last Scan</div>
          <div className="threat-time">
            {data.lastScan
              ? new Date(data.lastScan).toLocaleTimeString()
              : '—'}
          </div>
        </div>
      </div>

      {data.threatsByType && (
        <div className="threats-breakdown">
          <h3>Threats by Type</h3>
          <div className="threats-list">
            {Object.entries(data.threatsByType).map(([type, count]: [string, any]) => (
              <div key={type} className="threat-type">
                <span className="threat-type-name">
                  {type.replace(/-/g, ' ')}
                </span>
                <span
                  className="threat-type-count"
                  style={{
                    color: count > 0 ? '#f85149' : '#238636',
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.complianceStatus && (
        <div className="compliance-status">
          <h3>Compliance Status</h3>
          <div className="compliance-list">
            {Object.entries(data.complianceStatus).map(([standard, status]: [string, any]) => (
              <div key={standard} className="compliance-item">
                <span className="compliance-name">{standard.replace(/_/g, ' ')}</span>
                <span
                  className="compliance-badge"
                  style={{
                    backgroundColor:
                      status === 'compliant'
                        ? '#238636'
                        : status === 'monitored'
                        ? '#d29922'
                        : '#f85149',
                  }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .security-panel {
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

        .security-score {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 2rem;
          display: flex;
          gap: 3rem;
          align-items: center;
        }

        .score-display {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .score-value {
          font-size: 4rem;
          font-weight: 700;
        }

        .score-label {
          font-size: 1.5rem;
          color: #8b949e;
          font-weight: 600;
        }

        .score-breakdown {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .score-bar {
          height: 12px;
          background: #161b22;
          border-radius: 6px;
          overflow: hidden;
        }

        .score-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .score-text {
          font-size: 1rem;
          color: #8b949e;
        }

        .threats-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .threat-card {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .threat-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #8b949e;
          text-transform: uppercase;
        }

        .threat-count {
          font-size: 2rem;
          font-weight: 700;
          color: #f85149;
        }

        .threat-active {
          border-color: #f85149;
          border-left: 3px solid #f85149;
        }

        .threat-time {
          font-size: 1rem;
          color: #e1e8ed;
          font-weight: 600;
        }

        .threats-breakdown,
        .compliance-status {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .threats-breakdown h3,
        .compliance-status h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.1rem;
          color: #e1e8ed;
        }

        .threats-list,
        .compliance-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .threat-type,
        .compliance-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
        }

        .threat-type-name,
        .compliance-name {
          font-weight: 600;
          color: #e1e8ed;
          text-transform: capitalize;
        }

        .threat-type-count {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .compliance-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 12px;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: capitalize;
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
