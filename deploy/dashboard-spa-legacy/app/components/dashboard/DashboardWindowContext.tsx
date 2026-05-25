'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type DashboardWindow = '1h' | '12h' | '24h' | '7d' | '30d' | '90d';

const STORAGE_KEY = 'guardian-dashboard-window';

const WINDOW_DAYS: Record<DashboardWindow, number> = {
  '1h': 1 / 24,
  '12h': 0.5,
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

type ContextValue = {
  window: DashboardWindow;
  windowDays: number;
  setWindow: (w: DashboardWindow) => void;
};

const DashboardWindowContext = createContext<ContextValue | null>(null);

function readStoredWindow(): DashboardWindow {
  if (typeof window === 'undefined') return '7d';
  const stored = localStorage.getItem(STORAGE_KEY);
  const valid: DashboardWindow[] = ['1h', '12h', '24h', '7d', '30d', '90d'];
  if (valid.includes(stored as DashboardWindow)) return stored as DashboardWindow;
  return '7d';
}

export function DashboardWindowProvider({ children }: { children: ReactNode }) {
  const [windowLabel, setWindowLabel] = useState<DashboardWindow>('7d');

  useEffect(() => {
    setWindowLabel(readStoredWindow());
  }, []);

  const setWindow = useCallback((w: DashboardWindow) => {
    setWindowLabel(w);
    localStorage.setItem(STORAGE_KEY, w);
  }, []);

  const value = useMemo(
    () => ({
      window: windowLabel,
      windowDays: WINDOW_DAYS[windowLabel],
      setWindow,
    }),
    [windowLabel, setWindow],
  );

  return (
    <DashboardWindowContext.Provider value={value}>{children}</DashboardWindowContext.Provider>
  );
}

export function useDashboardWindow(): ContextValue {
  const ctx = useContext(DashboardWindowContext);
  if (!ctx) {
    return {
      window: '7d',
      windowDays: 7,
      setWindow: () => {},
    };
  }
  return ctx;
}

export function DashboardWindowSelector() {
  const { window, setWindow } = useDashboardWindow();
  return (
    <div className="dashboard-window-toolbar">
      <label>
        Time window
        <select
          value={window}
          onChange={(e) => setWindow(e.target.value as DashboardWindow)}
          aria-label="Dashboard time window"
        >
          <option value="1h">Last 1 hour</option>
          <option value="12h">Last 12 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </label>
    </div>
  );
}
