# MCP Guardian Pro — license and activation

## Two tiers

| Tier | License | What you get |
|------|---------|--------------|
| **Community** | [MIT](../LICENSE) + [COMMUNITY_SCOPE.md](../COMMUNITY_SCOPE.md) | Proxy, CLI scan, local policy, adversarial harness |
| **Pro** | [LICENSE-PRO](../LICENSE-PRO) + paid key | Dashboard, Security Swarm, AI learning, multi-tenant, semantic async |

**npm install is always free.** Pro unlocks **runtime features**, not the download.

## Purchase

- [Buy Pro — $4.99 lifetime](https://mcp-guardian.lemonsqueezy.com/checkout/buy/8a8276e9-603f-4e39-baa7-6e24aa2a75e0)
- Receipt email: **license key** (Lemon Squeezy `{license_key}`)
- Control plane URL (same for all buyers): `https://mcp-guardian-cloud.vercel.app`

Full setup: [PRO_SETUP.md](./PRO_SETUP.md)

## Activate (self-hosted)

```bash
export GUARDIAN_LICENSE_KEY="<from-email>"
export GUARDIAN_CONTROL_PLANE_URL="https://mcp-guardian-cloud.vercel.app"
```

Restart Guardian proxy/dashboard. Verify:

```bash
curl -s -H "Authorization: Bearer $GUARDIAN_LICENSE_KEY" \
  "$GUARDIAN_CONTROL_PLANE_URL/api/v1/license" | jq .licensed
```

## v3.0 changes (breaking)

- **Security Swarm CLI** (`pnpm security-swarm:analyze`) requires Pro
- **`GUARDIAN_OPEN_CORE=false` removed** — use `GUARDIAN_DEV_UNLOCK_ALL=true` only with `NODE_ENV=development` for maintainers
- Pinned npm **&lt; 3.0** still runs old code without these gates (see below)

## Older versions

| Version | Pro without paying? |
|---------|---------------------|
| **npm &lt; 2.9.7** | Yes — no license system |
| **2.9.7 – 2.10.x** | Partial — dashboard gated; swarm CLI could bypass |
| **3.0+** | No (honest use) — CLI + dashboard enforced |

Upgrading to **3.0** is required for continued Pro CLI support.

## What we cannot prevent

- Users who **pin an old npm version** keep that version’s behavior forever
- **Forks** that remove license checks (MIT Community Scope still allows forks of community code; Pro terms restrict Pro use)
- **Offline mock** of the license API (mitigated by periodic validation + grace period)

## Legal

[LICENSE-PRO](../LICENSE-PRO) is a plain-language commercial license. Have counsel review before enterprise contracts.

Support: reply to your purchase receipt or [GitHub Discussions](https://github.com/rudraneel93/mcp-guardian/discussions).
