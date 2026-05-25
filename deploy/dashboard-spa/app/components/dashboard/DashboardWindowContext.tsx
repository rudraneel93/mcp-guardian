'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type DashboardWindow = '1h' | '12h' | '24h' | '7d' | '30d' | '90d';

const STORAGE_KEY = 'guardian-dashboard-window';
const CHANGE_EVENT = 'guardian-dashboard-window-changed';
const DEFAULT_WINDOW: DashboardWindow = '7d';

const WINDOW_DAYS: Record<DashboardWindow, number> = {
  '1h': 1 / 24,
  '12h': 0.5,
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const VALID_WINDOWS: readonly DashboardWindow[] = ['1h', '12h', '24h', '7d', '30d', '90d'];

type ContextValue = {
  window: DashboardWindow;
  windowDays: number;
  windowParam: string;
  setWindow: (w: DashboardWindow) => void;
};

const DashboardWindowContext = createContext<ContextValue | null>(null);

function readStoredWindow(): DashboardWindow {
  if (typeof window === 'undefined') return DEFAULT_WINDOW;
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  if (stored && VALID_WINDOWS.includes(stored as DashboardWindow)) {
    return stored as DashboardWindow;
  }
  return DEFAULT_WINDOW;
}

/**
 * Public helper for components outside the provider (e.g. `DashboardClient`
 * which mounts above `DashboardWindowProvider`). Reads from localStorage and
 * subscribes to the CHANGE_EVENT broadcast so refreshAll() always has the
 * latest window selection.
 */
export function useCurrentWindowDays(): {
  windowLabel: DashboardWindow;
  windowDays: number;
  windowParam: string;
} {
  const subscribe = useCallback((cb: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const handler = () => cb();
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const getSnapshot = useCallback(() => readStoredWindow(), []);
  const getServerSnapshot = useCallback(() => DEFAULT_WINDOW, []);
  const label = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    windowLabel: label,
    windowDays: WINDOW_DAYS[label],
    // Send a label to the backend (e.g. "1h", "24h"). The backend's
    // parseWindowDays now accepts both labels and fractional numbers.
    windowParam: label,
  };
}

export function DashboardWindowProvider({ children }: { children: ReactNode }) {
  const [windowLabel, setWindowLabel] = useState<DashboardWindow>(DEFAULT_WINDOW);

  useEffect(() => {
    setWindowLabel(readStoredWindow());
  }, []);

  const setWindow = useCallback((w: DashboardWindow) => {
    setWindowLabel(w);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, w);
      } catch {
        /* private mode / storage disabled */
      }
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { window: w } }));
    }
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      window: windowLabel,
      windowDays: WINDOW_DAYS[windowLabel],
      windowParam: windowLabel,
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
      window: DEFAULT_WINDOW,
      windowDays: WINDOW_DAYS[DEFAULT_WINDOW],
      windowParam: DEFAULT_WINDOW,
      setWindow: () => {},
    };
  }
  return ctx;
}

export function DashboardWindowSelector() {
  const { window: w, setWindow } = useDashboardWindow();
  return (
    <div className="dashboard-window-toolbar">
      <label>
        Time window
        <select
          value={w}
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
