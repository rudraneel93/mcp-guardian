/**
 * Embedded local runtime for the MCP Guardian SOC desktop app.
 * Binds API + static UI to loopback only — no external web server or port forwarding required.
 */
import { createServer } from 'node:net';
import { resolveDashboardSpaOutDir } from '../utils/dashboard-spa-static.js';
import { startSocApiServer, type SocApiServerHandle } from '../soc-api-server.js';

export type DesktopRuntime = SocApiServerHandle & {
  appUrl: string;
};

export function findFreePort(host = '127.0.0.1'): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, host, () => {
      const addr = probe.address();
      const port = typeof addr === 'object' && addr && 'port' in addr ? addr.port : 0;
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

export async function startDesktopRuntime(opts?: {
  port?: number;
  dbPath?: string;
}): Promise<DesktopRuntime> {
  const spaDir = resolveDashboardSpaOutDir();
  if (!spaDir) {
    throw new Error(
      'SOC dashboard UI is not built. From the repo root run: pnpm desktop:build',
    );
  }

  const host = '127.0.0.1';
  const port = opts?.port ?? (await findFreePort(host));

  if (opts?.dbPath) {
    process.env.MCP_GUARDIAN_DB_PATH = opts.dbPath;
  }
  process.env.SOC_API_HOST = host;
  process.env.SOC_API_PORT = String(port);
  process.env.GUARDIAN_DESKTOP_MODE = 'true';
  process.env.GUARDIAN_CI_BYPASS_LICENSE = process.env.GUARDIAN_CI_BYPASS_LICENSE ?? 'true';

  const handle = await startSocApiServer(port, {
    host,
    staticSpaDir: spaDir,
    registerSignals: false,
  });

  return { ...handle, appUrl: handle.url };
}
