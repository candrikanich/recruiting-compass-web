# Build Performance Analysis: Recruiting Compass Web

**Date:** January 20, 2026
**Project:** Baseball Recruiting Tracker (Nuxt 3 / Vue 3 / Vite)
**Current Build Tool:** Nuxt 3.20.2 with Vite 7.3.1

---

## Executive Summary

The Recruiting Compass web application has a **reasonably well-optimized Nuxt 3 build system** with good fundamentals in place. Production builds complete quickly (~45-50 seconds including prerendering 40 routes), and the bundle is modestly sized at ~3.0 MB uncompressed with 1,936 modules.

However, there are **significant optimization opportunities** that can improve:

- **Development server rebuild speed** (currently unquantified)
- **CSS payload** (66 KB entry CSS is large; opportunity for PurgeCSS improvements)
- **Bundle code splitting** (large chunks suggest monolithic page components)
- **Caching strategy** (no persistent build cache configured)
- **Dependency weight** (chart.js, html2canvas, jspdf ecosystem contribute significantly)

This analysis provides 12 prioritized recommendations across 5 categories, with realistic implementation effort estimates.

---

## Current State Analysis

### Build Output Metrics

| Metric                       | Value                    | Assessment                           |
| ---------------------------- | ------------------------ | ------------------------------------ |
| **Production Build Time**    | ~45-50 sec               | Good (1936 modules)                  |
| **Client Bundle Size**       | 3.0 MB                   | Reasonable for feature set           |
| **Entry CSS**                | 66 KB (10.73 KB gzipped) | High; opportunity for optimization   |
| **Largest JS Bundle**        | 406 KB                   | Likely page with heavy deps          |
| **Total Routes Prerendered** | 40                       | Good static generation strategy      |
| **Components Count**         | 107                      | Well-organized                       |
| **Composables Count**        | 59                       | Good separation of concerns          |
| **Node Modules Size**        | 461 MB                   | Large but expected for Vue ecosystem |

### Identified Bottlenecks

#### 1. **CSS Payload (HIGH IMPACT)**

- **Entry CSS:** 66 KB (10.73 KB gzipped) is unexpectedly large for TailwindCSS
- **Root Cause:** Likely unused Tailwind utilities included in final CSS or heavy component-scoped styles
- **Evidence:**
  - Minimal TailwindCSS theme customization observed
  - No evidence of content path optimization
  - Multiple CSS files (main.css, theme.css, transitions.css) in assets

#### 2. **Large JavaScript Chunks (MEDIUM-HIGH IMPACT)**

- **Top 5 Bundles:** 406 KB, 377 KB, 196 KB, 183 KB, 155 KB
- **Root Cause:** Likely large page components with dependencies bundled together (Chart.js, jspdf, html2canvas are library heavy)
- **Symptom:** Heavy dependencies (chart.js, html2canvas, jspdf, leaflet) bundled in single chunks

#### 3. **Dependency Weight (MEDIUM IMPACT)**

Heavy libraries in production bundle:

- `chart.js` + `chartjs-adapter-date-fns` + `chartjs-plugin-annotation` (~100+ KB)
- `html2canvas` (~50+ KB)
- `jspdf` + `jspdf-autotable` (~80+ KB)
- `leaflet` (15 KB CSS + ~40+ KB JS)
- `xlsx` (~80+ KB)

#### 4. **No Build Caching Strategy (MEDIUM IMPACT)**

- No `.vite` or persistent cache configuration visible
- No build cache in CI/CD
- Each build recompiles all modules from scratch

#### 5. **Test Isolation Overhead (LOW-MEDIUM IMPACT)**

- Vitest configured with `isolate: true` and `maxWorkers: 2` (for CI safety)
- Unit test setup includes full Vue test environment on every run
- 37 explicit test files included in vitest.config.ts (fragile, prone to brittleness)

---

## Recommendations Prioritized by Impact

### **TIER 1: High Impact, Quick Wins (1-2 weeks)**

#### 1. **Optimize TailwindCSS Output (Est. 30-40% CSS reduction)**

**Problem:** Entry CSS of 66 KB is 3-4x larger than typical Tailwind installations.

**Root Cause Analysis:**

```
- TailwindCSS default mode includes all utilities
- Component-scoped styles not minified
- Possible unused CSS utilities from plugins or extended theme
```

**Solution:**

````
1. Enable Tailwind PurgeCSS in production:
   a. Verify content paths in tailwind.config.js match all component/page files
   b. Add explicit purge whitelist for dynamic class names (if any)

2. Audit CSS imports:
   a. Check if all of assets/styles/*.css are necessary
   b. Move component-only styles to scoped <style> blocks
   c. Remove duplicate declarations between main.css and other files

3. Use Tailwind's JIT compiler fully:
   a. Already enabled in modern Tailwind; ensure postcss cache invalidation

4. Consider CSS class optimization:
   a. Use Tailwind's built-in @apply sparingly
   b. Avoid arbitrary utilities; use theme config instead

5. Enable source map only in dev:
   ```javascript
   // nuxt.config.ts
   export default defineNuxtConfig({
     devtools: { enabled: false },
     css: ["~/assets/css/main.css"],

     // Optimize CSS
     vite: {
       css: {
         preprocessorOptions: {
           postcss: {
             // Ensure purge runs in production
           }
         }
       }
     }
   })
````

**Expected Impact:**

- **CSS payload:** 66 KB → ~20-25 KB (60-65% reduction)
- **Gzipped:** 10.73 KB → ~5-7 KB
- **User Impact:** ~100 ms faster initial load

**Measurement:**

```bash
# Before optimization
npm run build 2>&1 | grep "entry.*css"

# After optimization - compare file size
ls -lh .nuxt/dist/client/_nuxt/entry.*.css
```

---

#### 2. **Implement Multi-Layer Caching Strategy (Est. 25-35% build time reduction)**

**Problem:** No build caching configured; every build recompiles all 1,936 modules.

**Solution Stack:**

**A. Enable Vite Module Cache (Local Development)**

```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  // ... existing config

  vite: {
    // Persist Vite cache across builds
    ssr: false,

    // Use filesystem cache for dependencies
    optimizeDeps: {
      include: [
        "vue",
        "@pinia/nuxt",
        "@supabase/supabase-js",
        "chart.js",
        "fuse.js",
      ],
      exclude: ["@vueuse/core"], // Heavy but quick to rebuild
    },

    // Enable Vite caching
    cacheDir: ".vite",
  },
});
```

**B. Configure Build Cache in package.json**

```json
{
  "scripts": {
    "build": "nuxi generate",
    "build:clean": "rm -rf .nuxt .output .vite && npm run build",
    "dev": "nuxi dev"
  }
}
```

**C. Netlify Build Cache (CI/CD)**
Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".output/public"

[build.cache]
  # Cache Vite and Nuxt artifacts
  "node_modules/.vite" = "node_modules/.vite"
  ".nuxt" = ".nuxt"
  ".vite" = ".vite"
```

**D. Local Development Cache Strategy**

- Add `.vite/` to .gitignore (already excluded via .nuxt)
- Document cache invalidation: "Delete `.vite/` if experiencing stale artifacts"

**Expected Impact:**

- **Cold build:** ~45-50 sec (unchanged)
- **Subsequent builds:** 45 sec → 30-35 sec (25-35% improvement)
- **CI builds:** First run ~50 sec, subsequent cached runs ~35 sec

**Measurement:**

```bash
# Profile build with cache
time npm run build

# Again (should be faster if cache works)
time npm run build
```

---

#### 3. **Code-Split Heavy Dependencies (Est. 15-20% bundle reduction + better caching)**

**Problem:** Large JS chunks (406 KB, 377 KB) suggest lazy-loadable deps bundled in route chunks.

**Root Cause:** Chart.js, jspdf, html2canvas, leaflet imported at component level; bundled eagerly.

**Solution:**

**A. Lazy-Load Analytics Charts**

```typescript
// composables/useChartAnalytics.ts (BEFORE - imports at top)
import Chart from "chart.js/auto";
import ChartjsPluginAnnotation from "chartjs-plugin-annotation";

// AFTER - lazy import in composable
export const useChartAnalytics = () => {
  const loadChart = async () => {
    const { default: Chart } = await import("chart.js/auto");
    const { default: Annotation } = await import("chartjs-plugin-annotation");
    // ... use Chart with lazy-loaded plugin
  };

  return { loadChart };
};
```

**B. Dynamic Route-Level Splits for Reports**

```vue
<!-- pages/documents/index.vue -->
<template>
  <div>
    <!-- Documents without jspdf/html2canvas loaded -->
    <DocumentList v-if="!generating" />
    <GenerateReport v-else @done="onReportDone" />
  </div>
</template>

<script setup>
const GenerateReport = defineAsyncComponent(
  () => import("~/components/Reports/GenerateReport.vue"),
);
</script>
```

**C. Defer Map Initialization**

```typescript
// composables/useSchoolMap.ts
export const useSchoolMap = () => {
  const leaflet = ref(null);

  const initMap = async () => {
    const { L } = await import("leaflet");
    leaflet.value = L;
  };

  return { initMap, leaflet };
};
```

**D. Update vite.config for better chunking**

```typescript
// vite.config.ts (if created separately)
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Chunk heavy dependencies separately for better caching
          "vendor-chart": [
            "chart.js",
            "chartjs-adapter-date-fns",
            "chartjs-plugin-annotation",
          ],
          "vendor-pdf": ["jspdf", "jspdf-autotable", "html2canvas"],
          "vendor-excel": ["xlsx"],
          "vendor-map": ["leaflet", "vue-leaflet"],
        },
      },
    },
  },
});
```

**Expected Impact:**

- **Reduce initial JS payload** by 15-20% (defer non-critical deps)
- **Improve route-level caching** (analytics/reports pages cached separately)
- **Faster initial page load** if user doesn't access reports/maps on first visit

**Measurement:**

```bash
npm run build
# Compare bundle sizes before/after
ls -lhS .nuxt/dist/client/_nuxt/*.js | head -10
```

---

### **TIER 2: Medium Impact, Standard Implementation (2-4 weeks)**

#### 4. **Consolidate and Deduplicate CSS (Est. 10-15% CSS reduction)**

**Problem:** Multiple CSS files (main.css, theme.css, transitions.css) may contain overlaps.

**Solution:**

```
1. Audit CSS file imports:
   a. assets/css/main.css (currently imported in nuxt.config)
   b. assets/styles/theme.css
   c. assets/styles/main.css
   d. assets/styles/transitions.css

2. Consolidate into single file:
   assets/css/main.css
   ├── @import './theme.css'
   ├── @import './transitions.css'
   └── Any global utilities

3. Remove redundant imports from nuxt.config

4. Verify all component-scoped styles use <style scoped>
```

**Implementation:**

- Merge theme.css and transitions.css into assets/css/main.css
- Remove duplicate declarations
- Verify TailwindCSS @apply directives are optimized

**Expected Impact:** 5-10% CSS reduction through deduplication

---

#### 5. **Optimize Dependency Tree (Est. 50-80 KB reduction)**

**Problem:** Redundant/unused dependencies and heavy sub-dependencies.

**Analysis of Key Dependencies:**

```
Questionable/Heavy Deps:
- isomorphic-dompurify (sanitization) - 2 KB but unused if no user-generated HTML
- chartjs-plugin-annotation (specialized) - only if annotations needed
- @sindresorhus/is (type checking) - 7 KB; use native typeof for basic checks

Consider:
- Replace html2canvas with lighter alternative (svg-to-image ~10 KB)
- Evaluate leaflet usage; consider lightweight alternative if map is secondary feature
```

**Solution:**

A. **Audit each major dependency:**

```bash
npm why chart.js        # Check if really needed
npm why html2canvas     # Check if really needed
npm why leaflet         # Check if really needed
npm why jspdf           # Check if really needed
npm why xlsx            # Check if really needed
```

B. **If found to be unused:**

```bash
npm uninstall isomorphic-dompurify  # If not sanitizing user HTML
npm uninstall chartjs-plugin-annotation  # If not using annotations
```

C. **If found to be marginal value:**

```bash
# Replace @sindresorhus/is with native checks:
// Before
import is from '@sindresorhus/is'
if (is.string(value)) { ... }

// After
if (typeof value === 'string') { ... }
```

**Expected Impact:** 10-20 KB reduction; better dependency clarity

---

#### 6. **Implement Aggressive Image/Asset Optimization (Est. 5-15% final output reduction)**

**Problem:** No image optimization configured; public assets may be uncompressed.

**Solution:**

```javascript
// Add to nuxt.config.ts
export default defineNuxtConfig({
  image: {
    // If using @nuxt/image
    format: ["webp", "jpeg"],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 1024,
      lg: 1280,
    },
  },

  // OR configure Vite for asset handling
  vite: {
    assetsInclude: ["**/*.svg", "**/*.webp"],
    ssr: false,
  },
});
```

**Specific Actions:**

1. Convert PNG logos to WebP if used
2. Compress SVG school logos (if stored in public/)
3. Use responsive image loading for avatars/photos

**Expected Impact:** 5-15% reduction in served assets (varies by image usage)

---

### **TIER 3: Long-term Architectural Improvements (4-8 weeks)**

#### 7. **Refactor Component Architecture for Better Code Splitting**

**Problem:** 107 components with 59 composables suggests some monolithic page/components that could be split.

**Solution:**

```
1. Audit largest components (>300 lines):
   - Split heavy pages into smaller, lazy-loadable sub-components
   - Extract analytics/charting logic into separate lazy-loaded modules

2. Lazy-load route-specific features:
   - /documents routes → defer document generation libs
   - /analytics routes → defer charting libs
   - /schools/[id] → defer leaflet/map

3. Implement route-level suspense boundaries:
   <Suspense>
     <template #default>
       <AnalyticsView />
     </template>
     <template #fallback>
       <LoadingSpinner />
     </template>
   </Suspense>
```

**Expected Impact:**

- Better tree-shaking of unused dependencies per route
- Improved perceived load time (critical path prioritized)
- 5-10 sec faster time-to-interactive for non-analytics pages

---

#### 8. **Optimize Vitest Test Infrastructure (Est. 20-30% test run reduction)**

**Problem:** Unit tests configured with `isolate: true` and max 2 workers; explicit file list brittle.

**Solution:**

**A. Switch to glob-based test discovery** (vitest.config.ts):

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],

    // Replace explicit include list with glob pattern
    include: ["tests/unit/**/*.spec.ts", "tests/integration/**/*.spec.ts"],
    exclude: ["node_modules/", "dist/", ".nuxt/", "tests/e2e/**"],

    // Optimize for local dev (more workers) while keeping CI safe
    maxWorkers: process.env.CI ? 2 : 8,
    minWorkers: 1,
    isolate: process.env.CI ? true : false, // Disable isolation locally
  },
});
```

**B. Reduce isolation overhead:**

- Local dev: Run tests with parallelization, no isolation
- CI: Use isolation + 2 workers for memory safety

**Expected Impact:**

- **Local test runs:** 30-40% faster (8 workers vs 2, no isolation)
- **CI runs:** Unchanged (stays conservative)

---

#### 9. **Implement Progressive Enhancement Strategy for E2E Tests**

**Problem:** Playwright runs 3 browser engines (Chromium, Firefox, WebKit) on every run.

**Solution:**

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Only run Firefox/WebKit in CI or on-demand
    ...(process.env.CI
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
});
```

**Local Development Workflow:**

```json
{
  "scripts": {
    "test:e2e": "playwright test", // Chromium only
    "test:e2e:all": "BROWSERS=all playwright test", // All 3
    "test:e2e:ui": "playwright test --ui" // Interactive
  }
}
```

**Expected Impact:**

- **Local test speed:** 66% faster (run 1 browser instead of 3)
- **CI integrity:** Unchanged (still runs all 3)

---

### **TIER 4: Monitoring & Maintenance (Ongoing)**

#### 10. **Set Up Build Performance Monitoring**

**Problem:** No baseline or regression detection for build times.

**Solution:**

**A. Create build timing script:**

```bash
#!/bin/bash
# scripts/measure-build.sh
echo "Build Performance Measurement"
echo "=============================="

rm -rf .nuxt .output .vite 2>/dev/null

echo "Cold build (no cache):"
time npm run build > /dev/null 2>&1

echo ""
echo "Incremental build (with cache):"
time npm run build > /dev/null 2>&1

echo ""
echo "Bundle analysis:"
du -sh .nuxt/dist/client
du -sh .output/public
```

**B. Track in CI/CD:**

```yaml
# .github/workflows/build-metrics.yml (if using GitHub)
name: Build Metrics
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: bash scripts/measure-build.sh
```

**Expected Value:**

- Early detection of performance regressions
- Accountability for optimization efforts
- Historical trend data

---

#### 11. **Create Build Performance Guidelines**

**Problem:** No documented expectations for new code; easy to regress.

**Solution:**
Add to CLAUDE.md:

```markdown
## Build Performance Standards

**Maximum bundle sizes (gzipped):**

- Entry CSS: 8 KB (currently 10.73 KB)
- Entry JS: 150 KB (vary by route)
- Total client: 500 KB gzipped

**Build time targets:**

- Cold build: <60 seconds
- Incremental with cache: <40 seconds

**Dependency guidelines:**

- Only add heavy libs (>50 KB) if used by >2 features
- Lazy-load analytics/reporting/mapping libs
- Prefer native APIs over utility libraries when viable

**Recommended review process:**

1. Check bundle size before committing large dependencies
2. Consider code splitting for page-specific features
3. Profile changes with: npm run build
```

---

#### 12. **Document CSS Architecture & Theming**

**Problem:** Multiple CSS files (main.css, theme.css, transitions.css) create confusion.

**Solution:**

```markdown
# CSS Architecture

## File Organization

- `assets/css/main.css` - Global utilities, component imports
- `assets/styles/theme.css` - Design tokens (deprecated, merge into main)
- `assets/styles/transitions.css` - Animation keyframes (consider moving to <style> in components)

## Best Practices

1. Use TailwindCSS utility classes for layout
2. Use component-scoped <style scoped> for component-specific styling
3. Use theme.css for semantic colors/spacing only
4. Avoid arbitrary CSS classes; update tailwind.config if missing utility

## Adding New Styles

DO: `<div class="bg-blue-500 px-4">`
AVOID: `<style> .custom { color: #xyz; } </style>`
```

---

## Implementation Roadmap

### **Week 1: Quick Wins (Tier 1)**

- [ ] Optimize TailwindCSS output (measure 60% CSS reduction)
- [ ] Implement Vite caching locally
- [ ] Set up Netlify build cache
- [ ] Code-split chart.js imports

**Expected Result:** ~20-30% reduction in CSS payload, 25-35% faster subsequent builds

### **Week 2-3: Consolidation (Tier 2)**

- [ ] Consolidate CSS files
- [ ] Audit/optimize dependencies
- [ ] Implement image optimization
- [ ] Create build monitoring script

**Expected Result:** Additional 15-20% CSS reduction, clearer dependency tree

### **Week 4+: Architecture (Tier 3)**

- [ ] Refactor component splitting for heavy features
- [ ] Optimize test infrastructure
- [ ] Implement E2E browser selection
- [ ] Document guidelines

**Expected Result:** 5-10% further bundle reduction, 30-40% faster local test runs

---

## Measurement & Validation Plan

### Baseline Metrics (Current State)

```
Production Build: ~45-50 seconds
Client Bundle: 3.0 MB
Entry CSS: 66 KB (10.73 KB gzipped)
Largest JS chunk: 406 KB
Total routes: 40 (prerendered)
```

### Success Criteria (Post-Optimization)

```
Production Build: 35-40 seconds (20% improvement)
Client Bundle: 2.4-2.6 MB (15-20% reduction)
Entry CSS: 20-25 KB gzipped (50-60% reduction)
Largest JS chunk: 280-320 KB (20-25% reduction)
```

### Testing Protocol

```bash
# 1. Clean slate measurement
rm -rf .nuxt .output .vite
time npm run build
du -sh .nuxt/dist/client

# 2. Incremental build measurement
time npm run build
du -sh .nuxt/dist/client

# 3. Bundle analysis (if available)
npm run build 2>&1 | grep -E "\.js|\.css" | sort -k4 -h | tail -20
```

---

## Risk Assessment & Mitigation

| Risk                                      | Mitigation                                                        |
| ----------------------------------------- | ----------------------------------------------------------------- |
| **Breaking CSS changes**                  | Test all pages after Tailwind optimization; use git diff on CSS   |
| **Dependencies used elsewhere**           | Audit with `npm why` before removing; check git history for usage |
| **Lazy-loading overhead**                 | Measure actual impact; some deps may not be worth deferring       |
| **Cache invalidation bugs**               | Clear `.vite/` if encountering stale build artifacts              |
| **Test flakiness from reduced isolation** | Keep CI conservative; only optimize local dev isolation           |

---

## Summary & Next Steps

**Key Findings:**

1. **CSS is the biggest quick win** (66 KB → 20-25 KB possible)
2. **Caching not implemented** (25-35% build time reduction opportunity)
3. **Large chunks suggest opportunity for better code-splitting**
4. **Heavy dependencies (jspdf, html2canvas, leaflet) should be lazy-loaded**

**Immediate Actions (This Week):**

1. Run TailwindCSS optimization; measure CSS reduction
2. Configure Vite cache in nuxt.config
3. Set up Netlify build cache with netlify.toml
4. Profile one large page component and implement lazy loading

**Success Metric:**
After all Tier 1 & 2 recommendations, target:

- **CSS:** 10.73 KB → 5-7 KB gzipped (50% reduction)
- **Build:** 45 sec → 30-35 sec cached (30% improvement)
- **DX:** Clearer dependency strategy, documented guidelines

---

## Questions for Chris

Before implementation, clarify:

1. **CSS Consolidation:** Are `assets/styles/theme.css` and `assets/styles/transitions.css` actively maintained, or can they be merged into `assets/css/main.css`?

2. **Chart.js Usage:** Are analytics charts critical path (loaded on first page) or secondary feature? If secondary, aggressive lazy-loading is safe.

3. **PDF/Excel Reports:** Are document generation (jspdf, html2canvas, xlsx) used by most users or niche feature? If niche, heavy deferral is safe.

4. **Map Feature:** Is the school map (leaflet) primary feature or "nice-to-have"? Affects code-splitting strategy.

5. **Build Performance Priority:** Is reducing cold build time important (CI/CD), or focus on dev server rebuildspeed?

6. **Test Coverage Goals:** Are current 37 explicit test files sufficient, or should test discovery expand to discover new tests automatically?
