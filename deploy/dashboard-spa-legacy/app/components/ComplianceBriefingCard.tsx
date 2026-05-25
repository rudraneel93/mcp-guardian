'use client';

import { InsightCallout } from './dashboard/InsightCallout';

type Props = {
  compliance: Record<string, unknown> | null;
};

export function ComplianceBriefingCard({ compliance }: Props) {
  const report = compliance?.report as Record<string, unknown> | undefined;
  const briefing = typeof report?.briefing === 'string' ? report.briefing : '';
  const markdown = typeof compliance?.markdown === 'string' ? compliance.markdown : '';
  const controlMappings = Array.isArray(report?.controlMappings) ? report.controlMappings : [];

  const bullets = controlMappings.slice(0, 5).map((m) => {
    const row = m as Record<string, unknown>;
    return `${String(row.framework ?? 'control')}: ${String(row.controlId ?? '')} — ${String(row.title ?? row.summary ?? '')}`;
  });

  const onExport = markdown
    ? () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-briefing-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    : undefined;

  return (
    <article className="enterprise-ai-card">
      <h3>Compliance briefing</h3>
      {!briefing ? (
        <p className="muted">No compliance events in the selected window — semantic audit and policy blocks populate mappings.</p>
      ) : (
        <InsightCallout
          title="Compliance copilot"
          bullets={bullets.length ? bullets : [briefing.slice(0, 200)]}
          narrative={briefing}
          source="deterministic"
          onExport={onExport}
        />
      )}
    </article>
  );
}
