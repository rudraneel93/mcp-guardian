'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  downloadInsightsBriefing,
  fetchDashboardInsights,
  type DashboardInsightsResponse,
} from '@/lib/guardian-api';
import { InsightCallout } from './InsightCallout';
import { useDashboardWindow } from './DashboardWindowContext';

export type Scope = 'overview' | 'cost' | 'security' | 'audit' | 'ai';

type Props = {
  scope: Scope;
  refreshKey?: number;
};

export function InsightsNarrativeRail({ scope, refreshKey = 0 }: Props) {
  const { windowDays } = useDashboardWindow();
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDashboardInsights(scope, windowDays);
    setInsights(data);
    setLoading(false);
  }, [scope, windowDays]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadInsightsBriefing(scope, windowDays);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !insights) {
    return <p className="hint">Loading insights…</p>;
  }
  if (!insights?.bullets?.length && !insights?.narrative) return null;

  return (
    <InsightCallout
      bullets={insights.bullets ?? []}
      source={insights.source ?? 'deterministic'}
      provider={insights.provider}
      model={insights.model}
      generatedAt={insights.generatedAt}
      narrative={insights.narrative}
      citations={insights.citations}
      scope={scope}
      windowDays={windowDays}
      onExport={onExport}
      exporting={exporting}
    />
  );
}
