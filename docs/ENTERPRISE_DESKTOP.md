# MCP Guardian SOC — Enterprise desktop application

The SOC dashboard is available as a **local installable desktop app**. It does not require `pnpm serve`, a browser tab on port 3000, or any public HTTP endpoint.

## Launch (development / enterprise install)

From the repo root after build:

```bash
pnpm desktop:build
mcp-guardian desktop
```

Or:

```bash
pnpm desktop
```

This starts:

1. **Embedded loopback server** on `127.0.0.1` (API + static UI, same origin)
2. **Electron window** (default) — the product shell; not an external browser

### Headless / CI

```bash
mcp-guardian desktop --no-electron
```

Runs the loopback stack only (press Enter to stop).

## Installers (Windows / macOS / Linux)

```bash
pnpm install
pnpm desktop:pack
```

Artifacts are written under `dist/installer/desktop/` (NSIS on Windows, DMG on macOS, AppImage/deb on Linux).

Requirements:

- Node.js 18+
- Build the UI first (`pnpm desktop:build` is run automatically by `desktop:pack`)
- **pnpm:** Electron must run its postinstall script. This repo lists `electron` in `pnpm.onlyBuiltDependencies`. If `mcp-guardian desktop` says Electron failed to install, run: `pnpm rebuild electron`

### Smoke test (no window)

```bash
pnpm desktop:smoke
```

## Web dev mode (optional)

`pnpm serve` remains for **developers** who want hot-reload via Next.js. End users and enterprise deployments should use **`mcp-guardian desktop`** instead.

## Mobile (iOS / Android)

This conversion targets **desktop enterprise** (Windows, macOS, Linux) using Electron. Native iOS/Android shells are not part of this deliverable; use the terminal UI (`mcp-guardian tui`) or a future mobile phase.

## Data directory

Uses `~/.mcp-guardian/history.db` by default (`MCP_GUARDIAN_DB_PATH`).
