# Google OAuth Setup for MCP Guardian Dashboard

## Status
✅ **Google OAuth is now configured** - The dev server is running with OAuth support enabled.

## What's Configured
- **NextAuth.js** with Google provider integration
- **Database adapter** for user session persistence
- **JWT session strategy** with 30-day expiration
- **Protected routes** - `/dashboard` requires authentication
- **Environment variables** - AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

## Dev Server Details
- **Running on:** http://localhost:3001
- **Login page:** http://localhost:3001/dashboard (redirects to login)
- **Auth endpoints:** http://localhost:3001/api/auth/*

## How to Get Google OAuth Credentials

### Step 1: Go to Google Cloud Console
Visit https://console.cloud.google.com/ and sign in with your Google account.

### Step 2: Create a New Project
1. Click the project selector at the top
2. Click "NEW PROJECT"
3. Name it (e.g., "MCP Guardian")
4. Click "CREATE"
5. Wait for the project to be created, then select it

### Step 3: Enable Google Sign-In API
1. In the search bar, search for "Google+ API" 
2. Click on it and press "ENABLE"

### Step 4: Create OAuth 2.0 Credentials
1. Go to **Credentials** in the left sidebar
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, click **CONFIGURE CONSENT SCREEN**
4. Choose **External** as the user type
5. Fill in the required fields:
   - App name: "MCP Guardian"
   - User support email: (your email)
   - Developer contact: (your email)
6. Click **SAVE AND CONTINUE** through all steps

### Step 5: Create OAuth Client
1. Back on the Credentials page, click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Choose **Web application** as the Application type
3. Name it: "MCP Guardian Cloud"
4. Add Authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google`
   - `http://localhost:3001/api/auth/signin` (for sign-in page)
5. Click **CREATE**

### Step 6: Copy Credentials
A modal will appear with your credentials:
- **Client ID** → Copy this to AUTH_GOOGLE_ID
- **Client Secret** → Copy this to AUTH_GOOGLE_SECRET

## Set Environment Variables

Update the environment variables in your v0 project settings or add them to apps/cloud/.env.local:

```
AUTH_GOOGLE_ID=your-client-id-here.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret-here
AUTH_SECRET=generated-secret (should already be set)
```

## Testing the Login Flow

1. **Open the dashboard:** http://localhost:3001/dashboard
2. **You'll be redirected to:** http://localhost:3001/api/auth/signin
3. **Click "Sign in with Google"** button
4. **Sign in** with your Google account
5. **Authorize** the app to access your profile
6. **You'll be redirected** back to the dashboard

## View Live Dashboard

Once logged in, the dashboard will show:
- **Executive Summary Panel** - KPIs from proxy_call_records
- **Fleet Overview Panel** - Guardian instances
- **Audit Explorer Panel** - Block patterns and activity heatmap
- **Cost Governance Panel** - Cost tracking
- **Security Posture Panel** - Security metrics
- **Health & Reliability Panel** - System uptime and errors

## Data Sources

All data is fetched from these API endpoints:
- `/api/dashboard/executive-summary` - Request metrics & costs
- `/api/dashboard/insights` - Generated insights from audit data
- `/api/dashboard/fleet` - Fleet instance status
- `/api/dashboard/audit-heatmap` - Block patterns visualization
- `/api/dashboard/cost` - Cost breakdown
- `/api/dashboard/security` - Security metrics
- `/api/dashboard/health` - System health

## Database Requirements

The dashboard reads from these tables:
- `proxy_call_records` - Audit logs with blocking data, costs, latency
- `guardian_fleet_instances` - Fleet instance metadata

## Troubleshooting

### "Provider not configured" error
Make sure AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set in environment variables.

### "Callback URL mismatch" error
Ensure the redirect URI in Google Cloud Console matches exactly:
`http://localhost:3001/api/auth/callback/google`

### "Invalid client" error
Check that your Client ID and Client Secret are correct and copied without extra spaces.

### No Google button appearing
Refresh the page and check browser console for errors (F12).

## Production Deployment

For production, update:
1. **Authorized redirect URIs** in Google Cloud Console to your production domain
2. **AUTH_URL** environment variable to your production domain
3. **NEXT_PUBLIC_APP_URL** to your production domain
4. Ensure database is accessible from production environment
