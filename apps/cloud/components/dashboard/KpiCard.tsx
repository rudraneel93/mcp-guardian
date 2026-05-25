'use client';

interface KpiComparison {
  deltaPct: number | null;
  deltaAbs: number;
  direction: 'up' | 'down' | 'flat';
}

interface KpiCardProps {
  title: string;
  value: string | number;
  comparison?: KpiComparison;
  isPct?: boolean;
  isMoney?: boolean;
}

export default function KpiCard({
  title,
  value,
  comparison,
  isPct = false,
  isMoney = false,
}: KpiCardProps) {
  const getChangeColor = (dir: string) => {
    if (dir === 'up' && isPct) return '#238636'; // Green for up percentage (good)
    if (dir === 'down' && isMoney) return '#238636'; // Green for down cost (good)
    if (dir === 'up' && isMoney) return '#f85149'; // Red for up cost (bad)
    if (dir === 'down' && isPct) return '#f85149'; // Red for down percentage (bad)
    return '#8b949e';
  };

  const getArrow = (dir: string) => {
    if (dir === 'up') return '↑';
    if (dir === 'down') return '↓';
    return '→';
  };

  const changeText = comparison
    ? `${getArrow(comparison.direction)} ${Math.abs(comparison.deltaPct ?? comparison.deltaAbs).toFixed(1)}${isPct ? '%' : ''}`
    : null;

  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {changeText && (
        <div className="kpi-change" style={{ color: getChangeColor(comparison!.direction) }}>
          {changeText}
        </div>
      )}

      <style jsx>{`
        .kpi-card {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .kpi-card:hover {
          border-color: #58a6ff;
          box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
        }

        .kpi-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-value {
          font-size: 2rem;
          font-weight: 700;
          color: #e1e8ed;
          word-break: break-word;
        }

        .kpi-change {
          font-size: 0.875rem;
          font-weight: 600;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}
