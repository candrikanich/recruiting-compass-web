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
      // Pure helpers under utils/ keep their tests co-located.
      "utils/**/*.test.ts",
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
      // Thresholds set ~1pt below CI-equivalent measurement. Local runs
      // (live Supabase, 9 integration specs) measure slightly higher than CI
      // (no Supabase credentials, those specs skip). 2026-09-02 measurement:
      // functions 75.05% (3897/5192), lines 83.2%, branches 71.2%, stmts 82.2%.
      thresholds: {
        lines: 82,
        functions: 75,
        branches: 69,
        statements: 81,
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
