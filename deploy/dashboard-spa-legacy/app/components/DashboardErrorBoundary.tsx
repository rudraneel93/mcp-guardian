'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[dashboard]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main role="alert">
          <header>
            <h1>MCP Guardian</h1>
          </header>
          <p className="status status-error">
            Dashboard error: {this.state.error.message}
          </p>
          <p className="events-empty">
            Start the proxy with <code>DASHBOARD_ENABLED=true</code> on port 4000, or set{' '}
            <code>?apiBase=http://localhost:4000</code> when previewing elsewhere.
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}
