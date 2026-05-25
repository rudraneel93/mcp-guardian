'use client';

import type { ReactNode } from 'react';

type Props = {
  loading?: boolean;
  error?: string | null;
  empty?: string | null;
  onRetry?: () => void;
  children: ReactNode;
};

export function StateBlock({ loading, error, empty, onRetry, children }: Props) {
  if (loading) {
    return (
      <div className="gd-state" role="status">
        <p>Loading live data…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="gd-state error" role="alert">
        <p>{error}</p>
        {onRetry ? (
          <button type="button" className="gd-btn secondary" onClick={() => void onRetry()}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="gd-state" role="status">
        <p>{empty}</p>
      </div>
    );
  }
  return <>{children}</>;
}
