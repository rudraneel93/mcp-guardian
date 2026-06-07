#!/usr/bin/env bash
# Publish all @mcp-guardian packages in dependency order.
# Server/CLI publish from .tgz; postpack restore runs ONLY after publish so npm
# registry manifest keeps semver deps (not workspace:).
# Requires: npm login (npm whoami). Auth options:
#   NODE_AUTH_TOKEN=... ./scripts/publish-npm-all.sh   # CI automation token
#   NPM_AUTH_TYPE=web ./scripts/publish-npm-all.sh     # browser SSO (recommended)
#   NPM_OTP=123456 ./scripts/publish-npm-all.sh        # 2FA one-time password
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLISH_ARGS=(--access public)
if [[ -n "${NODE_AUTH_TOKEN:-}" ]]; then
  : # setup-node / .npmrc provides auth
  if [[ -n "${PUBLISH_PROVENANCE:-}" ]]; then
    PUBLISH_ARGS+=(--provenance)
  fi
elif [[ -n "${NPM_AUTH_TYPE:-}" ]]; then
  PUBLISH_ARGS+=(--auth-type="$NPM_AUTH_TYPE")
elif [[ -n "${NPM_OTP:-}" ]]; then
  PUBLISH_ARGS+=(--otp="$NPM_OTP")
else
  PUBLISH_ARGS+=(--auth-type=web)
fi

pack_tgz() {
  npm pack --silent 2>/dev/null | grep '\.tgz$' | tail -1
  node "$ROOT/scripts/postpack-npm-deps.mjs" 2>/dev/null || true
}

publish_from_tgz() {
  local pkg_name="$1"
  local version="$2"
  local tgz="$3"
  npm publish "$tgz" "${PUBLISH_ARGS[@]}"
  sleep 3
  node "$ROOT/scripts/verify-npm-registry-manifest.mjs" "$pkg_name" "$version"
}

wait_dep_visible() {
  local pkg_name="$1"
  local version="$2"
  echo "[publish] Waiting for ${pkg_name}@${version} on registry..."
  node "$ROOT/scripts/wait-npm-registry.mjs" "$pkg_name" "$version"
}

echo "npm user: $(npm whoami 2>/dev/null || echo '(token auth)')"
echo "Building workspace packages for publish..."

build_with_tsc() {
  local tsc="$ROOT/node_modules/.bin/tsc"
  if [[ ! -x "$tsc" ]]; then
    echo "ERROR: $tsc not found. Run 'pnpm install' once in the repo when workspace packages are linkable," >&2
    echo "       or ensure packages/*/dist exists before publishing." >&2
    exit 1
  fi
  "$tsc" --project "$ROOT/packages/plugin-sdk/tsconfig.json"
  "$tsc" --project "$ROOT/packages/core/tsconfig.json"
}

if [[ -f packages/plugin-sdk/dist/index.js && -f packages/core/dist/index.js ]]; then
  echo "[publish] Using existing packages/*/dist (delete dist to force rebuild)"
else
  build_with_tsc
fi

SERVER_VERSION=$(node -p "require('./package.json').version")
if ! npm view "@mcp-guardian/server@${SERVER_VERSION}" version &>/dev/null; then
  echo "Building @mcp-guardian/server (full monorepo build)..."
  pnpm install --no-frozen-lockfile
  pnpm run build
  echo "Building dashboard SPA for npm tarball..."
  sh "$ROOT/scripts/build-dashboard-spa.sh"
  if [[ ! -f "$ROOT/deploy/dashboard-spa/out/index.html" ]]; then
    echo "ERROR: deploy/dashboard-spa/out/index.html missing after dashboard build" >&2
    exit 1
  fi
fi

publish_pkg() {
  local dir="$1"
  local name version
  name=$(node -p "require('./${dir}/package.json').name")
  version=$(node -p "require('./${dir}/package.json').version")
  if npm view "${name}@${version}" version &>/dev/null; then
    echo ""
    echo "=== Skip ${name}@${version} (already on npm) ==="
    return 0
  fi
  echo ""
  echo "=== Publishing ${name}@${version} ==="
  (cd "$dir" && npm publish "${PUBLISH_ARGS[@]}")
}

# Publish dependencies first
publish_pkg packages/plugin-sdk
PLUGIN_SDK_VERSION=$(node -p "require('./packages/plugin-sdk/package.json').version")
wait_dep_visible "@mcp-guardian/plugin-sdk" "$PLUGIN_SDK_VERSION"

publish_pkg packages/core
CORE_VERSION=$(node -p "require('./packages/core/package.json').version")
wait_dep_visible "@mcp-guardian/core" "$CORE_VERSION"

# Verify ALL dependencies are visible before server publish
echo ""
echo "[publish] Verifying dependency chain is visible on registry..."
for dep_pkg in "@mcp-guardian/plugin-sdk" "@mcp-guardian/core"; do
  dep_ver="$PLUGIN_SDK_VERSION"
  [[ "$dep_pkg" == "@mcp-guardian/core" ]] && dep_ver="$CORE_VERSION"
  if ! npm view "${dep_pkg}@${dep_ver}" version &>/dev/null; then
    echo "ERROR: ${dep_pkg}@${dep_ver} not on registry — cannot safely publish server@${SERVER_VERSION}" >&2
    echo "This is a critical issue: the server would be unpublishable." >&2
    exit 1
  fi
  echo "  ✓ ${dep_pkg}@${dep_ver} visible on registry"
done

# Publish server package
if npm view "@mcp-guardian/server@${SERVER_VERSION}" version &>/dev/null; then
  echo ""
  echo "=== Skip @mcp-guardian/server@${SERVER_VERSION} (already on npm) ==="
else
  echo ""
  echo "=== Publishing @mcp-guardian/server@${SERVER_VERSION} from tarball ==="
  node scripts/validate-npm-pack.mjs
  SERVER_TGZ=$(pack_tgz)
  echo "[publish] Verifying tarball deps resolve on registry before publish..."
  node "$ROOT/scripts/verify-npm-deps-resolvable.mjs" --local-tgz "$SERVER_TGZ"
  publish_from_tgz "@mcp-guardian/server" "$SERVER_VERSION" "$SERVER_TGZ"
  node scripts/postpack-npm-deps.mjs
  rm -f "$SERVER_TGZ"
fi

# Publish CLI package
CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")
if npm view "@mcp-guardian/cli@${CLI_VERSION}" version &>/dev/null; then
  echo ""
  echo "=== Skip @mcp-guardian/cli@${CLI_VERSION} (already on npm) ==="
else
  echo ""
  echo "=== Publishing @mcp-guardian/cli@${CLI_VERSION} from tarball ==="
  (cd packages/cli && node ../../scripts/validate-npm-pack.mjs)
  CLI_TGZ=$(cd packages/cli && pack_tgz)
  echo "[publish] Verifying CLI tarball deps resolve on registry before publish..."
  node "$ROOT/scripts/verify-npm-deps-resolvable.mjs" --local-tgz "packages/cli/$CLI_TGZ"
  (cd packages/cli && publish_from_tgz "@mcp-guardian/cli" "$CLI_VERSION" "$CLI_TGZ")
  (cd packages/cli && PREPACK_PKG=package.json node ../../scripts/postpack-npm-deps.mjs)
  rm -f "packages/cli/$CLI_TGZ"
fi

# Final verification
if npm view "@mcp-guardian/server@${SERVER_VERSION}" version &>/dev/null; then
  echo ""
  echo "=== Final Verification: Testing registry dependency chain ==="
  node "$ROOT/scripts/verify-npm-deps-resolvable.mjs" "@mcp-guardian/server" "$SERVER_VERSION"
  echo ""
  echo "=== Testing clean registry install ==="
  node "$ROOT/scripts/verify-npm-registry-install.mjs" "$SERVER_VERSION"
fi

echo ""
echo "✓ All packages published successfully!"
echo ""
echo "Verify install:"
echo "  npm install -g @mcp-guardian/server@${SERVER_VERSION}"
echo "  npm view @mcp-guardian/server@${SERVER_VERSION} dependencies"
