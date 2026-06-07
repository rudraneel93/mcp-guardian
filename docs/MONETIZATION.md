# Monetization — MCP Guardian Pro ($4.99 lifetime)

Operator guide for selling a **one-time $4.99** lifetime Pro license without a separate marketing website.

## Paid artifact (Option A — recommended)

| Item | Detail |
|------|--------|
| **Product name** | MCP Guardian Pro — Lifetime |
| **Price** | $4.99 USD one-time |
| **What buyers get** | Unique license key (Lemon Squeezy email) + [PRO_SETUP.md](./PRO_SETUP.md) with fixed control plane URL `https://mcp-guardian-cloud.vercel.app` |
| **Technical use** | Map LS license key → `GUARDIAN_LICENSE_KEY` on self-hosted Guardian; optional cloud org for `gcp_...` API keys |
| **Free tier** | **Community** on npm — proxy + CLI stay free (MIT) |
| **Pro tier** | Paid license unlocks dashboard, swarm, multi-tenant, semantic async |

Checkout is hosted by **Lemon Squeezy** (Merchant of Record — global VAT handled). No in-repo billing tables.

## Open-core model (default)

**v3.0+** — **npm install is always free** (MIT Community Scope). Pro features require a valid license validated against your cloud control plane. See [LICENSE-PRO](../LICENSE-PRO) and [COMMUNITY_SCOPE.md](../COMMUNITY_SCOPE.md).

| Tier | What users get |
|------|----------------|
| **Community** | `mcp-guardian proxy`, YAML policy, regex/schema gates, CLI scan, adversarial harness — no license |
| **Pro** | Dashboard, WebSocket, **Security Swarm CLI**, AI learning, fleet, multi-tenant JWT, semantic async |

**Maintainer dev only:** `NODE_ENV=development` + `GUARDIAN_DEV_UNLOCK_ALL=true`.  
**Deprecated:** `GUARDIAN_OPEN_CORE=false` (ignored in v3.0 with a warning).

**Cannot fully prevent:** pinned npm **&lt; 3.0**; forks that strip checks (MIT Community). Pro terms apply to Pro Scope use.

## Quick links

| Doc | Audience |
|-----|----------|
| [LEMON_SQUEEZY_SETUP.md](./LEMON_SQUEEZY_SETUP.md) | You — store + product checklist |
| [PRO_SETUP.md](./PRO_SETUP.md) | Buyers — post-purchase install |
| [templates/pro-purchase-email.md](./templates/pro-purchase-email.md) | Copy for LS product description / receipt |
| [CLOUD_VERCEL_DEPLOY.md](./CLOUD_VERCEL_DEPLOY.md) | Deploy landing page for payment-provider verification |
| [WEBHOOK_AUTOMATION.md](./WEBHOOK_AUTOMATION.md) | Webhook auto-register Pro keys |
| **Buy Pro (live)** | [Checkout](https://mcp-guardian.lemonsqueezy.com/checkout/buy/8a8276e9-603f-4e39-baa7-6e24aa2a75e0) |

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_PRO_CHECKOUT_URL` | `apps/cloud` | Buy Pro button on cloud homepage |
| `GUARDIAN_LICENSE_KEY` | Self-hosted Guardian | Buyer’s license key |
| `GUARDIAN_DEV_UNLOCK_ALL` | Self-hosted (dev) | `true` + `NODE_ENV=development` — local Pro unlock only |
| `GUARDIAN_CI_BYPASS_LICENSE` | CI only | `true` in upstream GitHub Actions |
| `GUARDIAN_PRO_CHECKOUT_URL` | Self-hosted / cloud | Lemon Squeezy link in 402 responses + banner |
| `GUARDIAN_REQUIRE_LICENSE` | Self-hosted Guardian | `true` = hard-fail dashboard startup without license |
| `GUARDIAN_CONTROL_PLANE_URL` | Self-hosted Guardian | Cloud URL for `GET /api/v1/license` |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | `apps/cloud` | HMAC verify LS webhooks |
| `LEMONSQUEEZY_STORE_ID` | `apps/cloud` | Optional store filter |

## Fulfillment (webhook + manual fallback)

1. Lemon Squeezy emails buyer a **license key** automatically (not a per-buyer control plane URL).
2. **Webhook** (`license_key_created`) inserts hashed key into `pro_license_keys` — [WEBHOOK_AUTOMATION.md](./WEBHOOK_AUTOMATION.md).
3. Buyer sets `GUARDIAN_LICENSE_KEY` (from email) and `GUARDIAN_CONTROL_PLANE_URL=https://mcp-guardian-cloud.vercel.app` on their Guardian host.
4. **Manual fallback:** `pnpm cloud:register-pro-key -- --key "..." --email buyer@example.com`
5. Alternatively email a `gcp_...` API key from cloud **Settings → Rotate API key**.

## What not to do

- Re-enable deleted Razorpay/Stripe tables in `apps/cloud` before you need automation.
- Gate the MIT npm tarball — sell the **license**, not the public code.
- Promise HIPAA/SOC2 certification at this price point.
