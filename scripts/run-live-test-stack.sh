#!/usr/bin/env sh
# Live MCP proxy + live-only dashboard (:3000) sharing one history DB.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export MCP_GUARDIAN_DB_PATH="${MCP_GUARDIAN_DB_PATH:-$HOME/.mcp-guardian/history.db}"
export GUARDIAN_CI_BYPASS_LICENSE="${GUARDIAN_CI_BYPASS_LICENSE:-true}"

CONFIG="${1:-guardian-configs/fixture_echo.json}"
POLICY="${2:-default-policy.yaml}"

if [ ! -f dist/cli.js ]; then
  echo "[live-test] Building dist…" >&2
  pnpm build
fi

if command -v lsof >/dev/null 2>&1; then
  for port in 3000 4040 9090 9091; do
    PIDS=$(lsof -ti :"$port" 2>/dev/null || true)
    [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
  done
fi
pkill -9 -f 'next dev -p' 2>/dev/null || true
pkill -9 -f 'next-server' 2>/dev/null || true
pkill -9 -f 'tsx watch src/soc-api-server' 2>/dev/null || true
tmux -f /exec-daemon/tmux.portal.conf kill-session -t live-test-stack 2>/dev/null || true
sleep 2

echo "[live-test] Seeding proxy traffic → $MCP_GUARDIAN_DB_PATH" >&2
DASHBOARD_ENABLED=false GUARDIAN_WS_ENABLED=false node scripts/seed-echo-proxy-traffic.mjs

echo "[live-test] Starting proxy + dashboard (Ctrl+C stops both)…" >&2
echo "[live-test]   Dashboard: http://localhost:3000/" >&2
echo "[live-test]   SOC API:   http://localhost:4040/" >&2
echo "[live-test]   DB:        $MCP_GUARDIAN_DB_PATH" >&2
echo "[live-test]   Proxy:     $CONFIG (stdio — point MCP client at this process)" >&2

exec pnpm exec concurrently --kill-others-on-fail -n serve,proxy -c magenta,cyan \
  "MCP_GUARDIAN_DB_PATH='$MCP_GUARDIAN_DB_PATH' GUARDIAN_CI_BYPASS_LICENSE=true pnpm serve" \
  "MCP_GUARDIAN_DB_PATH='$MCP_GUARDIAN_DB_PATH' DASHBOARD_ENABLED=false GUARDIAN_DASHBOARD_SPA=false GUARDIAN_WS_ENABLED=false METRICS_ENABLED=false node dist/cli.js proxy --config '$CONFIG' --policy '$POLICY' --blocking-mode audit"
