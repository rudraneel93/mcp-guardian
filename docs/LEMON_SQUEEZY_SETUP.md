# Lemon Squeezy setup checklist

Complete after your Lemon Squeezy store application is **approved**.

## 1. Store

- **Store name:** MCP Guardian
- **Website URL (for LS review):** deploy [apps/cloud](../apps/cloud) to Vercel (see [CLOUD_VERCEL_DEPLOY.md](./CLOUD_VERCEL_DEPLOY.md)) or use `https://www.npmjs.com/package/@mcp-guardian/server` until cloud is live
- **Business description:** see [MONETIZATION.md](./MONETIZATION.md) or use the 2–3 sentence summary from your application

## 2. Product

| Field | Value |
|-------|-------|
| Name | MCP Guardian Pro — Lifetime |
| Price | $4.99 USD |
| Type | Digital download / license |
| Billing | **One-time** (not subscription) |

### License keys

1. Product → **License keys** → Enable
2. Activation limit: **1** (or unlimited devices if you prefer generous licensing)
3. LS auto-emails the key on purchase

### Product description (paste)

Use the body from [templates/pro-purchase-email.md](./templates/pro-purchase-email.md) (HTML or plain text in LS product page). Include the control plane URL `https://mcp-guardian-cloud.vercel.app` — LS does not generate it.

## 3. Policies

- Enable LS **refund policy** template (e.g. 14-day refund for unused keys)
- Link **Terms** / **Privacy** — copy from [apps/cloud/app/terms/page.tsx](../apps/cloud/app/terms/page.tsx) or your deployed `/terms` and `/privacy`

## 4. Live checkout URL

**Production checkout:**

`https://mcp-guardian.lemonsqueezy.com/checkout/buy/8a8276e9-603f-4e39-baa7-6e24aa2a75e0`

1. Set on Vercel (recommended for rotation): `NEXT_PUBLIC_PRO_CHECKOUT_URL` = URL above
2. Code default is embedded if env is unset — see `apps/cloud/lib/pro-checkout-url.ts`
3. Update GitHub repo **Website** to your Vercel URL after deploy

## 5. Register Pro license keys

### Primary — webhook (automatic)

After cloud is deployed, configure per [WEBHOOK_AUTOMATION.md](./WEBHOOK_AUTOMATION.md):

- Webhook URL: `https://YOUR-APP.vercel.app/api/webhooks/lemonsqueezy`
- Events: `license_key_created`, `order_refunded`
- Env: `LEMONSQUEEZY_WEBHOOK_SECRET`, optional `LEMONSQUEEZY_STORE_ID`

Each purchase inserts a hashed row into `pro_license_keys` automatically.

### Fallback — manual CLI

```bash
DATABASE_URL=postgresql://... AUTH_SECRET=... pnpm cloud:register-pro-key -- \
  --key "PASTE-BUYER-LICENSE-KEY" --email buyer@example.com
```

Or give the buyer a **`gcp_...`** API key from cloud Settings (no `pro_license_keys` row needed).

## 6. Test purchase

- Use LS **test mode** card
- Confirm license key email arrives
- Confirm webhook created DB row (or run manual CLI)
- Follow [PRO_SETUP.md](./PRO_SETUP.md) with the test key
