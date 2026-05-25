/**
 * Serve Next.js static export (`deploy/dashboard-spa/out`) from Express (desktop / embedded mode).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const SPA_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
};

const __dir = dirname(fileURLToPath(import.meta.url));

function deployRoots(): string[] {
  return [
    resolve(__dir, '..', '..', 'deploy'),
    resolve(__dir, '..', 'deploy'),
    resolve(process.cwd(), 'deploy'),
  ];
}

/** Resolve `deploy/dashboard-spa/out` when the SOC UI has been built. */
export function resolveDashboardSpaOutDir(): string | null {
  for (const root of deployRoots()) {
    const outDir = join(root, 'dashboard-spa', 'out');
    if (existsSync(join(outDir, 'index.html'))) return outDir;
  }
  return null;
}

function sendFile(res: Response, filePath: string, method: string): void {
  const mime = SPA_MIME[extname(filePath)] || 'application/octet-stream';
  const headers: Record<string, string> = { 'Content-Type': mime };
  if (filePath.includes('_next/static/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }
  res.writeHead(200, headers);
  if (method === 'HEAD') {
    res.end();
    return;
  }
  res.end(readFileSync(filePath));
}

function safeJoin(root: string, rel: string): string | null {
  if (!rel || rel.includes('..')) return null;
  const filePath = join(root, rel);
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

/** Express middleware: UI at `/`, API remains on `/api/*` (same origin — no browser port setup). */
export function createDashboardSpaMiddleware(spaRoot: string): RequestHandler {
  const root = resolve(spaRoot);

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const path = req.path || '/';

    if (path.startsWith('/api')) return next();

    if (path === '/dashboard' || path === '/dashboard/') {
      res.writeHead(301, { Location: '/' });
      res.end();
      return;
    }

    if (path.startsWith('/_next/')) {
      const file = safeJoin(root, path.slice(1));
      if (file && existsSync(file)) {
        sendFile(res, file, req.method);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Static asset not found' }));
      return;
    }

    if (path === '/favicon.ico') {
      const fav = safeJoin(root, 'favicon.ico');
      if (fav && existsSync(fav)) {
        sendFile(res, fav, req.method);
        return;
      }
      res.writeHead(204);
      res.end();
      return;
    }

    if (path === '/' || path === '/index.html') {
      const index = join(root, 'index.html');
      if (existsSync(index)) {
        sendFile(res, index, req.method);
        return;
      }
    }

    const trimmed = path.replace(/^\//, '').replace(/\/$/, '');
    const candidates = [
      trimmed,
      `${trimmed}.html`,
      join(trimmed, 'index.html').replace(/\\/g, '/'),
    ];
    for (const rel of candidates) {
      const file = safeJoin(root, rel);
      if (file && existsSync(file)) {
        sendFile(res, file, req.method);
        return;
      }
    }

    const fallback = join(root, 'index.html');
    if (existsSync(fallback)) {
      sendFile(res, fallback, req.method);
      return;
    }

    next();
  };
}
