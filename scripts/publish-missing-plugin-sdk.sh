#!/usr/bin/env bash
# Publish missing @mcp-guardian/plugin-sdk versions to fix issue #20
# This resolves the npm dependency resolution error for server@4.1.7

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🚀 Publishing missing @mcp-guardian/plugin-sdk packages"
echo ""

# Check npm auth
echo "📦 Checking npm authentication..."
npm whoami || {
  echo "❌ Not authenticated to npm. Run: npm login"
  exit 1
}

PLUGIN_SDK_VERSION=$(node -p "require('./packages/plugin-sdk/package.json').version")
echo "📋 Publishing @mcp-guardian/plugin-sdk@$PLUGIN_SDK_VERSION"
echo ""

# Build
echo "🔨 Building @mcp-guardian/plugin-sdk..."
tsc --project packages/plugin-sdk/tsconfig.json
echo "✓ Build complete"
echo ""

# Publish
echo "📤 Publishing to npm..."
cd packages/plugin-sdk
npm publish --access public
cd "$ROOT"
echo "✓ Published"
echo ""

# Wait for visibility
echo "⏳ Waiting for registry replication (up to 2 minutes)..."
node "$ROOT/scripts/wait-npm-registry.mjs" "@mcp-guardian/plugin-sdk" "$PLUGIN_SDK_VERSION"
echo ""

# Verify both deps are now available
echo "🔍 Verifying dependency chain..."
CORE_VERSION=$(node -p "require('./packages/core/package.json').version")

if npm view "@mcp-guardian/core@$CORE_VERSION" version &>/dev/null; then
  echo "✓ @mcp-guardian/core@$CORE_VERSION available"
else
  echo "⚠️  @mcp-guardian/core@$CORE_VERSION NOT found - server install may still fail"
fi

if npm view "@mcp-guardian/plugin-sdk@$PLUGIN_SDK_VERSION" version &>/dev/null; then
  echo "✓ @mcp-guardian/plugin-sdk@$PLUGIN_SDK_VERSION available"
else
  echo "❌ @mcp-guardian/plugin-sdk@$PLUGIN_SDK_VERSION still not visible!"
  exit 1
fi
echo ""

# Test server@4.1.7 install
echo "🧪 Testing clean install of @mcp-guardian/server@4.1.7..."
node "$ROOT/scripts/verify-npm-registry-install.mjs" "4.1.7"
echo ""

echo "✅ Issue #20 should now be fixed!"
echo ""
echo "Verify with:"
echo "  npm install --ignore-scripts --no-audit --no-fund @mcp-guardian/server@4.1.7"
