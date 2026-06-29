// vitest.integration.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// Separate Vitest project for integration tests.
// Key differences from vitest.config.ts (the unit test config):
//   - No repository/Prisma mocking — talks to a real ephemeral Postgres
//   - Runs serially (no parallel test files) to avoid race conditions on
//     shared tables between test files
//   - Longer default timeout (DB roundtrips are slower than mocked calls)
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/integration/**/*.test.ts"],
    setupFiles: ["./src/__tests__/integration/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Run files sequentially — they share one database and truncate between tests
    fileParallelism: false,
    isolate: false,
    maxWorkers: 1,
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
    },
  },
});