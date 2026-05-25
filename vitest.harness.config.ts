import { defineConfig } from 'vitest/config';
import path from 'path';

/** Adversarial harness Node tests — run via `pnpm harness:node`, not default `pnpm test`. */
export default defineConfig({
  resolve: {
    alias: {
      '@mcp-guardian/plugin-sdk': path.resolve(__dirname, 'packages/plugin-sdk/dist/index.js'),
    },
  },
  test: {
    setupFiles: ['./tests/setup-env.ts'],
    include: ['adversarial-harness/node/**/*.{test,spec}.mjs'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    maxConcurrency: 1,
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 60_000,
  },
});
