'use client';

import { useState } from 'react';
import { testPolicy } from '@/lib/guardian-api';
import type { LiveDashboardState } from '@/app/hooks/useLiveDashboard';
import { StateBlock } from '../StateBlock';

export function PolicyView({ live }: { live: LiveDashboardState }) {
  const [tool, setTool] = useState('echo');
  const [args, setArgs] = useState('{"text":"hello from mobile test"}');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const parsed = JSON.parse(args) as Record<string, unknown>;
      const res = await testPolicy({ tool, arguments: parsed });
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Invalid JSON arguments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StateBlock
      loading={!live.ready}
      error={live.statusError && !live.apiOnline ? live.statusText : null}
      onRetry={live.refresh}
    >
      <div className="gd-card gd-form">
        <h3>Policy test</h3>
        <p className="hint">Evaluate a tool call against the live policy engine (POST /api/policy/test).</p>
        <label htmlFor="gd-tool">Tool name</label>
        <input
          id="gd-tool"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          autoComplete="off"
        />
        <label htmlFor="gd-args">Arguments (JSON)</label>
        <textarea
          id="gd-args"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
        />
        <div className="gd-btn-row">
          <button
            type="button"
            className="gd-btn"
            disabled={loading || !live.apiOnline}
            onClick={() => void onTest()}
          >
            {loading ? 'Testing…' : 'Run policy test'}
          </button>
        </div>
        {result ? <pre className="gd-log">{result}</pre> : null}
      </div>
    </StateBlock>
  );
}
