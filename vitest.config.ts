import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

// Plugin to mock SVG and image imports in tests
const mockAssetsPlugin = {
  name: "mock-assets",
  resolveId(id) {
    if (/\.(svg|png|jpg|jpeg|gif)$/.test(id)) {
      return id;
    }
  },
  load(id) {
    if (/\.(svg|png|jpg|jpeg|gif)$/.test(id)) {
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
    include: ["tests/unit/**/*.spec.ts", "tests/integration/**/*.spec.ts"],
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
      thresholds: {
        lines: 71,
        functions: 69,
        branches: 59,
        statements: 70,
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
