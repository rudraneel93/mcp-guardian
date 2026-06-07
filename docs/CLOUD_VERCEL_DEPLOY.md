# Deploy MCP Guardian Cloud (Vercel + Neon)

Use this as your **business website** for Lemon Squeezy / payment-provider review and as the control plane for Pro license delivery.

## 1. Database (Neon)

1. Create a free Postgres project at [neon.tech](https://neon.tech)
2. Copy connection string → `DATABASE_URL`

## 2. Vercel project

Use the team that owns your production app (e.g. [rudraneel93-gmailcoms-projects](https://vercel.com/rudraneel93-gmailcoms-projects)).

1. Log in to [Vercel](https://vercel.com) as **rudraneel93-gmailcom** (not a different GitHub-linked account).
2. **Add New → Project** → import `rudraneel93/mcp-guardian` from GitHub.
3. **Root Directory:** `apps/cloud` (Edit → set to `apps/cloud`).
4. Framework: Next.js (auto-detected). Leave install/build from [`apps/cloud/vercel.json`](../apps/cloud/vercel.json) (`pnpm` from monorepo root).

**CLI note:** `VERCEL_TOKEN` must be created while logged into the **same** account as the team above. A token from another user (e.g. `seekersoflight94-2063`) cannot deploy to `rudraneel93-gmailcoms-projects`.

### Environment variables

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://YOUR-APP.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
| `LICENSE_JWT_SECRET` | same as `AUTH_SECRET` or separate |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | **Required for free sign-in** — [OAUTH_CLOUD_SETUP.md](./OAUTH_CLOUD_SETUP.md) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | **Required for free sign-in** |
| `NEXT_PUBLIC_PRO_CHECKOUT_URL` | `https://mcp-guardian.lemonsqueezy.com/checkout/buy/8a8276e9-603f-4e39-baa7-6e24aa2a75e0` |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | From LS → Settings → Webhooks → signing secret |
| `LEMONSQUEEZY_STORE_ID` | Optional — your LS store numeric ID |

Without OAuth vars, **Sign in (free)** fails; Pro license API still works.

OAuth redirect URIs (example production):

- Google: `https://mcp-guardian-cloud.vercel.app/api/auth/callback/google`
- GitHub: `https://mcp-guardian-cloud.vercel.app/api/auth/callback/github`

See [OAUTH_CLOUD_SETUP.md](./OAUTH_CLOUD_SETUP.md).

**Post-login flow:** free sign-in lands on `/post-login`, then redirects to the GitHub repo; `/dashboard` remains the optional cloud console.

## 3. Migrate

After first deploy (or locally with production `DATABASE_URL`):

```bash
DATABASE_URL="postgresql://..." pnpm cloud:migrate
# or with Vercel env pull:
VERCEL_TOKEN=... ./scripts/cloud-migrate-production.sh --pull-vercel
```

Applies all migrations through **007** (`007_fleet_instances.sql` for fleet heartbeat).

## 4. Lemon Squeezy webhook

1. LS **Settings → Webhooks** → URL: `https://YOUR-APP.vercel.app/api/webhooks/lemonsqueezy`
2. Events: `license_key_created`, `order_refunded`
3. Paste signing secret into Vercel as `LEMONSQUEEZY_WEBHOOK_SECRET`
4. Redeploy if you added env vars after first deploy

Details: [WEBHOOK_AUTOMATION.md](./WEBHOOK_AUTOMATION.md)

## 5. Verify

| Check | Expected |
|-------|----------|
| `https://YOUR-APP.vercel.app` | Free + **Pro $4.99** cards; **Buy Pro** opens LS checkout |
| `/terms` and `/privacy` | Linked from footer |
| `/dashboard/fleet` | Fleet overview (requires sign-in + migration **007**) |
| `./scripts/verify-pro-production.sh` | Production smoke (landing, license 401, webhook reject) |
| Test LS purchase | Row in `pro_license_keys` without manual SQL |
| `GET /api/v1/license` + buyer key | `"licensed": true` |

Submit Vercel URL to Lemon Squeezy as **Your website** and GitHub repo **Website** field.

## 6. Connect self-hosted Guardian

See [SAAS_CONTROL_PLANE.md](./SAAS_CONTROL_PLANE.md).

```bash
GUARDIAN_CONTROL_PLANE_URL=https://YOUR-APP.vercel.app
GUARDIAN_LICENSE_KEY=<LS-key-from-email>
```

## Deploy checklist (operator)

```bash
# Build
pnpm cloud:build

# Migrate (production DATABASE_URL)
pnpm cloud:migrate

# Optional: Vercel CLI
vercel link   # root: apps/cloud
vercel env add LEMONSQUEEZY_WEBHOOK_SECRET production
vercel deploy --prod
```

Manual key backfill: `pnpm cloud:register-pro-key -- --key "..." --email buyer@example.com`
