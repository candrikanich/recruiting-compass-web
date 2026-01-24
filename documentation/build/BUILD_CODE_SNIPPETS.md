# Build Optimization - Copy-Paste Code Snippets

Ready-to-use code for implementing optimizations.

---

## 1. TailwindCSS Optimization

### Updated tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./nuxt.config.{js,ts}",
  ],

  // Add if using dynamic classes
  safelist: [
    {
      pattern:
        /bg-(blue|red|green|yellow|purple|gray)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern:
        /text-(blue|red|green|yellow|purple|gray)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern:
        /border-(blue|red|green|yellow|purple|gray)-(50|100|200|300|400|500|600|700|800|900)/,
    },
  ],

  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

## 2. Vite Caching Configuration

### Updated nuxt.config.ts (FULL FILE)

```typescript
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  ssr: false,

  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt"],

  // NEW: Vite caching configuration
  vite: {
    // Cache directory for faster builds
    cacheDir: ".vite",

    // Pre-bundle frequently used dependencies
    optimizeDeps: {
      include: [
        "vue",
        "@pinia/nuxt",
        "@supabase/supabase-js",
        "chart.js",
        "fuse.js",
        "leaflet",
        "@vueuse/core",
        "date-fns",
      ],
      exclude: [
        // These are heavy or change often; exclude for rebunding on change
        "html2canvas",
        "jspdf",
        "jspdf-autotable",
      ],
    },
  },

  nitro: {
    preset: "static",
    hooks: {
      close: async () => {
        // Force process exit after prerender completes
        process.exit(0);
      },
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
  },
});
```

---

## 3. Build Cache - Netlify Configuration

### Create netlify.toml (NEW FILE in root)

```toml
[build]
  command = "npm run build"
  publish = ".output/public"
  node_version = "20"

[build.cache]
  # Cache entire node_modules to avoid reinstall
  "node_modules" = "node_modules"

  # Cache Vite dependency optimization
  "node_modules/.vite" = "node_modules/.vite"

  # Cache Nuxt build artifacts
  ".nuxt" = ".nuxt"

  # Cache Vite internal cache
  ".vite" = ".vite"

[build.processing]
  skip_go = true
  skip_processing = false

# Browser cache headers
[[headers]]
  for = "/*"
  [headers.values]
    # Cache index.html briefly to catch new deployments
    Cache-Control = "public, max-age=3600"

# Cache Nuxt chunks permanently (content-hashed)
[[headers]]
  for = "/_nuxt/*"
  [headers.values]
    # Long cache for hashed assets
    Cache-Control = "public, max-age=31536000, immutable"

# Don't cache redirects config
[[headers]]
  for = "/_redirects"
  [headers.values]
    Cache-Control = "public, max-age=0"
```

---

## 4. Lazy-Load Chart.js

### Before: composables/useCoachAnalytics.ts (EAGER)

```typescript
import Chart from "chart.js/auto";
import ChartjsPluginAnnotation from "chartjs-plugin-annotation";

export const useCoachAnalytics = () => {
  const createChart = (canvasRef: HTMLCanvasElement) => {
    Chart.register(ChartjsPluginAnnotation);

    const chart = new Chart(canvasRef, {
      type: "line",
      data: {
        /* ... */
      },
      options: {
        /* ... */
      },
    });

    return chart;
  };

  return { createChart };
};
```

### After: composables/useCoachAnalytics.ts (LAZY)

```typescript
export const useCoachAnalytics = () => {
  const createChart = async (canvasRef: HTMLCanvasElement) => {
    // Import only when needed
    const { default: Chart } = await import("chart.js/auto");
    const { default: Annotation } = await import("chartjs-plugin-annotation");

    Chart.register(Annotation);

    const chart = new Chart(canvasRef, {
      type: "line",
      data: {
        /* ... */
      },
      options: {
        /* ... */
      },
    });

    return chart;
  };

  return { createChart };
};
```

### Usage in Component

```vue
<template>
  <div>
    <button @click="loadAnalytics" v-if="!loaded">Load Analytics</button>
    <div v-else ref="chartContainer"></div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useCoachAnalytics } from "~/composables/useCoachAnalytics";

const loaded = ref(false);
const chartContainer = ref(null);
const { createChart } = useCoachAnalytics();

const loadAnalytics = async () => {
  const chart = await createChart(chartContainer.value);
  loaded.value = true;
};
</script>
```

---

## 5. Lazy-Load PDF Generation

### Before: Component (EAGER)

```vue
<template>
  <button @click="generatePDF">Export PDF</button>
</template>

<script setup>
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const generatePDF = async () => {
  const canvas = await html2canvas(document.body);
  const pdf = new jsPDF();
  pdf.addImage(canvas.toDataURL(), "PNG", 0, 0);
  pdf.save("report.pdf");
};
</script>
```

### After: Wrapper Component (LAZY)

```vue
<!-- pages/documents/index.vue -->
<template>
  <div>
    <button v-if="!showExport" @click="showExport = true">Export Report</button>
    <ExportModalLazy v-else @close="showExport = false" />
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from "vue";

const showExport = ref(false);

// Only load PDF libs when export modal is opened
const ExportModalLazy = defineAsyncComponent(
  () => import("~/components/Reports/ExportModal.vue"),
);
</script>
```

### Actual Export Component

```vue
<!-- components/Reports/ExportModal.vue -->
<template>
  <div class="modal">
    <button @click="generatePDF" class="btn-primary">Export PDF</button>
    <button @click="generateExcel" class="btn-secondary">Export Excel</button>
  </div>
</template>

<script setup>
const emit = defineEmits(["close"]);

const generatePDF = async () => {
  // Lazy import only when user clicks
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(document.body);
  const pdf = new jsPDF();
  pdf.addImage(canvas.toDataURL(), "PNG", 0, 0);
  pdf.save("report.pdf");

  emit("close");
};

const generateExcel = async () => {
  // Lazy import only when user clicks
  const XLSX = (await import("xlsx")).default;

  const worksheet = XLSX.utils.json_to_sheet([
    { name: "John", email: "john@example.com" },
    { name: "Jane", email: "jane@example.com" },
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Coaches");
  XLSX.write(workbook, { bookType: "xlsx", type: "binary" });

  emit("close");
};
</script>
```

---

## 6. Lazy-Load Map Component

### Before: App.vue (EAGER)

```vue
<template>
  <LMap :zoom="13" :center="[51.505, -0.09]">
    <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <LMarker :lat-lng="[51.5, -0.09]" />
  </LMap>
</template>

<script setup>
import { LMap, LTileLayer, LMarker } from "vue-leaflet";
</script>
```

### After: Page Component (LAZY)

```vue
<template>
  <div>
    <button v-if="!showMap" @click="showMap = true" class="btn">
      Show School Locations
    </button>

    <Suspense v-else>
      <SchoolMapLazy @close="showMap = false" />
      <template #fallback>
        <div class="p-4 text-center">Loading map...</div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from "vue";

const showMap = ref(false);

// Only load leaflet when map is requested
const SchoolMapLazy = defineAsyncComponent(
  () => import("~/components/Schools/SchoolMap.vue"),
);
</script>
```

### Actual Map Component

```vue
<!-- components/Schools/SchoolMap.vue -->
<template>
  <div class="map-container">
    <LMap :zoom="13" :center="[40, -95]">
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <LMarker
        v-for="school in schools"
        :key="school.id"
        :lat-lng="[school.lat, school.lon]"
      >
        <LPopup>{{ school.name }}</LPopup>
      </LMarker>
    </LMap>
  </div>
</template>

<script setup>
import { LMap, LTileLayer, LMarker, LPopup } from "vue-leaflet";
import { useSchools } from "~/composables/useSchools";

const { schools } = useSchools();
</script>

<style scoped>
.map-container {
  height: 600px;
  width: 100%;
}
</style>
```

---

## 7. Updated vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],

    // Use glob patterns instead of explicit file list
    include: ["tests/unit/**/*.spec.ts", "tests/integration/**/*.spec.ts"],
    exclude: ["node_modules/", "dist/", ".nuxt/", "tests/e2e/**"],

    // Optimize based on environment
    // Local: use 8 workers, no isolation = fast
    // CI: use 2 workers, with isolation = stable memory
    maxWorkers: process.env.CI ? 2 : 8,
    minWorkers: 1,
    isolate: process.env.CI ? true : false,

    testTimeout: 10000,
    teardownTimeout: 5000,
    logHeapUsage: process.env.CI ? true : false,
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
```

---

## 8. Updated playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
  },

  projects: [
    // Always run Chromium
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // Only run Firefox/WebKit in CI (or with FULL_TESTS=1)
    ...(process.env.CI || process.env.FULL_TESTS
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3003",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 9. Updated package.json (SCRIPTS SECTION)

```json
{
  "scripts": {
    "dev": "nuxi dev",
    "build": "nuxi generate",
    "build:clean": "rm -rf .nuxt .output .vite && nuxi generate",
    "preview": "nuxi preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "nuxi typecheck",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest --run --reporter=verbose",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:full": "FULL_TESTS=1 playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:chromium": "playwright test --project=chromium",
    "perf:measure": "bash scripts/measure-build.sh",
    "perf:baseline": "bash scripts/measure-build.sh | tee .perf-baseline.txt",
    "perf:compare": "bash scripts/measure-build.sh > .perf-current.txt && diff -u .perf-baseline.txt .perf-current.txt || true",
    "cache:clear": "rm -rf .vite"
  }
}
```

---

## 10. Consolidated CSS File

### Create unified assets/css/main.css

```css
/* ===== TAILWIND DIRECTIVES ===== */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ===== DESIGN TOKENS & THEME ===== */
:root {
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;
}

/* ===== TRANSITIONS & ANIMATIONS ===== */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn var(--transition-normal);
}

.slide-in-up {
  animation: slideInUp var(--transition-normal);
}

/* ===== GLOBAL COMPONENT STYLES ===== */
/* (Prefer scoped <style> in components instead) */

body {
  @apply bg-gray-50 text-gray-900;
}

/* Remove from here - use component scoped styles instead */
```

### Then delete these files:

```bash
rm assets/styles/theme.css
rm assets/styles/transitions.css
rm assets/styles/main.css  # If exists as duplicate
```

---

## 11. Build Measurement Script

### Create scripts/measure-build.sh

```bash
#!/bin/bash
# Build performance measurement script

echo "════════════════════════════════════════"
echo "Build Performance Measurement"
echo "════════════════════════════════════════"
echo ""

# Test 1: Cold build
echo "1. Cold Build (no cache)"
echo "   Clearing cache: .nuxt .output .vite"
rm -rf .nuxt .output .vite 2>/dev/null

echo "   Building..."
BUILD_START=$(date +%s%3N)
npm run build > /tmp/build.log 2>&1
BUILD_END=$(date +%s%3N)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo "   Build time: ${BUILD_TIME}ms"
echo ""

# Test 2: Incremental build
echo "2. Incremental Build (with cache)"
echo "   Building..."
BUILD_START=$(date +%s%3N)
npm run build > /tmp/build.log 2>&1
BUILD_END=$(date +%s%3N)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo "   Build time: ${BUILD_TIME}ms"
echo ""

# Test 3: Bundle sizes
echo "3. Bundle Sizes"
CLIENT_SIZE=$(du -sh .nuxt/dist/client 2>/dev/null | awk '{print $1}')
OUTPUT_SIZE=$(du -sh .output/public 2>/dev/null | awk '{print $1}')
CSS_SIZE=$(ls -lh .nuxt/dist/client/_nuxt/entry.*.css 2>/dev/null | awk '{print $5}')

echo "   Client bundle: ${CLIENT_SIZE}"
echo "   Final output: ${OUTPUT_SIZE}"
echo "   Entry CSS: ${CSS_SIZE}"
echo ""

# Test 4: Largest bundles
echo "4. Top 10 Largest JS Bundles"
ls -lhS .nuxt/dist/client/_nuxt/*.js 2>/dev/null | head -10 | awk '{printf "   %s  %s\n", $5, $9}' | sed 's|.*/||'
echo ""

echo "════════════════════════════════════════"
```

### Make executable:

```bash
chmod +x scripts/measure-build.sh
```

---

## 12. Consolidated nuxt.config.ts (COMPLETE FILE)

```typescript
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  ssr: false,

  // Single CSS entry point (consolidated)
  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt"],

  // Vite optimization and caching
  vite: {
    // Use filesystem cache for faster rebuilds
    cacheDir: ".vite",

    // Pre-optimize dependencies
    optimizeDeps: {
      include: [
        "vue",
        "@pinia/nuxt",
        "@supabase/supabase-js",
        "chart.js",
        "fuse.js",
        "leaflet",
        "@vueuse/core",
        "date-fns",
        "autoprefixer",
      ],
      exclude: ["html2canvas", "jspdf", "jspdf-autotable"],
    },
  },

  nitro: {
    preset: "static",
    hooks: {
      close: async () => {
        // Force process exit after prerender completes
        process.exit(0);
      },
    },
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
  },
});
```

---

## Quick Implementation Checklist

Copy-paste ready checklist for tracking implementation:

```markdown
## Build Optimization Implementation

### Phase 1: Quick Wins (Week 1)

- [ ] Update `nuxt.config.ts` with Vite caching
- [ ] Update `tailwind.config.js` with safelist
- [ ] Create `netlify.toml` with build cache
- [ ] Implement lazy Chart.js import (composables)
- [ ] Implement lazy PDF libs (components)
- [ ] Run `npm run perf:measure` and document baseline

### Phase 2: Consolidation (Week 2)

- [ ] Create consolidated `assets/css/main.css`
- [ ] Delete redundant CSS files
- [ ] Update `vitest.config.ts` with glob patterns
- [ ] Run full test suite: `npm run test && npm run test:e2e`
- [ ] Run `npm run perf:measure` and compare

### Phase 3: Architecture (Week 3+)

- [ ] Create build measurement script (`scripts/measure-build.sh`)
- [ ] Add perf scripts to package.json
- [ ] Document CSS architecture guidelines
- [ ] Optional: Lazy-load Leaflet map
- [ ] Optional: Image optimization setup

### Validation

- [ ] All tests passing locally
- [ ] All tests passing in CI
- [ ] Bundle sizes improved
- [ ] Build times improved (warm cache)
- [ ] No console errors in browser
- [ ] No TypeScript errors
```

---

## Troubleshooting Quick Answers

**Q: My styles disappeared after CSS consolidation**
A: Check that @import paths in main.css are relative paths, not absolute.

```css
/* ✗ Wrong */
@import "theme.css" /* ✓ Correct */ @import "./theme.css";
```

**Q: Lazy-loaded components show blank**
A: Add Suspense with fallback:

```vue
<Suspense>
  <template #default>
    <HeavyComponent />
  </template>
  <template #fallback>
    <LoadingSpinner />
  </template>
</Suspense>
```

**Q: Build not using Vite cache**
A: Clear cache and rebuild:

```bash
rm -rf .vite .nuxt .output
npm run build
```

**Q: Tests running slowly**
A: Verify config uses 8 workers locally:

```bash
npm run test 2>&1 | grep -i worker
# Should show: workers (8) or maxWorkers (8)
```

---

## Verification Commands (Copy-Paste)

```bash
# 1. Measure baseline
npm run perf:measure

# 2. Verify CSS optimized
du -h .nuxt/dist/client/_nuxt/entry.*.css

# 3. Check largest bundles
ls -lhS .nuxt/dist/client/_nuxt/*.js | head -10

# 4. Run all tests
npm run test && npm run test:e2e

# 5. Type check
npm run type-check

# 6. Lint
npm run lint

# 7. Measure again (should show improvements)
npm run perf:measure
```

Ready to implement! Start with the TailwindCSS optimization (highest ROI, lowest effort).
