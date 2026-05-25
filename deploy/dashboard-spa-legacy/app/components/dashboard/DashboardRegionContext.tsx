'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchDashboardRegions } from '@/lib/guardian-api';

const STORAGE_KEY = 'guardian-dashboard-region';

type ContextValue = {
  region: string;
  setRegion: (region: string) => void;
  regions: string[];
  loadingRegions: boolean;
};

const DashboardRegionContext = createContext<ContextValue | null>(null);

function readStoredRegion(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function DashboardRegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  useEffect(() => {
    setRegionState(readStoredRegion());
    void fetchDashboardRegions().then((r) => {
      setRegions(r?.regions ?? []);
      setLoadingRegions(false);
    });
  }, []);

  const setRegion = useCallback((value: string) => {
    setRegionState(value);
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ region, setRegion, regions, loadingRegions }),
    [region, setRegion, regions, loadingRegions],
  );

  return (
    <DashboardRegionContext.Provider value={value}>{children}</DashboardRegionContext.Provider>
  );
}

export function useDashboardRegion(): ContextValue {
  const ctx = useContext(DashboardRegionContext);
  if (!ctx) {
    return { region: '', setRegion: () => {}, regions: [], loadingRegions: false };
  }
  return ctx;
}

export function DashboardRegionSelector() {
  const { region, setRegion, regions, loadingRegions } = useDashboardRegion();
  if (loadingRegions || regions.length === 0) return null;

  return (
    <div className="dashboard-window-toolbar">
      <label>
        Region
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Dashboard region filter"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
