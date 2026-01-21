# Build Optimization Implementation Guide

**Companion to:** BUILD_ANALYSIS.md
**Target Audience:** Developers implementing optimizations

---

## 1. TailwindCSS Optimization - Step-by-Step

### Step 1: Audit Current CSS

```bash
# Check current entry CSS size
du -h .nuxt/dist/client/_nuxt/entry.*.css

# Expected: 66 KB (10.73 KB gzipped)
# Target after optimization: 20-25 KB gzipped
```

### Step 2: Verify Tailwind Configuration

**Current state** (`tailwind.config.js`):
```javascript
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./nuxt.config.{js,ts}",
  ],
  theme: {
    extend: {},  // No extensions = all default utilities
  },
  plugins: [],
};
```

**Verification checklist:**
- ✓ Content paths are correct (covers all component/page files)
- ✓ No plugins loaded
- ✓ Theme is minimal (good)

**Issue:** Large utility set likely due to unused utilities. Solution below.

### Step 3: Implement SafeList for Dynamic Classes

If any components use dynamic Tailwind classes (e.g., `bg-${color}-500`):

```javascript
// tailwind.config.js
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./nuxt.config.{js,ts}",
  ],

  // Add safelist for any dynamic classes
  safelist: [
    {
      pattern: /bg-(blue|red|green|yellow|purple)-(500|600|700)/,
    },
    {
      pattern: /text-(blue|red|green|yellow|purple)-(500|600|700)/,
    },
  ],

  theme: {
    extend: {
      // Only add what's actually needed
      colors: {
        // If using custom colors
      },
      spacing: {
        // If using custom spacing
      },
    },
  },
  plugins: [],
};
```

### Step 4: Audit CSS Imports

Check what's being imported where:

```bash
# Search for CSS imports in project
grep -r "@import\|import.*\.css" src/ components/ pages/ 2>/dev/null

# Expected output shows:
# nuxt.config.ts imports assets/css/main.css
# Assets may have redundant styles
```

**Verify assets/css structure:**
```bash
ls -lh assets/css/
ls -lh assets/styles/
```

Output expected:
```
assets/css/main.css          # Primary CSS (should import others)
assets/styles/theme.css      # Semantic colors (merge into main.css)
assets/styles/main.css       # Duplicate? Remove or consolidate
assets/styles/transitions.css # Animations (merge into main.css)
```

### Step 5: Consolidate CSS Files

**Create unified assets/css/main.css:**

```css
/* assets/css/main.css */

/* Theme tokens - colors, spacing, typography */
@import './theme.css';

/* Transitions and animations */
@import './transitions.css';

/* Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global component styles */
/* (Prefer scoped <style> in components instead) */
```

**Remove duplicate main.css if exists:**
```bash
rm assets/styles/main.css  # If duplicate of assets/css/main.css
```

**Update nuxt.config.ts** (verify import):
```typescript
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],  // Single entry point
  // ... rest of config
})
```

### Step 6: Verify Component-Scoped Styles

All component-specific styles should use `<style scoped>`:

```vue
<!-- ✓ Good: Scoped styles -->
<template>
  <div class="card">Content</div>
</template>

<style scoped>
.card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>

<!-- ✗ Bad: Global CSS for component-only styles -->
<template>
  <div class="my-special-card">Content</div>
</template>

<!-- This goes in global CSS, affecting bundle size -->
```

**Audit existing components** (optional but thorough):
```bash
# Find all <style> blocks without scoped attribute
grep -r "<style>" components/ pages/ --include="*.vue" | grep -v "scoped"

# Result: If any found, add scoped attribute
```

### Step 7: Measure Impact

```bash
# Clean build
rm -rf .nuxt .output .vite

# Build and measure
npm run build

# Check entry CSS size
du -h .nuxt/dist/client/_nuxt/entry.*.css

# Compare:
# Before: 66 KB (10.73 KB gzipped)
# After: Goal 20-25 KB (5-7 KB gzipped)
```

**Success Criteria:** 50-60% reduction in entry CSS

---

## 2. Vite Caching Implementation

### Local Development Cache

**Add to nuxt.config.ts:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  ssr: false,

  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt"],

  // NEW: Vite caching configuration
  vite: {
    // Cache directory (add to .gitignore; already done via .nuxt entry)
    cacheDir: '.vite',

    // Pre-bundle frequently used dependencies
    optimizeDeps: {
      include: [
        'vue',
        '@pinia/nuxt',
        '@supabase/supabase-js',
        'chart.js',
        'fuse.js',
        'leaflet',
        '@vueuse/core'
      ],
      exclude: [
        // Exclude large libs that change often
        'html2canvas',
        'jspdf',
        'jspdf-autotable'
      ]
    }
  },

  nitro: {
    preset: "static",
    hooks: {
      close: async () => {
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

### Update .gitignore

Verify `.vite` is ignored:

```bash
# .gitignore - add if not present
node_modules/
.vite/      # Vite cache - rebuild on every clone
.nuxt/
.output/
```

### Update package.json scripts

```json
{
  "scripts": {
    "dev": "nuxi dev",
    "build": "nuxi generate",
    "build:clean": "rm -rf .nuxt .output .vite && nuxi generate",
    "preview": "nuxi preview",
    "cache:clear": "rm -rf .vite",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "nuxi typecheck",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Measure Caching Impact

```bash
# Test 1: First build (cold cache)
npm run build:clean 2>&1 | tail -5
# Example output: "Generated public .output/public"

# Test 2: Second build (warm cache)
npm run build 2>&1 | tail -5
# Should be faster

# Repeat 5-10 times to see variance
```

**Expected Impact:**
- Cold build: 45-50 sec (unchanged)
- Warm build: 30-35 sec (25-35% improvement)

---

## 3. Code Splitting for Heavy Dependencies

### Step 1: Identify Large Lazy-Loadable Features

Analyze which pages/features use heavy libraries:

```typescript
// Dependency mapping
const dependencies = {
  'Chart.js ecosystem': [
    'chart.js',
    'chartjs-adapter-date-fns',
    'chartjs-plugin-annotation',
    'vue-chartjs'
  ],
  'PDF/Excel generation': [
    'jspdf',
    'jspdf-autotable',
    'html2canvas',
    'xlsx'
  ],
  'Mapping': [
    'leaflet',
    'vue-leaflet',
    '@types/leaflet'
  ],
  'Core': [
    'vue',
    'nuxt',
    '@supabase/supabase-js',
    'pinia'
  ]
}

// Usage pages:
const pages = {
  '/analytics': ['Chart.js ecosystem'],
  '/documents': ['PDF/Excel generation'],
  '/schools/[id]': ['Mapping'],
  'all': ['Core']
}
```

### Step 2: Lazy-Load Chart.js in Composables

**Before (eager import):**
```typescript
// composables/useCoachAnalytics.ts
import Chart from 'chart.js/auto'
import ChartjsPluginAnnotation from 'chartjs-plugin-annotation'

export const useCoachAnalytics = () => {
  const createChart = () => {
    Chart.register(ChartjsPluginAnnotation)
    // ... use Chart
  }
  return { createChart }
}
```

**After (lazy import):**
```typescript
// composables/useCoachAnalytics.ts
export const useCoachAnalytics = () => {
  const createChart = async () => {
    const { default: Chart } = await import('chart.js/auto')
    const { default: Annotation } = await import('chartjs-plugin-annotation')

    Chart.register(Annotation)
    // ... use Chart
  }

  return { createChart }
}
```

**Component usage:**
```vue
<template>
  <div>
    <button @click="loadAndRender">Show Analytics</button>
    <div ref="chartContainer"></div>
  </div>
</template>

<script setup>
const { createChart } = useCoachAnalytics()
const chartContainer = ref(null)

const loadAndRender = async () => {
  const chart = await createChart()
  chart.render(chartContainer.value)
}
</script>
```

### Step 3: Lazy-Load PDF Generation Components

**Create wrapper component:**
```vue
<!-- components/Reports/GenerateReportModal.vue -->
<template>
  <div>
    <GenerateReportDynamic v-if="showReport" @close="showReport = false" />
    <button v-else @click="showReport = true">Generate Report</button>
  </div>
</template>

<script setup>
const showReport = ref(false)

const GenerateReportDynamic = defineAsyncComponent(() =>
  import('./GenerateReportContent.vue')
)
</script>
```

**Actual generation component (only loaded when needed):**
```vue
<!-- components/Reports/GenerateReportContent.vue -->
<template>
  <div>
    <button @click="generatePDF">Export PDF</button>
    <button @click="generateExcel">Export Excel</button>
  </div>
</template>

<script setup>
const generatePDF = async () => {
  const { jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')

  // Generate PDF using dynamically imported libs
  const pdf = new jsPDF()
  // ... PDF generation logic
}

const generateExcel = async () => {
  const XLSX = await import('xlsx')

  // Generate Excel using dynamically imported lib
  XLSX.utils.aoa_to_sheet([...])
}
</script>
```

### Step 4: Lazy-Load Map Features (Optional)

**Before (map always included):**
```vue
<template>
  <LMap></LMap>
</template>

<script setup>
import LMap from 'vue-leaflet'
</script>
```

**After (map loads on demand):**
```vue
<template>
  <div>
    <button v-if="!showMap" @click="showMap = true">Show Map</button>
    <MapComponent v-else />
  </div>
</template>

<script setup>
const showMap = ref(false)

const MapComponent = defineAsyncComponent(() =>
  import('./SchoolMap.vue')
)
</script>
```

### Step 5: Verify Bundle Split

After implementing lazy loading:

```bash
npm run build

# Check if new chunks created
ls -lh .nuxt/dist/client/_nuxt/*.js | wc -l

# Should be more chunks (lazy-loaded separately)
# Compare top bundles before/after
ls -lhS .nuxt/dist/client/_nuxt/*.js | head -10
```

**Expected Impact:**
- Top bundle size reduced by 20-30 KB (chart.js moved to separate chunk)
- Better caching (initial load doesn't download charts chunk if not needed)

---

## 4. Build Cache Configuration - Netlify

### Create netlify.toml

```toml
[build]
  command = "npm run build"
  publish = ".output/public"

[build.cache]
  # Cache directories that speed up builds
  "node_modules" = "node_modules"
  "node_modules/.vite" = "node_modules/.vite"
  ".nuxt" = ".nuxt"
  ".vite" = ".vite"

[build.processing]
  skip_go = true
  skip_processing = false

[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "/_nuxt/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Verify in Netlify UI

1. Deploy with `netlify.toml` in root
2. Check build logs: "Cache restored from..."
3. Compare build time: first deploy vs. subsequent

**Expected:** Subsequent deploys 15-25 seconds faster

---

## 5. Dependency Audit & Cleanup

### Audit Each Heavy Dependency

```bash
# Check why each heavy lib is needed
npm why chart.js        # Used in analytics pages
npm why html2canvas     # Used in PDF generation
npm why leaflet         # Used in school maps
npm why jspdf           # Used in document export
npm why xlsx            # Used in spreadsheet export
npm why @sindresorhus/is  # Type checking utility

# Output shows dependency tree - helps understand if truly needed
```

### Identify Unused Dependencies

```bash
# Install and run depcheck (optional utility)
npm install -D depcheck

# Run analysis
npx depcheck

# Review output for unused dependencies
```

### Remove Unused or Replace

**Example: If @sindresorhus/is is not used:**
```bash
npm uninstall @sindresorhus/is
```

**Example: If type checking is minimal, use native checks:**
```typescript
// Before (requires @sindresorhus/is)
import is from '@sindresorhus/is'
if (is.string(value)) { ... }

// After (native TypeScript/JavaScript)
if (typeof value === 'string') { ... }
```

### Document Dependency Rationale

Add to project docs:

```markdown
## Dependency Justification

**Heavy dependencies (careful additions):**
- `chart.js` (50 KB) - Used for analytics dashboards
- `jspdf` (30 KB) - Used for PDF report generation
- `html2canvas` (50 KB) - Used for screenshot-based PDF reports
- `leaflet` (40 KB) - Used for school location mapping
- `xlsx` (50 KB) - Used for spreadsheet export

**No new heavy deps without discussion**
```

---

## 6. CSS File Consolidation

### Audit Current CSS Files

```bash
# List CSS files
find assets -name "*.css" -type f

# Output expected:
# assets/css/main.css
# assets/styles/theme.css
# assets/styles/main.css (if exists)
# assets/styles/transitions.css
```

### Check for Duplicates

```bash
# Check content of each file
wc -l assets/css/main.css
wc -l assets/styles/main.css     # Remove if duplicate
wc -l assets/styles/theme.css
wc -l assets/styles/transitions.css

# Search for duplicate declarations
grep -h "^[^/]" assets/css/*.css assets/styles/*.css | sort | uniq -d
```

### Consolidate Files

**Step 1: Inspect imports in assets/css/main.css**
```bash
head -20 assets/css/main.css
```

Expected: Should have @tailwind directives or @import statements

**Step 2: Merge theme.css content into main.css**
```bash
# View theme.css
cat assets/styles/theme.css

# Append to main.css (with comments)
echo "

/* ===== THEME TOKENS ===== */
" >> assets/css/main.css
cat assets/styles/theme.css >> assets/css/main.css
```

**Step 3: Merge transitions.css**
```bash
echo "

/* ===== TRANSITIONS & ANIMATIONS ===== */
" >> assets/css/main.css
cat assets/styles/transitions.css >> assets/css/main.css
```

**Step 4: Remove now-unused files (after verifying nuxt.config only imports assets/css/main.css)**
```bash
rm assets/styles/theme.css
rm assets/styles/transitions.css
rm assets/styles/main.css  # If duplicate
```

**Step 5: Verify nuxt.config.ts**
```typescript
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],  // Single entry point
})
```

### Measure Impact

```bash
npm run build
du -h .nuxt/dist/client/_nuxt/entry.*.css

# Should see modest savings from deduplication (5-10% CSS reduction)
```

---

## 7. Image & Asset Optimization

### Audit Current Assets

```bash
# Find all images in public
find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.gif" \)

# Find images in assets
find assets -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.gif" \)

# Check sizes
du -sh public/
du -sh assets/
```

### Convert PNG to WebP (if needed)

```bash
# Install imagemin tools (optional)
npm install -D @squoosh/lib

# Or use online converter for critical images
# Example: school logos, avatars
```

### Compress SVGs

```bash
# Install svgo
npm install -D svgo

# Compress all SVGs
npx svgo public/**/*.svg assets/**/*.svg

# Or for single file
npx svgo public/logo.svg
```

### Configure Image Loading

**If using @nuxt/image:**
```bash
npm install @nuxt/image
```

**Update nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/image', '@pinia/nuxt'],

  image: {
    format: ['webp', 'jpeg'],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 1024,
      lg: 1280,
    }
  }
})
```

**Use in components:**
```vue
<template>
  <NuxtImg src="/school-logo.png" width="200" height="200" />
</template>
```

---

## 8. Test Infrastructure Optimization

### Update vitest.config.ts

**Before (restricted to CI):**
```typescript
test: {
  maxWorkers: 2,
  isolate: true,
  // Explicit file list - brittle
  include: [
    'tests/unit/composables/useSearch.spec.ts',
    // ... 35 more files
  ],
}
```

**After (glob-based, flexible):**
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],

    // Use glob patterns instead of explicit list
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/integration/**/*.spec.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.nuxt/',
      'tests/e2e/**',
    ],

    // Optimize based on environment
    maxWorkers: process.env.CI ? 2 : 8,
    minWorkers: 1,
    isolate: process.env.CI ? true : false,

    testTimeout: 10000,
    teardownTimeout: 5000,
    logHeapUsage: process.env.CI ? true : false,
  },

  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '#app': fileURLToPath(new URL('./node_modules/nuxt/dist/app', import.meta.url)),
      '#': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
```

### Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest --run --reporter=verbose",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Measure Impact

```bash
# Local test run (should use 8 workers)
npm run test

# Expected: 30-40% faster than before (2 workers)

# CI test run (should use 2 workers)
CI=true npm run test:ci

# Expected: Unchanged (conservative)
```

---

## 9. E2E Test Browser Optimization

### Update playwright.config.ts

**Before (always 3 browsers):**
```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
]
```

**After (conditional based on environment):**
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only run Firefox/WebKit in CI
    ...(process.env.CI ? [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] }
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] }
      }
    ] : [])
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### Update package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:all": "playwright test",  // When you want all 3 browsers
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:chromium": "playwright test --project=chromium"
  }
}
```

### Local Workflow

```bash
# Default: run Chromium only (fast)
npm run test:e2e

# Full suite: all 3 browsers
CI=true npm run test:e2e:all

# Interactive debugging
npm run test:e2e:ui
```

**Expected Impact:**
- Local E2E runs: 66% faster (1 browser instead of 3)
- CI runs: Unchanged (still all 3 browsers)

---

## 10. Build Performance Monitoring

### Create measurement script

**Create scripts/measure-build.sh:**
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

**Make executable:**
```bash
chmod +x scripts/measure-build.sh
```

### Add to package.json

```json
{
  "scripts": {
    "perf:measure": "bash scripts/measure-build.sh",
    "perf:baseline": "bash scripts/measure-build.sh | tee .perf-baseline.txt",
    "perf:compare": "bash scripts/measure-build.sh > .perf-current.txt && diff -u .perf-baseline.txt .perf-current.txt || true"
  }
}
```

### Usage

```bash
# Establish baseline before optimizations
npm run perf:baseline

# After optimizations, compare
npm run perf:compare

# Or just measure
npm run perf:measure
```

---

## 11. Rollback & Validation Checklist

After each optimization, validate:

### Pre-Optimization

- [ ] Create git branch: `git checkout -b optimize/css-tailwind`
- [ ] Document baseline metrics in commit message
- [ ] Run all tests: `npm run test && npm run test:e2e`

### Post-Optimization

- [ ] Rebuild: `npm run build`
- [ ] Measure: `npm run perf:measure`
- [ ] Test all pages in dev: `npm run dev` (manual check)
- [ ] Run unit tests: `npm run test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Check browser console for errors
- [ ] Verify bundle sizes improved

### Rollback if Issues Found

```bash
# If issues found, rollback
git checkout -- .  # Discard changes
rm -rf .nuxt .output .vite
npm install  # If package.json was modified
npm run build
```

---

## 12. Success Criteria Checklist

Track completion as you implement:

- [ ] **CSS Optimization**
  - [ ] Entry CSS: 66 KB → 20-25 KB gzipped
  - [ ] All scoped styles verified
  - [ ] TailwindCSS safelist configured
  - [ ] No duplicate CSS files

- [ ] **Caching Implementation**
  - [ ] Vite cache configured in nuxt.config
  - [ ] Netlify build cache configured in netlify.toml
  - [ ] .vite/ in .gitignore
  - [ ] Cold build time: ~45-50 sec
  - [ ] Warm build time: ~30-35 sec

- [ ] **Code Splitting**
  - [ ] Chart.js lazy-loaded
  - [ ] PDF libs lazy-loaded
  - [ ] Map component lazy-loaded
  - [ ] Top bundle size < 300 KB

- [ ] **Test Optimization**
  - [ ] Vitest using glob patterns
  - [ ] Local tests: 8 workers, no isolation
  - [ ] CI tests: 2 workers, with isolation
  - [ ] E2E tests: chromium by default
  - [ ] CI E2E: all 3 browsers

- [ ] **Monitoring**
  - [ ] scripts/measure-build.sh created
  - [ ] Baseline metrics documented
  - [ ] package.json has perf scripts

---

## Support & Troubleshooting

### Common Issues

**Issue: Build fails after CSS consolidation**
```
Error: Cannot find module './theme.css'
```
**Solution:**
- Check that @import paths in assets/css/main.css are correct
- Use relative paths: `@import './theme.css'` not `@import 'theme.css'`

**Issue: Styles disappear after TailwindCSS optimization**
```
Components styled with Tailwind classes show no styling
```
**Solution:**
- Verify content paths in tailwind.config.js match all component/page files
- Clear cache: `rm -rf .nuxt .vite`
- Rebuild: `npm run build`

**Issue: Lazy-loaded components show blank**
```
defineAsyncComponent(() => import('./Component.vue')) shows loading but never loads
```
**Solution:**
- Check browser console for module loading errors
- Verify component path is correct and exists
- Add suspense boundary: `<Suspense><template #fallback>Loading...</template>`

**Issue: Cache not improving build time**
```
Second build still takes 45 seconds
```
**Solution:**
- Verify .vite directory exists and has content: `ls -la .vite/`
- Check if changing a large file (like package.json) invalidates cache
- Try clearing cache and rebuilding: `npm run build:clean`

### Debug Commands

```bash
# Check Vite cache
ls -la .vite/

# Check if CSS was optimized
npm run build 2>&1 | grep -i "entry\|css"

# Check bundle analysis
ls -lhS .nuxt/dist/client/_nuxt/*.js | head -20

# Measure build time precisely
time npm run build > /dev/null 2>&1

# Check if tests are using multiple workers
npm run test 2>&1 | grep -i "workers\|threads"
```

---

## Final Validation

After implementing all optimizations:

```bash
# 1. Clean build & measure
npm run build:clean && npm run perf:measure

# 2. Run all tests
npm run test && npm run test:e2e

# 3. Check for any console errors or warnings
npm run dev &  # Start dev server
# Manually visit a few pages, check console

# 4. Verify metrics meet targets
# CSS: < 25 KB gzipped ✓
# Build: < 40 sec (cold), < 35 sec (warm) ✓
# Bundles: largest < 300 KB ✓
# Tests: fast enough for local dev ✓
```

When all green, commit and create PR with detailed metrics in commit message.
