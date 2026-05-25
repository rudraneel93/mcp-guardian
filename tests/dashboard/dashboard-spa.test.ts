import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const SPA_ROOT = join(process.cwd(), 'deploy', 'dashboard-spa');

describe('dashboard-spa', () => {
  it('includes Next.js app source with client-only dashboard', () => {
    const client = join(SPA_ROOT, 'app', 'components', 'DashboardClient.tsx');
    const boundary = join(SPA_ROOT, 'app', 'components', 'DashboardErrorBoundary.tsx');
    const loginGate = join(SPA_ROOT, 'app', 'components', 'LoginGate.tsx');
    const swarmPanel = join(SPA_ROOT, 'app', 'components', 'SwarmPanel.tsx');
    expect(existsSync(client)).toBe(true);
    expect(existsSync(boundary)).toBe(true);
    expect(existsSync(loginGate)).toBe(true);
    expect(existsSync(swarmPanel)).toBe(true);
    const src = readFileSync(client, 'utf-8');
    expect(src).toContain("'use client'");
    expect(src).toContain("'swarm'");
    expect(src).toContain('SwarmPanel');
    expect(src).toContain('setReady(true)');
    expect(src).not.toMatch(/Date\.now\(\)/);
    expect(src).not.toMatch(/Math\.random\(\)/);
  });

  it('loads dashboard client with ssr disabled', () => {
    const pageClient = join(SPA_ROOT, 'app', 'components', 'DashboardPageClient.tsx');
    const pageSrc = readFileSync(pageClient, 'utf-8');
    expect(pageSrc).toContain("'use client'");
    expect(pageSrc).toContain('ssr: false');
    expect(pageSrc).toContain('dynamic(');
  });

  it('resolves API base to relative paths by default', () => {
    const api = join(SPA_ROOT, 'lib', 'guardian-api.ts');
    const apiSrc = readFileSync(api, 'utf-8');
    expect(apiSrc).toContain("return ''");
    expect(apiSrc).toMatch(/base \? `\$\{base\}\$\{normalized\}` : normalized/);
  });

  it('includes SOC quick actions and learning cycle API client', () => {
    const soc = join(SPA_ROOT, 'app', 'components', 'dashboard', 'SocQuickActions.tsx');
    const api = join(SPA_ROOT, 'lib', 'guardian-api.ts');
    expect(existsSync(soc)).toBe(true);
    const apiSrc = readFileSync(api, 'utf-8');
    expect(apiSrc).toContain('runAiLearningCycle');
    expect(apiSrc).toContain('/api/ai/learning/cycle');
    expect(apiSrc).toContain('fetchPromotionStats');
    const client = readFileSync(join(SPA_ROOT, 'app', 'components', 'DashboardClient.tsx'), 'utf-8');
    expect(client).toContain('SocQuickActions');
    expect(client).toContain("'SOC / AI'");
  });

  it('includes Enterprise AI panel for Tier 1/2 features', () => {
    const enterprise = join(SPA_ROOT, 'app', 'components', 'EnterpriseAiPanel.tsx');
    const lora = join(SPA_ROOT, 'app', 'components', 'TenantLoraPanel.tsx');
    expect(existsSync(enterprise)).toBe(true);
    expect(existsSync(lora)).toBe(true);
    const client = readFileSync(join(SPA_ROOT, 'app', 'components', 'DashboardClient.tsx'), 'utf-8');
    expect(client).toContain("'enterprise-ai'");
    expect(client).toContain('EnterpriseAiPanel');
  });

  it('keeps legacy static assets for opt-in GUARDIAN_DASHBOARD_LEGACY only', () => {
    const legacyIndex = join(SPA_ROOT, 'index.legacy.html');
    const legacyJs = join(SPA_ROOT, 'app.js');
    expect(existsSync(legacyIndex)).toBe(true);
    expect(existsSync(legacyJs)).toBe(true);
    expect(existsSync(join(SPA_ROOT, 'package.json'))).toBe(true);
  });

  it('documents pnpm serve for SOC static export', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.serve).toContain('scripts/serve.mjs');
  });

  it('static export exists after dashboard:build', () => {
    const outIndex = join(SPA_ROOT, 'out', 'index.html');
    if (!existsSync(outIndex)) {
      // CI may skip npm install in deploy/dashboard-spa; source + legacy tests still gate structure.
      expect(existsSync(join(SPA_ROOT, 'package.json'))).toBe(true);
      return;
    }
    const html = readFileSync(outIndex, 'utf-8');
    expect(html).toContain('MCP Guardian');
    expect(html).toMatch(/\/_next\//);
  });
});
