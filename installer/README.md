# MCP Guardian installers

## Windows (Inno Setup)

Shipped in v2.7: `installer/windows/mcp-guardian.iss` + [build instructions](windows/README.md).

Produces a per-user setup executable (Node 18+ prerequisite check, `guardian-proxy.ps1`, PATH append).

Code signing is your org's responsibility before enterprise rollout.

## Desktop application (enterprise SOC UI)

Installable **Windows / macOS / Linux** app — no browser or `pnpm serve` required:

```bash
pnpm desktop:build
mcp-guardian desktop
```

Packaged installers: `pnpm desktop:pack` → `dist/installer/desktop/`

See [docs/ENTERPRISE_DESKTOP.md](../docs/ENTERPRISE_DESKTOP.md).

## npm (recommended)

```bash
npm install -g @mcp-guardian/server
```

See [docs/WINDOWS.md](../docs/WINDOWS.md) for PowerShell wrap.
