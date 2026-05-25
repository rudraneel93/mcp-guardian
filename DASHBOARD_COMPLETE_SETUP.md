# MCP Guardian Dashboard - Complete Setup Summary

## Current Status: Ready for OAuth Configuration

### What's Been Implemented

#### 1. **Real-Time Data API Layer** ✅
Created 7 backend API routes that query the database and serve live data:

- **Executive Summary** (`/api/dashboard/executive-summary`)
  - Total requests, pass/block rates
  - Cost metrics and burn rates
  - Top tools and servers by activity
  - Average latency

- **Insights** (`/api/dashboard/insights`)
  - Auto-generated bullet points from audit data
  - Configurable scopes (overview, cost, audit)
  - Measured data source

- **Fleet** (`/api/dashboard/fleet`)
  - Guardian instance list with status
  - Last heartbeat tracking
  - Aggregated metrics per instance
  - Active/inactive status

- **Audit Heatmap** (`/api/dashboard/audit-heatmap`)
  - Rule × Tool blocking patterns matrix
  - Day × Hour activity visualization
  - Blocked request tracking

- **Cost** (`/api/dashboard/cost`)
  - Total cost calculation
  - Burn rate per hour
  - 30-day projection
  - Top cost-driving servers

- **Security** (`/api/dashboard/security`)
  - Security score calculation
  - Threat breakdown by type
  - Compliance metrics

- **Health** (`/api/dashboard/health`)
  - System uptime percentage
  - Error rate calculation
  - Average latency metrics
  - Request success/failure tracking

#### 2. **Interactive Dashboard UI** ✅
Implemented 6 comprehensive dashboard panels with real-time data binding:

- **ExecutiveOverviewPanel** - KPI cards with trends
- **FleetOverviewPanel** - Fleet instances table
- **AuditExplorerPanel** - Block patterns heatmap
- **CostGovernancePanel** - Cost breakdown charts
- **SecurityPosturePanel** - Security metrics cards
- **HealthReliabilityPanel** - System health indicators

#### 3. **Data Orchestration Client** ✅
**DashboardClient.tsx** handles:
- Tab navigation across 6 data sections
- Automatic polling every 30 seconds
- Time window selection (1, 7, 30, 90 days)
- Manual refresh functionality
- Error handling and loading states
- Data aggregation from all API endpoints

#### 4. **Authentication & OAuth** ✅
- NextAuth.js integration with Google provider
- JWT-based sessions (30-day expiration)
- Database-backed user persistence
- Protected `/dashboard` route
- OAuth callback handlers

### Development Environment

**Server Location:** `http://localhost:3001`
**Status:** Running with hot-reload enabled
**Database:** PostgreSQL at `localhost:5432` (mcp_guardian_cloud)

### Getting Google OAuth Credentials

To enable login, follow these steps:

1. **Go to Google Cloud Console**
   - URL: https://console.cloud.google.com/
   - Sign in with Google account

2. **Create OAuth Application**
   - New Project → Name: "MCP Guardian"
   - Enable Google+ API
   - Credentials → Create OAuth Client ID
   - Application type: Web application
   - Add authorized redirect URI: `http://localhost:3001/api/auth/callback/google`

3. **Get Credentials**
   - Copy Client ID → `AUTH_GOOGLE_ID`
   - Copy Client Secret → `AUTH_GOOGLE_SECRET`

4. **Set Environment Variables**
   - Add to project settings or apps/cloud/.env.local
   - AUTH_GOOGLE_ID=your-id
   - AUTH_GOOGLE_SECRET=your-secret

### Testing the Dashboard

1. **Access Login**
   - Navigate to: http://localhost:3001/dashboard
   - You'll see: "Sign in with Google" button

2. **Sign In**
   - Click Google button
   - Sign in with your Google account
   - Authorize the application

3. **View Dashboard**
   - See 6 tabs with real-time data
   - Data auto-refreshes every 30 seconds
   - Click tabs to explore different sections

### Data Sources & Database Tables

The dashboard reads from:
- `proxy_call_records` - All MCP proxy call logs
  - Fields: timestamp, server_name, tool_name, block_rule, blocked, latency_ms, cost_usd, error_code
  - Used by: All panels for metrics, costs, blocking data

- `guardian_fleet_instances` - Fleet instance registry
  - Fields: instance_id, instance_name, hostname, region, status, last_heartbeat, metrics_snapshot
  - Used by: Fleet Overview panel

### API Response Format

All endpoints return JSON with:
```json
{
  "available": true,           // Data availability flag
  "source": "cloud-fleet",     // Data source identifier
  "timestamp": "2024-...",     // Data freshness
  "data": { ... }              // Endpoint-specific data
}
```

### Key Features

✅ **Complete Data Coverage** - No missing fields or filtered results
✅ **Real-Time Updates** - 30-second polling intervals
✅ **Interactive UI** - Tabs, filters, time selectors
✅ **Error Resilience** - Graceful fallbacks for missing data
✅ **Database Direct** - Queries proxy_call_records directly
✅ **Multi-Panel View** - 6 different analytical perspectives
✅ **User Authentication** - Google OAuth integration
✅ **Session Management** - JWT-based with 30-day expiration

### File Structure

```
apps/cloud/
├── app/
│   ├── api/dashboard/
│   │   ├── executive-summary/route.ts    ← API endpoint
│   │   ├── insights/route.ts
│   │   ├── fleet/route.ts
│   │   ├── audit-heatmap/route.ts
│   │   ├── cost/route.ts
│   │   ├── security/route.ts
│   │   └── health/route.ts
│   └── dashboard/
│       └── page.tsx                      ← Main dashboard page
├── components/
│   ├── DashboardClient.tsx               ← Main orchestration component
│   └── dashboard/
│       ├── ExecutiveOverviewPanel.tsx
│       ├── FleetOverviewPanel.tsx
│       ├── AuditExplorerPanel.tsx
│       ├── CostGovernancePanel.tsx
│       ├── SecurityPosturePanel.tsx
│       ├── HealthReliabilityPanel.tsx
│       └── KpiCard.tsx
└── lib/
    ├── auth.ts                           ← NextAuth config
    └── oauth-providers.ts                ← Google provider setup
```

### Monitoring & Debugging

**Check Server Logs:**
```bash
tail -f /tmp/dev-server.log
```

**Test API Endpoints:**
```bash
curl http://localhost:3001/api/dashboard/executive-summary
```

**Database Query:**
```sql
SELECT COUNT(*) FROM proxy_call_records WHERE org_id = ?;
```

### Production Deployment

When deploying to production:

1. Update Google Cloud Console authorized URIs
2. Set AUTH_URL to production domain
3. Update NEXT_PUBLIC_APP_URL
4. Configure production database
5. Update AUTH_SECRET to production value
6. Enable HTTPS

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Sign in with Google" button missing | Check AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set |
| "Callback URL mismatch" | Ensure redirect URI matches exactly in Google Cloud Console |
| Dashboard shows no data | Check database connection and proxy_call_records table has data |
| 404 on API endpoints | Ensure dev server is running and routes are deployed |
| Session expires immediately | Check AUTH_SECRET is set and database tables exist |

### Next Steps

1. ✅ Get Google OAuth credentials from Google Cloud Console
2. ✅ Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET environment variables
3. ✅ Restart dev server (it will auto-reload)
4. ✅ Sign in with Google account
5. ✅ Explore dashboard panels with live data
6. ✅ Deploy to Vercel when ready

---

**Documentation Files:**
- `GOOGLE_OAUTH_SETUP.md` - Detailed OAuth configuration guide
- `DASHBOARD_IMPLEMENTATION.md` - Technical implementation details
- `DASHBOARD_LIVE_TESTING.md` - Manual testing procedures
