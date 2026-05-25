'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ExecutiveOverviewPanel from './dashboard/ExecutiveOverviewPanel';
import FleetOverviewPanel from './dashboard/FleetOverviewPanel';
import AuditExplorerPanel from './dashboard/AuditExplorerPanel';
import CostGovernancePanel from './dashboard/CostGovernancePanel';
import SecurityPosturePanel from './dashboard/SecurityPosturePanel';
import HealthReliabilityPanel from './dashboard/HealthReliabilityPanel';

type Tab = 'overview' | 'fleet' | 'audit' | 'cost' | 'security' | 'health';

type DashboardData = {
  executive: any | null;
  fleet: any | null;
  audit: any | null;
  cost: any | null;
  security: any | null;
  health: any | null;
};

type LoadingState = {
  executive: boolean;
  fleet: boolean;
  audit: boolean;
  cost: boolean;
  security: boolean;
  health: boolean;
};

type ErrorState = {
  executive: string | null;
  fleet: string | null;
  audit: string | null;
  cost: string | null;
  security: string | null;
  health: string | null;
};

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<DashboardData>({
    executive: null,
    fleet: null,
    audit: null,
    cost: null,
    security: null,
    health: null,
  });
  const [loading, setLoading] = useState<LoadingState>({
    executive: true,
    fleet: true,
    audit: true,
    cost: true,
    security: true,
    health: true,
  });
  const [errors, setErrors] = useState<ErrorState>({
    executive: null,
    fleet: null,
    audit: null,
    cost: null,
    security: null,
    health: null,
  });
  const [window, setWindow] = useState('7');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    console.log('[v0] Starting dashboard data fetch');

    // Fetch all data in parallel
    const fetchPromises = {
      executive: fetch(`/api/dashboard/executive-summary?window=${window}`).then((r) => r.json()),
      fleet: fetch('/api/dashboard/fleet').then((r) => r.json()),
      audit: fetch(`/api/dashboard/audit-heatmap?window=${window}`).then((r) => r.json()),
      cost: fetch(`/api/dashboard/cost?window=${window}`).then((r) => r.json()),
      security: fetch('/api/dashboard/security').then((r) => r.json()),
      health: fetch('/api/dashboard/health').then((r) => r.json()),
    };

    try {
      const results = await Promise.all(Object.values(fetchPromises));
      const [execData, fleetData, auditData, costData, secData, healthData] = results;

      console.log('[v0] Dashboard data fetched:', {
        executive: execData,
        fleet: fleetData,
        audit: auditData,
        cost: costData,
        security: secData,
        health: healthData,
      });

      setData({
        executive: execData,
        fleet: fleetData,
        audit: auditData,
        cost: costData,
        security: secData,
        health: healthData,
      });

      setLoading({
        executive: false,
        fleet: false,
        audit: false,
        cost: false,
        security: false,
        health: false,
      });

      setErrors({
        executive: null,
        fleet: null,
        audit: null,
        cost: null,
        security: null,
        health: null,
      });
    } catch (err) {
      console.error('[v0] Error fetching dashboard data:', err);
      setLoading({
        executive: false,
        fleet: false,
        audit: false,
        cost: false,
        security: false,
        health: false,
      });
    }
  }, [window]);

  // Initial load
  useEffect(() => {
    console.log('[v0] Dashboard component mounted, fetching initial data');
    fetchData();
  }, [fetchData, window]);

  // Set up polling
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(() => {
      console.log('[v0] Polling dashboard data');
      fetchData();
    }, 30000); // Poll every 30 seconds

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchData]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-controls">
          <div className="control-group">
            <label htmlFor="window">Time Window:</label>
            <select
              id="window"
              value={window}
              onChange={(e) => setWindow(e.target.value)}
              className="time-select"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <button
            onClick={() => fetchData()}
            className="refresh-btn"
            disabled={Object.values(loading).some((l) => l)}
          >
            {Object.values(loading).some((l) => l) ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          {(['overview', 'fleet', 'audit', 'cost', 'security', 'health'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <ExecutiveOverviewPanel
            data={data.executive}
            loading={loading.executive}
            error={errors.executive}
          />
        )}
        {activeTab === 'fleet' && (
          <FleetOverviewPanel
            data={data.fleet}
            loading={loading.fleet}
            error={errors.fleet}
          />
        )}
        {activeTab === 'audit' && (
          <AuditExplorerPanel
            data={data.audit}
            loading={loading.audit}
            error={errors.audit}
          />
        )}
        {activeTab === 'cost' && (
          <CostGovernancePanel
            data={data.cost}
            loading={loading.cost}
            error={errors.cost}
          />
        )}
        {activeTab === 'security' && (
          <SecurityPosturePanel
            data={data.security}
            loading={loading.security}
            error={errors.security}
          />
        )}
        {activeTab === 'health' && (
          <HealthReliabilityPanel
            data={data.health}
            loading={loading.health}
            error={errors.health}
          />
        )}
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 2rem;
          background: #0a0e13;
          min-height: 100vh;
          color: #e1e8ed;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #0d1117;
          border-radius: 8px;
          border: 1px solid #30363d;
        }

        .header-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #8b949e;
        }

        .time-select {
          padding: 0.5rem 0.75rem;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          color: #e1e8ed;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .time-select:hover {
          border-color: #58a6ff;
        }

        .refresh-btn {
          padding: 0.5rem 1rem;
          background: #238636;
          border: 1px solid #2ea043;
          border-radius: 6px;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #2ea043;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tabs-container {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid #30363d;
        }

        .tabs {
          display: flex;
          gap: 0;
        }

        .tab {
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #8b949e;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #e1e8ed;
          border-bottom-color: #58a6ff;
        }

        .tab.active {
          color: #58a6ff;
          border-bottom-color: #58a6ff;
        }

        .dashboard-content {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
