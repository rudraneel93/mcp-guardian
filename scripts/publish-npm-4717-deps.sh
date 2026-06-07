#!/usr/bin/env bash
# Publish @mcp-guardian/core@4.1.7 and @mcp-guardian/plugin-sdk@4.1.7 to repair
# broken @mcp-guardian/server@4.1.7 installs (ETARGET on missing deps).
#
# Requires npm publish access. With 2FA:
#   NPM_OTP=123456 ./scripts/publish-npm-4717-deps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLISH_ARGS=(--access public)
if [[ -n "${NODE_AUTH_TOKEN:-}" ]]; then
  :
elif [[ -n "${NPM_OTP:-}" ]]; then
  PUBLISH_ARGS+=(--otp="$NPM_OTP")
elif [[ -n "${NPM_AUTH_TYPE:-}" ]]; then
  PUBLISH_ARGS+=(--auth-type="$NPM_AUTH_TYPE")
else
  PUBLISH_ARGS+=(--auth-type=web)
fi

TARGET_VERSION="4.1.7"

if npm view "@mcp-guardian/core@${TARGET_VERSION}" version &>/dev/null \
  && npm view "@mcp-guardian/plugin-sdk@${TARGET_VERSION}" version &>/dev/null; then
  echo "Both @mcp-guardian/core@${TARGET_VERSION} and plugin-sdk@${TARGET_VERSION} already on npm."
  exit 0
fi

echo "Building plugin-sdk and core..."
"$ROOT/node_modules/.bin/tsc" --project "$ROOT/packages/plugin-sdk/tsconfig.json"
"$ROOT/node_modules/.bin/tsc" --project "$ROOT/packages/core/tsconfig.json"

publish_at_version() {
  local dir="$1"
  local name
  name=$(node -p "require('./${dir}/package.json').name")
  if npm view "${name}@${TARGET_VERSION}" version &>/dev/null; then
    echo "Skip ${name}@${TARGET_VERSION} (already on npm)"
    return 0
  fi
  echo "Publishing ${name}@${TARGET_VERSION} from ${dir}..."
  (
    cd "$dir"
    cp package.json package.json.publish-bak
    node -e "
      const fs = require('fs');
      const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      p.version = '${TARGET_VERSION}';
      fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
    "
    npm publish "${PUBLISH_ARGS[@]}"
    mv package.json.publish-bak package.json
  )
  node "$ROOT/scripts/wait-npm-registry.mjs" "$name" "$TARGET_VERSION"
}

publish_at_version packages/plugin-sdk
publish_at_version packages/core

echo ""
echo "Verifying @mcp-guardian/server@${TARGET_VERSION} installs..."
node "$ROOT/scripts/verify-npm-registry-install.mjs" "$TARGET_VERSION"

echo "Done — server@${TARGET_VERSION} dependency chain repaired."
