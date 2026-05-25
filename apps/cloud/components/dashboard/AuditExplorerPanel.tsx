'use client';

interface AuditExplorerPanelProps {
  data: any | null;
  loading: boolean;
  error: string | null;
}

export default function AuditExplorerPanel({
  data,
  loading,
  error,
}: AuditExplorerPanelProps) {
  if (loading) return <div className="loading">Loading audit data...</div>;
  if (error || !data) {
    return (
      <div className="error-panel">
        <p>Unable to load audit data</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  const maxCount = data.activity?.maxCount || 1;

  return (
    <div className="audit-panel">
      <div className="panel-title">Audit Explorer</div>

      <div className="audit-summary">
        <div className="summary-stat">
          <span>Window</span>
          <strong>{data.windowDays} days</strong>
        </div>
        <div className="summary-stat">
          <span>Top Block Patterns</span>
          <strong>{(data.cells || []).length}</strong>
        </div>
      </div>

      {data.cells && data.cells.length > 0 ? (
        <div className="heatmap-section">
          <h3>Top Block Patterns (Rule × Tool)</h3>
          <div className="heatmap-list">
            {data.cells.slice(0, 20).map((cell: any, idx: number) => (
              <div key={idx} className="heatmap-cell">
                <div className="cell-info">
                  <div className="cell-rule">{cell.rule}</div>
                  <div className="cell-tool">{cell.tool}</div>
                </div>
                <div className="cell-count" title={`${cell.count} blocks`}>
                  {cell.count}
                </div>
                <div
                  className="cell-bar"
                  style={{
                    width: `${(cell.count / Math.max(...data.cells.map((c: any) => c.count), 1)) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">No audit data available</div>
      )}

      {data.activity && (
        <div className="activity-matrix">
          <h3>Activity Heatmap (Day × Hour)</h3>
          <div className="matrix-grid">
            <div className="day-labels">
              <div className="day-label-header" />
              {data.activity.days.map((day: string) => (
                <div key={day} className="day-label">
                  {new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              ))}
            </div>
            <div className="hour-rows">
              {data.activity.hours.map((hour: number) => (
                <div key={hour} className="hour-row">
                  <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
                  {data.activity.days.map((day: string) => {
                    const idx = data.activity.days.indexOf(day);
                    const count = data.activity.matrix[idx]?.[hour] || 0;
                    const intensity = maxCount > 0 ? count / maxCount : 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="matrix-cell"
                        style={{
                          backgroundColor: `rgba(88, 166, 255, ${intensity * 0.8})`,
                          border: `1px solid rgba(88, 166, 255, ${intensity * 0.3})`,
                        }}
                        title={`${count} events`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="matrix-legend">
            <span>Lighter</span>
            <div className="legend-gradient" />
            <span>Darker</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .audit-panel {
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

        .audit-summary {
          display: flex;
          gap: 2rem;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .summary-stat {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .summary-stat span {
          font-size: 0.875rem;
          color: #8b949e;
        }

        .summary-stat strong {
          font-size: 1.5rem;
          color: #e1e8ed;
          font-weight: 700;
        }

        .heatmap-section {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .heatmap-section h3,
        .activity-matrix h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #e1e8ed;
        }

        .heatmap-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .heatmap-cell {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          position: relative;
          overflow: hidden;
        }

        .cell-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
        }

        .cell-rule {
          font-weight: 600;
          color: #e1e8ed;
          font-size: 0.9rem;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .cell-tool {
          font-size: 0.8rem;
          color: #8b949e;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .cell-count {
          font-weight: 700;
          color: #58a6ff;
          min-width: 50px;
          text-align: right;
        }

        .cell-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: rgba(88, 166, 255, 0.1);
          z-index: 0;
        }

        .matrix-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 1rem;
          overflow-x: auto;
        }

        .day-labels {
          display: grid;
          grid-template-columns: 50px repeat(auto-fit, minmax(30px, 1fr));
          gap: 2px;
          margin-bottom: 1rem;
        }

        .day-label-header {
          width: 50px;
        }

        .day-label {
          font-size: 0.75rem;
          color: #8b949e;
          text-align: center;
          font-weight: 600;
        }

        .hour-rows {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .hour-row {
          display: grid;
          grid-template-columns: 50px repeat(auto-fit, minmax(30px, 1fr));
          gap: 2px;
          align-items: center;
        }

        .hour-label {
          font-size: 0.75rem;
          color: #8b949e;
          font-weight: 600;
          text-align: center;
        }

        .matrix-cell {
          width: 30px;
          height: 30px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .matrix-cell:hover {
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
        }

        .activity-matrix {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .matrix-legend {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #8b949e;
        }

        .legend-gradient {
          width: 100px;
          height: 20px;
          background: linear-gradient(to right, rgba(88, 166, 255, 0.1), rgba(88, 166, 255, 0.8));
          border-radius: 4px;
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
