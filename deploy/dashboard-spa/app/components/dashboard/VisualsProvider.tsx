'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchCostTimeseries,
  fetchExecutiveSummary,
  fetchVisualsLive,
  type CostTimeseriesResponse,
  type ExecutiveSummaryResponse,
  type VisualsData,
} from '@/lib/guardian-api';
import { useDashboardWindow } from './DashboardWindowContext';
import { useDashboardRegion } from './DashboardRegionContext';

type VisualsContextValue = {
  visuals: VisualsData | null;
  executiveSummary: ExecutiveSummaryResponse | null;
  costTimeseries: CostTimeseriesResponse | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  refresh: () => Promise<void>;
};

const VisualsContext = createContext<VisualsContextValue | null>(null);

type Props = {
  children: ReactNode;
  refreshKey?: number;
  pollMs?: number;
};

export function VisualsProvider({ children, refreshKey = 0, pollMs = 30_000 }: Props) {
  const { windowDays } = useDashboardWindow();
  const { region } = useDashboardRegion();
  const [visuals, setVisuals] = useState<VisualsData | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummaryResponse | null>(null);
  const [costTimeseries, setCostTimeseries] = useState<CostTimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowDaysRef = useRef(windowDays);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gran = windowDays <= 7 ? 'hour' : 'day';
      const [v, s, ts] = await Promise.all([
        fetchVisualsLive(windowDays, region || undefined),
        fetchExecutiveSummary(windowDays, region || undefined),
        fetchCostTimeseries(windowDays, gran, region || undefined),
      ]);
      if (!v.ok) {
        setError(v.message);
        // Keep any previously-loaded visuals so charts don't blank out on transient errors
      } else {
        setVisuals(v.data);
      }
      setExecutiveSummary(s);
      setCostTimeseries(ts);
      setLastFetchedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visuals');
    } finally {
      setLoading(false);
    }
  }, [windowDays, region]);

  useEffect(() => {
    windowDaysRef.current = windowDays;
    if (debounceRef.current) globalThis.clearTimeout(debounceRef.current);
    debounceRef.current = globalThis.setTimeout(() => {
      void load();
    }, 300);
    return () => {
      if (debounceRef.current) globalThis.clearTimeout(debounceRef.current);
    };
  }, [load, windowDays, region, refreshKey]);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = globalThis.setInterval(() => void load(), pollMs);
    return () => globalThis.clearInterval(id);
  }, [load, pollMs]);

  const value = useMemo(
    () => ({
      visuals,
      executiveSummary,
      costTimeseries,
      loading,
      error,
      lastFetchedAt,
      refresh: load,
    }),
    [visuals, executiveSummary, costTimeseries, loading, error, lastFetchedAt, load],
  );

  return <VisualsContext.Provider value={value}>{children}</VisualsContext.Provider>;
}

export function useVisuals(): VisualsContextValue {
  const ctx = useContext(VisualsContext);
  if (!ctx) {
    return {
      visuals: null,
      executiveSummary: null,
      costTimeseries: null,
      loading: false,
      error: null,
      lastFetchedAt: null,
      refresh: async () => {},
    };
  }
  return ctx;
}
