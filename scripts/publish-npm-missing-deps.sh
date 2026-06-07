#!/usr/bin/env bash
# Publish @mcp-guardian/plugin-sdk and @mcp-guardian/core for the current monorepo version
# when server was published without its dependency chain (install fails with ETARGET).
#
# Requires npm login with publish access. If 2FA is enabled:
#   NPM_OTP=123456 ./scripts/publish-npm-missing-deps.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/publish-npm-all.sh"
