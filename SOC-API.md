# MCP Guardian — SOC Dashboard Backend API

A standalone Express.js API server that serves **real, live data** from MCP Guardian's
core services directly to the SOC Dashboard SPA.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                                 │
│  Next.js SOC Dashboard SPA                                       │
│  guardian-api.ts → /api/* (same-origin, proxied in dev)         │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP rewrite (next.config.ts)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  SOC API Server (http://localhost:4040)                          │
│  src/soc-api-server.ts                                           │
├──────────────┬──────────────────────────────────────────────────┤
│ SecurityScanner │ CostAuditor │ HealthMonitor │ IDatabase        │
│ ConfigParser    │ PolicyEngine │ SSE stream                      │
└──────────────┴──────────────────────────────────────────────────┘
                         │
                         ▼
        /Users/rudraneeldas/.mcp-guardian/mcp-server.db (SQLite)
        default-policy.yaml
        MCP client configs (Cline / Claude Desktop / Cursor)
```

---

## Quick Start

### 1 — Start the API backend (terminal 1)

```bash
cd mcp-guardian
pnpm soc:api          # one-shot
# or
pnpm soc:api:dev      # tsx watch (auto-reloads on code changes)
```

### 2 — Start the dashboard (terminal 2)

```bash
pnpm dashboard:dev    # Next.js dev server on :3000
```

### 3 — Or run both together

```bash
pnpm soc:full         # concurrently starts API + dashboard
```

Open http://localhost:3000 — all panels fetch real live data.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SOC_API_PORT` | `4040` | Port the API backend listens on |
| `MCP_GUARDIAN_DB_PATH` | auto-resolved | Override SQLite DB path |
| `MCP_GUARDIAN_POLICY` | `./default-policy.yaml` | Override policy file path |
| `GUARDIAN_DAILY_BUDGET_USD` | _(unset)_ | Enable cost budget alerts |
| `GUARDIAN_REGION` | `local` | Region label shown in fleet view |
| `GUARDIAN_TENANT_ID` | `default` | Tenant ID for multi-tenant setups |
| `SOC_API_REFRESH_INTERVAL_MS` | `30000` | SSE push interval (ms) |

Dashboard SPA variables (in `deploy/dashboard-spa/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `SOC_API_PORT` | `4040` | Matched to backend port for next.config.ts rewrite |
| `NEXT_PUBLIC_GUARDIAN_API` | _(unset)_ | Override API base URL (e.g. remote host) |

---

## API Reference

All endpoints return JSON.  `available: false` means the data source is not
configured — the dashboard handles this gracefully (shows empty/disabled state).

### Metrics & Audit

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/aggregate/metrics` | `window=7` | KPI summary: total/blocked/passed requests, cost, latency |
| `GET` | `/api/aggregate/audit` | `window=7`, `limit=200`, `action=block\|pass`, `server=name` | Audit event log |
| `GET` | `/api/audit/heatmap` | `window=7` | Rule×tool block heatmap + day×hour activity matrix |

### Executive Summary

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/dashboard/executive-summary` | `window=7` | All KPIs, sparklines, top servers/tools, comparisons |
| `GET` | `/api/dashboard/insights` | `scope=overview\|cost\|security\|ai`, `window=7` | Plain-English narrative bullets |
| `GET` | `/api/dashboard/insights/export` | `scope`, `window` | Markdown download |

### Security

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/security` | Run CVE scan, auth probe, typo-squat, secret detection on all configured MCP servers |

Results cached for **5 minutes** (CVE lookups are slow).

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Probe latency, success rate, tool count for all configured servers |

Results cached for **1 minute**.

### Cost

| Method | Path | Query params | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/cost` | `window=7` | Per-server cost from proxy call records + CostAuditor |
| `GET` | `/api/cost/breakdown` | `window=7` | Cost aggregated by server+tool |
| `GET` | `/api/cost/timeseries` | `window=7`, `granularity=day\|hour` | Cost time series, pivoted by server |

### Policy

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/policy` | Current policy: mode, rule count, full YAML |
| `PUT` | `/api/policy` | `{ yaml: "..." }` — write new policy, invalidate cache, broadcast SSE |
| `POST` | `/api/policy/reload` | Invalidate all caches + broadcast `policy:reloaded` SSE |
| `POST` | `/api/policy/test` | `{ tool, arguments, server }` — dry-run policy check |

### AI & Suggestions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/suggestions` | Traffic-derived policy suggestions (from block patterns) |

### Fleet & Instances

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/instances` | MCP server instances from discovered configs + DB |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/status` | Auth state (community: always authenticated) |
| `GET` | `/api/auth/csrf` | CSRF enforcement state |
| `POST` | `/api/login` | Login (noop in community mode) |
| `POST` | `/api/logout` | Logout |

### Real-Time SSE

| Path | Description |
|------|-------------|
| `GET /api/sse` | Server-Sent Events stream |

Events pushed:
- `metrics:live` — aggregate metrics every 30 s (configurable)
- `security:updated` — after a fresh security scan
- `health:updated` — after a fresh health check
- `policy:reloaded` — after policy file changes

**Dashboard usage:**  The dashboard's `guardian-api.ts` subscribes via
`EventSource('/api/sse')` and updates KPI cards in real time without polling.

---

## Data Sources

Every data point is derived from real MCP Guardian internals:

| Data | Source |
|------|--------|
| Request counts, block rates, latency | `ProxyCallRecord[]` from `IDatabase.getCallRecordsForServer()` |
| Cost (USD, tokens) | `ProxyCallRecord.costUsd` + `CostAuditor.auditServer()` |
| CVE findings, secrets, auth status | `SecurityScanner.scanServer()` → CveChecker, SecretScanner, AuthProber, TypoSquatDetector |
| Server health, latency, tool count | `HealthMonitor.checkServer()` |
| Policy mode, rules, YAML | `default-policy.yaml` (or `MCP_GUARDIAN_POLICY`) |
| MCP server configs | `ConfigParser.parseAll()` — auto-discovers Cline, Claude Desktop, Cursor, Windsurf |
| DB path | `resolveMcpServerDbPath()` — same DB the proxy writes to |

---

## Caching

Results are cached in-memory to avoid hammering the database on every request:

| Cache key | TTL | Invalidated by |
|-----------|-----|----------------|
| `security` | 5 min | Manual via `POST /api/policy/reload` |
| `health` | 1 min | Auto-expires |
| `cost:<window>` | 30 s | Auto-expires |
| `aggregate:metrics:<window>` | 15 s | Background refresh loop |
| `exec-summary:<window>` | 30 s | Background refresh loop |

---

## Production Deployment

For production, build the dashboard as a static export and serve both the static
files and the API from the same host (e.g. with nginx):

```nginx
# nginx.conf
server {
  listen 443 ssl;

  # Static dashboard
  root /opt/mcp-guardian/deploy/dashboard-spa/out;
  index index.html;

  # API → Guardian SOC backend
  location /api/ {
    proxy_pass http://127.0.0.1:4040;
    proxy_set_header Host $host;
  }

  # SSE
  location /api/sse {
    proxy_pass http://127.0.0.1:4040;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding on;
    proxy_buffering off;
    proxy_cache off;
  }
}
```

Set `NEXT_PUBLIC_GUARDIAN_API=https://your-host.com` in `.env.local`
before running `pnpm dashboard:build` for the static export.
