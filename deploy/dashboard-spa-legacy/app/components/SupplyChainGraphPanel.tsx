'use client';

type GraphNode = {
  id: string;
  kind: string;
  label: string;
  severity?: string;
};

type GraphEdge = {
  from: string;
  to: string;
  kind: string;
};

type Props = {
  graph?: {
    nodes?: GraphNode[];
    edges?: GraphEdge[];
    blastRadius?: Array<{ toolId: string; downstreamAgents: number; risk: string }>;
  } | null;
};

export function SupplyChainGraphPanel({ graph }: Props) {
  if (!graph?.nodes?.length) {
    return <p className="muted">No supply chain data — run ToolWatch to capture MCP server baselines.</p>;
  }

  const servers = graph.nodes.filter((n) => n.kind === 'server');
  const tools = graph.nodes.filter((n) => n.kind === 'tool');
  const args = graph.nodes.filter((n) => n.kind === 'arg_path');

  return (
    <div className="supply-chain-graph-panel">
      <p className="hint">
        {servers.length} servers · {tools.length} tools · {args.length} sensitive arg paths ·{' '}
        {graph.blastRadius?.length ?? 0} blast-radius entries
      </p>
      {graph.blastRadius?.length ? (
        <>
          <h4>Blast radius (call volume)</h4>
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Calls</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {graph.blastRadius.slice(0, 12).map((b) => (
                <tr key={b.toolId}>
                  <td>{b.toolId.replace('tool:', '')}</td>
                  <td>{b.downstreamAgents}</td>
                  <td>{b.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <h4>Server → tool map</h4>
      <ul className="insight-callout-list supply-chain-tree">
        {servers.map((s) => {
          const childTools = (graph.edges || [])
            .filter((e) => e.from === s.id && e.kind === 'hosts')
            .map((e) => tools.find((t) => t.id === e.to))
            .filter(Boolean);
          return (
            <li key={s.id}>
              <strong>{s.label}</strong>
              <ul>
                {childTools.map((t) => (
                  <li key={t!.id}>
                    {t!.label}
                    {t!.severity === 'critical' ? ' ⚠' : ''}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
