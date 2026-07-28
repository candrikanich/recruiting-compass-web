import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

// Plugin to mock SVG and image imports in tests.
// Uses the \0 virtual module prefix so Vite's server.fs.deny check
// (tightened in 7.3.2) never sees these as real filesystem paths.
const mockAssetsPlugin = {
  name: "mock-assets",
  resolveId(id: string) {
    if (/\.(svg|png|jpg|jpeg|gif)$/.test(id)) {
      return "\0" + id;
    }
  },
  load(id: string) {
    if (id.startsWith("\0") && /\.(svg|png|jpg|jpeg|gif)$/.test(id.slice(1))) {
      return `export default "test-asset-stub"`;
    }
  },
};

export default defineConfig({
  plugins: [vue(), mockAssetsPlugin],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],

    // Use glob patterns instead of explicit file list
    include: [
      "tests/unit/**/*.spec.ts",
      "tests/integration/**/*.spec.ts",
      "tests/unit/**/*.test.mjs",
    ],
    exclude: ["node_modules/", "dist/", ".nuxt/", "tests/e2e/**"],

    // Optimize based on environment
    // Local: use 4 workers with isolation for test stability
    // CI: use 2 workers with isolation for stable memory
    maxWorkers: process.env.CI ? 2 : 4,
    isolate: true,
    testTimeout: 10000,
    teardownTimeout: 5000,
    logHeapUsage: process.env.CI ? true : false,

    // Coverage configuration (pragmatic thresholds based on project scope)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      // Raised from 71/69/59/70 per Phase 11 (planning/audit-2026-07-27-findings.md,
      // "6. Testing"): actual coverage after removing 208 tautological tests and
      // adding real coverage for parent-access-control, auth/onboarding, the
      // athlete-access authz helper, all 4 cron jobs, several previously-untested
      // endpoints, and 3 high-risk composables measured at lines 84.07% / functions
      // 76.92% / branches 71.05% / statements 82.99% (npm run test:coverage,
      // 2026-07-28). Set ~1-2pts below that honest floor to catch real regressions
      // without flaking on run-to-run branch-count noise.
      thresholds: {
        lines: 83,
        functions: 76,
        branches: 70,
        statements: 82,
      },
      exclude: [
        "node_modules/",
        "dist/",
        ".nuxt/",
        "tests/",
        "**/*.d.ts",
        "**/index.ts",
        "**/*.config.ts",
        ".vercel/",
      ],
    },
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./", import.meta.url)),
      "#app": fileURLToPath(
        new URL("./node_modules/nuxt/dist/app", import.meta.url),
      ),
      "#": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
