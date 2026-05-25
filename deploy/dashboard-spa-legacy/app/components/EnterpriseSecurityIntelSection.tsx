'use client';

import { SupplyChainGraphPanel } from './SupplyChainGraphPanel';

type Props = {
  supplyChain: Record<string, unknown> | null;
  shadowRedTeam: Record<string, unknown> | null;
  signatureHints: Record<string, unknown> | null;
};

export function EnterpriseSecurityIntelSection({
  supplyChain,
  shadowRedTeam,
  signatureHints,
}: Props) {
  const graph = supplyChain?.graph as Parameters<typeof SupplyChainGraphPanel>[0]['graph'];
  const supplyHint =
    typeof supplyChain?.hint === 'string'
      ? supplyChain.hint
      : 'Run ToolWatch: SWARM_TOOL_WATCH=true pnpm security-swarm';
  const shadowHint =
    typeof shadowRedTeam?.hint === 'string'
      ? shadowRedTeam.hint
      : 'Run pnpm security-swarm:shadow-red-team or SWARM_SHADOW_RED_TEAM=true';
  const hints = (signatureHints?.hints as Array<Record<string, unknown>>) ?? [];

  return (
    <>
      <article className="enterprise-ai-card">
        <h3>MCP supply chain graph</h3>
        {!supplyChain?.hasData ? (
          <p className="muted">{supplyHint}</p>
        ) : null}
        <SupplyChainGraphPanel graph={graph} />
      </article>

      <article className="enterprise-ai-card">
        <h3>Shadow red team</h3>
        {!shadowRedTeam?.hasData ? (
          <p className="muted">{shadowHint}</p>
        ) : (
          <p className="hint">
            {String(shadowRedTeam.bypassCount ?? 0)} bypass(es) · {String(shadowRedTeam.newBypasses ?? 0)} new → Threat
            Lab {shadowRedTeam.threatLabQueued ? 'queued' : 'idle'}
          </p>
        )}
      </article>

      <article className="enterprise-ai-card">
        <h3>Federated signature hints</h3>
        {hints.length === 0 ? (
          <p className="muted">
            No cross-instance hints yet — requires multiple fleet instances reporting the same anonymized signature.
          </p>
        ) : (
          <ul className="insight-callout-list">
            {hints.slice(0, 8).map((h) => (
              <li key={String(h.signatureId)}>{String(h.message)}</li>
            ))}
          </ul>
        )}
      </article>
    </>
  );
}
