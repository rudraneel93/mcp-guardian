/**
 * Launch MCP Guardian SOC as an installable desktop application.
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { startDesktopRuntime } from './desktop-runtime.js';

const require = createRequire(import.meta.url);

const __dir = dirname(fileURLToPath(import.meta.url));

export type LaunchDesktopOptions = {
  /** When true (default), open the Electron shell. When false, loopback server only. */
  electron?: boolean;
  port?: number;
};

function repoRoot(): string {
  return join(__dir, '..', '..');
}

function electronMainPath(): string {
  return join(repoRoot(), 'desktop', 'main.mjs');
}

async function waitForEnter(message: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

export async function launchDesktopApp(opts: LaunchDesktopOptions = {}): Promise<number> {
  const useElectron = opts.electron !== false;
  const runtime = await startDesktopRuntime({ port: opts.port });

  console.log('[mcp-guardian] SOC desktop runtime ready (loopback only)');
  console.log(`[mcp-guardian]   App URL: ${runtime.appUrl}`);
  console.log('[mcp-guardian]   No browser or firewall setup required — traffic stays on 127.0.0.1');

  const shutdown = async () => {
    await runtime.shutdown();
  };

  process.on('SIGINT', () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void shutdown().then(() => process.exit(0));
  });

  if (!useElectron) {
    console.log('[mcp-guardian] Server-only mode — press Enter to stop.');
    await waitForEnter('');
    await shutdown();
    return 0;
  }

  let electronBin: string;
  try {
    electronBin = require('electron') as string;
  } catch {
    console.error(
      '[mcp-guardian] Electron is not installed. Run: pnpm install  (from repo root)',
    );
    await shutdown();
    return 1;
  }

  const child = spawn(electronBin, [electronMainPath()], {
    stdio: 'inherit',
    env: { ...process.env, GUARDIAN_DESKTOP_URL: runtime.appUrl },
  });

  return await new Promise<number>((resolve) => {
    child.on('error', (err) => {
      console.error(
        `[mcp-guardian] Electron failed to start: ${err.message}. Run: pnpm install (electron) or pnpm desktop:build`,
      );
      void shutdown().then(() => resolve(1));
    });
    child.on('exit', (code) => {
      void shutdown().then(() => resolve(code ?? 0));
    });
  });
}
