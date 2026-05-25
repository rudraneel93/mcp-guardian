'use client';

import { useState } from 'react';
import { useLiveDashboard } from '@/app/hooks/useLiveDashboard';
import { OverviewView } from './views/OverviewView';
import { LiveTestView } from './views/LiveTestView';
import { AuditView } from './views/AuditView';
import { PolicyView } from './views/PolicyView';

type Tab = 'overview' | 'test' | 'audit' | 'policy';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'test', label: 'Test', icon: '▶' },
  { id: 'audit', label: 'Audit', icon: '☰' },
  { id: 'policy', label: 'Policy', icon: '⚙' },
];

export function GuardianDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const live = useLiveDashboard();

  const pillClass = live.statusError
    ? 'err'
    : live.ws.connected || live.apiOnline
      ? 'ok'
      : 'warn';

  return (
    <div className="gd-app">
      <aside className="gd-sidebar">
        <div className="gd-brand-desktop">
          <h1>MCP Guardian</h1>
          <p>Live SOC · mobile + desktop</p>
        </div>
        <nav className="gd-nav-desktop" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`gd-nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="gd-nav-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <p className="hint" style={{ marginTop: 'auto', fontSize: '0.7rem' }}>
          {live.statusText}
        </p>
      </aside>

      <header className="gd-header">
        <div className="gd-brand">
          <h1>MCP Guardian</h1>
          <p>{live.statusText}</p>
        </div>
        <span className={`gd-status-pill ${pillClass}`}>
          {live.apiOnline ? (live.ws.connected ? 'Live' : 'API') : 'Offline'}
        </span>
      </header>

      <main className="gd-main">
        {tab === 'overview' && <OverviewView live={live} />}
        {tab === 'test' && <LiveTestView live={live} />}
        {tab === 'audit' && <AuditView live={live} />}
        {tab === 'policy' && <PolicyView live={live} />}
      </main>

      <nav className="gd-nav-mobile" aria-label="Main navigation">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`gd-nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="gd-nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
