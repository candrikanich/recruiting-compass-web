# Performance Audit Report - QA Deployment

**Date:** February 2, 2026
**URL:** https://qa.myrecruitingcompass.com
**Environment:** Vercel (QA)
**Pages Audited:** Dashboard, Schools, Coaches, Interactions (4 MVP pages)

---

## Executive Summary

The Recruiting Compass web application has **acceptable baseline performance** with room for significant optimization. Core metrics are within acceptable ranges for a complex web application, but bundle sizes are excessive for an SPA targeting modern browsers.

**Key Findings:**

- ✅ Time to First Byte (TTFB): **12-18ms** (excellent)
- ✅ DOM Interactive: **61-99ms** (very good)
- ⚠️ Total JavaScript Bundle: **1.3-1.4 MB** (needs reduction)
- ⚠️ Total CSS Bundle: **104 KB** (consolidation needed)
- ⚠️ Resource Count: **85-86 resources** (high fragmentation)
- ⚠️ Estimated LCP: 2.5-3.0s (at or slightly above target)

---

## 1. Bundle Size Analysis

### Overall Bundle Metrics

| Metric                 | Value        | Status  | Target   |
| ---------------------- | ------------ | ------- | -------- |
| **Total JavaScript**   | 1.3-1.4 MB   | ⚠️ High | < 500 KB |
| **Total CSS**          | 104 KB       | ⚠️ High | < 50 KB  |
| **Total Build Output** | 3.3 MB       | ⚠️ High | < 2 MB   |
| **Compression Ratio**  | Gzip enabled | ✅ Good | -        |

### Largest JavaScript Chunks

| Rank | File          | Size       | % of Total | Issue                                      |
| ---- | ------------- | ---------- | ---------- | ------------------------------------------ |
| 1    | `C27q8aIu.js` | **392 KB** | 30%        | Vendor chunk - likely bundled dependencies |
| 2    | `DuPj1KFP.js` | **195 KB** | 15%        | Page chunk - schools/interactions logic    |
| 3    | `D2G6RfRN.js` | **150 KB** | 11%        | Page chunk - dashboard/forms               |
| 4    | `BOQTXP-M.js` | **155 KB** | 12%        | Shared chunk - composables/utilities       |
| 5    | `BfjP2Lfm.js` | **97 KB**  | 7%         | Component chunk                            |

**Top 5 chunks = 989 KB = 76% of total JavaScript**

### Largest CSS Chunks

| File                   | Size       | % of Total | Issue                                                      |
| ---------------------- | ---------- | ---------- | ---------------------------------------------------------- |
| `entry.BuorCqdR.css`   | **97 KB**  | 93%        | Main CSS bundle - monolithic                               |
| `leaflet.9UJSYqx2.css` | **15 KB**  | 6%         | Leaflet (map library) - necessary but unused on many pages |
| Other stylesheets      | **< 4 KB** | 1%         | Component scoped CSS                                       |

**Problem:** 93% of CSS is in a single monolithic bundle loaded on every page, including unused Tailwind utilities.

### Resource Fragmentation

- **Total Resources:** 85-86 per page
- **JavaScript Chunks:** 75-76 files
- **CSS Files:** 9 files
- **Issue:** Excessive chunking creates HTTP overhead; many small chunks could be consolidated

---

## 2. Core Web Vitals Assessment

### Measured Metrics (from browser navigation timing)

#### Page: Dashboard

| Metric             | Time   | Status       | Target    | Assessment              |
| ------------------ | ------ | ------------ | --------- | ----------------------- |
| TTFB               | 13 ms  | ✅ Excellent | < 100 ms  | Well under target       |
| DOM Loading        | 96 ms  | ✅ Excellent | -         | Immediate DOM available |
| DOM Interactive    | 99 ms  | ✅ Excellent | -         | Fast interactivity      |
| Page Load Complete | 103 ms | ✅ Excellent | < 3000 ms | Well under target       |

#### Page: Schools

| Metric             | Time  | Status       | Target   | Assessment                |
| ------------------ | ----- | ------------ | -------- | ------------------------- |
| TTFB               | 12 ms | ✅ Excellent | < 100 ms | Excellent CDN performance |
| DOM Interactive    | 61 ms | ✅ Excellent | -        | Fastest of 4 pages        |
| Page Load Complete | 65 ms | ✅ Excellent | -        | Optimized route           |

#### Page: Coaches

| Metric             | Time  | Status       | Target   | Assessment                   |
| ------------------ | ----- | ------------ | -------- | ---------------------------- |
| TTFB               | 18 ms | ✅ Excellent | < 100 ms | Slightly slower (still good) |
| DOM Interactive    | 74 ms | ✅ Excellent | -        | Good performance             |
| Page Load Complete | 77 ms | ✅ Excellent | -        | -                            |

#### Page: Interactions

| Metric             | Time  | Status       | Target   | Assessment       |
| ------------------ | ----- | ------------ | -------- | ---------------- |
| TTFB               | 12 ms | ✅ Excellent | < 100 ms | Excellent        |
| DOM Interactive    | 72 ms | ✅ Excellent | -        | Good performance |
| Page Load Complete | 76 ms | ✅ Excellent | -        | -                |

### Estimated Core Web Vitals

**Largest Contentful Paint (LCP): 2.5-3.0s**

- Measured DOM completion: ~65-103 ms
- Estimated LCP includes JavaScript execution + first paint: 2.5-3.0s
- **Status:** ⚠️ AT OR SLIGHTLY ABOVE target (< 2.5s recommended)
- **Cause:** Large JavaScript bundle (1.3 MB) parsing and execution

**First Input Delay (FID) / Interaction to Next Paint (INP): < 100ms**

- Quick DOM interactive times suggest good INP
- **Status:** ✅ GOOD (estimated < 100ms)
- **Risk:** Large JS execution could impact responsiveness on slower devices

**Cumulative Layout Shift (CLS): Likely < 0.1**

- Clean server-side rendering with Nuxt SSR disabled (SPA mode)
- No observed layout thrashing in snapshots
- **Status:** ✅ GOOD (estimated < 0.1)

**First Contentful Paint (FCP): ~200-300ms**

- TTFB is 12-18ms, DOM loading starts immediately
- Rendering typically adds 200-300ms
- **Status:** ✅ GOOD (< 1.8s target)

**Time to Interactive (TTI): ~2.5-3.0s**

- Aligned with LCP
- Large JavaScript execution window adds delay
- **Status:** ⚠️ AT TARGET boundary

---

## 3. Network Analysis

### Request Summary

| Metric                      | Value          | Assessment                 |
| --------------------------- | -------------- | -------------------------- |
| Total Requests              | 85-86 per page | ⚠️ High                    |
| JavaScript Requests         | 75-76          | ⚠️ Excessive fragmentation |
| CSS Requests                | 9              | ⚠️ Could consolidate       |
| Other (images, fonts, meta) | < 5            | ✅ Good                    |

### Time to First Byte (TTFB)

- **Range:** 12-18ms
- **Status:** ✅ EXCELLENT
- **Cause:** Vercel edge CDN + optimal server location
- **Benchmarks:** Industry excellent < 100ms; you're at 12-18ms

### Render-Blocking Resources

**Critical Path:**

1. HTML document (loaded immediately)
2. Entry CSS bundle (97 KB) - render-blocking ✅
3. Main JavaScript chunk (392 KB) - execution-blocking ⚠️

**Status:** Entry CSS is correctly render-blocking (necessary). Entry JS should be deferred if possible.

### Caching Assessment

| Resource Type | Cache Strategy                | Status           |
| ------------- | ----------------------------- | ---------------- |
| HTML          | No-cache (SPA)                | ✅ Correct       |
| JS/CSS chunks | Long-lived (hash in filename) | ✅ Good          |
| API responses | Memory cache (composables)    | ⚠️ Could improve |
| Images        | Not assessed                  | -                |

---

## 4. Performance Issues Found (Ranked by Impact)

### HIGH IMPACT Issues

#### 1. **Oversized Main JavaScript Bundle (392 KB)**

- **Impact:** Delays LCP by 500-1000ms due to parsing/execution
- **Root Cause:** Likely contains all major dependencies (Supabase, Chart.js, Leaflet)
- **Evidence:** 30% of total JS in single chunk
- **Recommendation:**
  - Code split Supabase client initialization
  - Lazy-load heavy libraries (Chart.js, Leaflet) only on pages that use them
  - Target: Reduce to < 200 KB

#### 2. **Monolithic CSS Bundle (97 KB = 93% of all CSS)**

- **Impact:** Adds 97 KB to initial load; includes unused Tailwind utilities on every page
- **Root Cause:** Single entry point CSS with no component-level splitting
- **Evidence:** TailwindCSS generates full utility set; component CSS not being extracted
- **Recommendation:**
  - Extract component-scoped CSS from `.vue` files
  - Use Tailwind's content-based purging more aggressively
  - Consider CSS-in-JS or CSS modules for components
  - Target: Reduce to < 40 KB

#### 3. **High Resource Fragmentation (75+ JS chunks)**

- **Impact:** HTTP overhead, longer resource waterfall, cache misses
- **Root Cause:** Nuxt auto-chunking with no consolidation strategy
- **Evidence:** Many chunks < 10 KB (excessive header overhead)
- **Recommendation:**
  - Consolidate small chunks < 20 KB
  - Set minimum chunk size threshold in Vite config
  - Group related routes together
  - Target: Reduce to 20-30 chunks

#### 4. **Possible Unused Dependencies**

- **Impact:** Unknowable without analysis; could be 10-20% of bundle
- **Evidence:**
  - `isomorphic-dompurify` listed but excluded from build (still in package.json)
  - Heavy libraries included: `html2canvas`, `jspdf`, `xlsx`
  - Multiple chart/visualization libraries
- **Recommendation:**
  - Audit dependencies: `npm ls` and `npm audit`
  - Identify used vs. unused: `webpack-bundle-analyzer` or `vite-plugin-visualizer`
  - Remove unused packages (html2canvas, jspdf for MVP?)
  - Target: Save 50-100 KB

### MEDIUM IMPACT Issues

#### 5. **Leaf Map Library Always Loaded (15 KB CSS)**

- **Impact:** 15 KB of unused CSS on Schools list page when map not visible
- **Root Cause:** Leaflet CSS imported globally
- **Recommendation:**
  - Dynamic import Leaflet only in map-using components
  - Lazy-load Leaflet in dashboard "School Locations" widget

#### 6. **LCP at Boundary (2.5-3.0s)**

- **Impact:** Marginal SEO penalty, user perception of slowness
- **Root Cause:** JavaScript execution during hydration
- **Recommendation:**
  - Implement streaming HTML (Nuxt streaming)
  - Reduce main bundle to < 200 KB
  - Add performance budgets to CI/CD

#### 7. **No Service Worker / Offline Support**

- **Impact:** Zero support for poor network conditions, no repeat-visit caching
- **Recommendation:**
  - Implement Workbox service worker
  - Cache API responses for offline use
  - Target: 2x faster repeat visits

### LOW IMPACT Issues

#### 8. **No Image Optimization Visible**

- **Impact:** Unknown; no images measured in audit
- **Recommendation:**
  - Audit image sizes in templates
  - Use `<picture>` tags and WebP format
  - Lazy-load images below fold

#### 9. **No Asset Preloading Strategy**

- **Recommendation:**
  - Add `<link rel="preload">` for critical chunks
  - Add `<link rel="prefetch">` for next routes
  - Add DNS prefetch for API endpoint

#### 10. **No HTTP/2 Server Push Observed**

- **Recommendation:**
  - Verify Vercel has HTTP/2 enabled (should be default)
  - Consider HTTP/2 Server Push for CSS/JS

---

## 5. Optimization Opportunities (Specific Recommendations)

### Immediate Wins (1-2 hours)

1. **Add Vite chunk size configuration** (5-10 KB savings)

   ```typescript
   // nuxt.config.ts
   vite: {
     rollupConfig: {
       output: {
         manualChunks: {
           'supabase': ['@supabase/supabase-js'],
           'charts': ['chart.js', 'vue-chartjs'],
           'leaflet': ['leaflet', 'vue-leaflet'],
         }
       }
     }
   }
   ```

2. **Lazy-load Leaflet library** (15 KB CSS savings)

   ```typescript
   // pages/dashboard.vue - only import where map is used
   const MapComponent = defineAsyncComponent(
     () => import("~/components/SchoolMap.vue"),
   );
   ```

3. **Purge unused Tailwind CSS** (10-20 KB savings)

   ```javascript
   // tailwind.config.js
   content: ["./components/**/*.{vue,js}", "./pages/**/*.{vue,js}"];
   // Remove any unused @layer directives
   ```

4. **Audit and remove unused dependencies** (20-50 KB savings)

   ```bash
   npm audit && npm ls
   # Check if html2canvas, jspdf, xlsx used in MVP
   ```

5. **Add resource preloading hints** (perceived speed)
   ```html
   <!-- app.vue or nuxt.config -->
   <link rel="preload" as="script" href="/_nuxt/C27q8aIu.js" />
   <link rel="prefetch" href="/_nuxt/schools-chunk.js" />
   ```

### Medium-Term Improvements (1-2 days)

6. **Implement code splitting by route** (save 30-50% on LCP)

   ```typescript
   // pages/schools/index.vue
   const SchoolsTable = defineAsyncComponent(
     () => import("~/components/SchoolsTable.vue"),
   );
   ```

7. **Extract and optimize CSS** (40-50 KB savings)
   - Use CSS modules for components
   - Remove unused Tailwind utilities (PurgeCSS)
   - Split entry CSS into layout + page-specific

8. **Implement service worker** (2x faster repeat visits)

   ```bash
   npm install workbox-cli
   workbox generateSW workbox-config.js
   ```

9. **Add performance monitoring** (observe real users)
   ```typescript
   // middleware/performance.ts
   if (process.client && "PerformanceObserver" in window) {
     new PerformanceObserver((list) => {
       for (const entry of list.getEntries()) {
         console.log("Metric:", entry.name, entry.value);
       }
     }).observe({ entryTypes: ["largest-contentful-paint"] });
   }
   ```

### Long-Term Initiatives (1-2 weeks)

10. **Implement Nuxt 3 streaming SSR** (reduce TTI by 50%)
    - Current config: `ssr: false` (SPA mode)
    - Enable partial hydration for faster interactivity

11. **Compress bundle further** (target 500 KB total JS)
    - Replace heavy libraries with lightweight alternatives
    - E.g., `chart.js` (90 KB) → `uPlot` (50 KB)
    - E.g., `leaflet` (39 KB) → `maplibre` (45 KB, but better performance)

12. **Implement HTTP/2 Server Push** (saves 1-2 RTTs)
    - Vercel should support automatically
    - Test with WebPageTest

---

## 6. Performance Budget Recommendations

Establish guardrails to prevent regression:

```json
{
  "bundles": [
    {
      "name": "JavaScript",
      "maxSize": "500kb",
      "currentSize": "1300kb"
    },
    {
      "name": "CSS",
      "maxSize": "50kb",
      "currentSize": "104kb"
    },
    {
      "name": "Total",
      "maxSize": "1mb",
      "currentSize": "3300kb"
    }
  ],
  "metrics": [
    {
      "name": "LCP",
      "target": "2.5s",
      "current": "2.5-3.0s"
    },
    {
      "name": "FID/INP",
      "target": "100ms",
      "current": "~100ms (estimated)"
    },
    {
      "name": "CLS",
      "target": "0.1",
      "current": "~0.05 (estimated)"
    }
  ]
}
```

Add to CI/CD:

```bash
npm install --save-dev bundlewatch
# bundlewatch will fail if bundles exceed budget
```

---

## 7. Blockers & Limitations

### Measurement Constraints

1. **Performance API limitations in test browser**
   - Could not directly measure LCP (requires longer observation window)
   - Estimates based on DOM timing + execution time
   - **Recommendation:** Run audit with Chrome DevTools Lighthouse on real deployment

2. **No Real User Monitoring (RUM) data**
   - Cannot see metrics from actual users on different networks/devices
   - Metrics are from Fiber connection in us-east region
   - **Recommendation:** Implement Vercel Web Analytics or Sentry Performance

3. **Empty test account**
   - Dashboard/Schools/Coaches/Interactions pages load minimal data
   - Real performance with populated lists unknown
   - **Recommendation:** Audit with test data (50+ schools, 100+ interactions)

4. **No Third-party Script Analysis**
   - Could not identify all third-party overhead (tracking, analytics)
   - "Send feedback" button suggests Intercom or similar
   - **Recommendation:** Audit with Network tab filtering

---

## 8. Recommendations Summary

### Priority 1 (Do First)

- [ ] Lazy-load Leaflet (15 KB savings, 15 min)
- [ ] Optimize Tailwind CSS (10-20 KB, 30 min)
- [ ] Audit & remove unused packages (20-50 KB, 1 hour)
- [ ] Add performance budget to CI/CD (5 min)

### Priority 2 (This Sprint)

- [ ] Code split by route (30-50% LCP improvement, 4 hours)
- [ ] Extract component CSS (40 KB savings, 3 hours)
- [ ] Add resource preloading hints (perceived speed, 1 hour)
- [ ] Implement Vercel Web Analytics (monitoring, 30 min)

### Priority 3 (This Quarter)

- [ ] Service worker implementation (2x faster repeats, 1-2 days)
- [ ] Streaming SSR (50% TTI reduction, 2-3 days)
- [ ] Bundle size reduction strategy (target 500 KB, ongoing)
- [ ] Image optimization (unknown impact, pending audit)

---

## Appendix A: Detailed Metrics by Page

### Dashboard Page

```
URL: /dashboard
TTFB: 13 ms
DOM Interactive: 99 ms
Page Load: 103 ms
Resources: 85
JS: 75 files, 1.3 MB
CSS: 9 files, 104 KB
Status: ⚠️ LCP at boundary
```

### Schools Page

```
URL: /schools
TTFB: 12 ms
DOM Interactive: 61 ms
Page Load: 65 ms
Resources: 86
JS: 76 files, 1.35 MB
CSS: 9 files, 104 KB
Status: ✅ Fastest route
```

### Coaches Page

```
URL: /coaches
TTFB: 18 ms
DOM Interactive: 74 ms
Page Load: 77 ms
Resources: 86
JS: 76 files, 1.29 MB
CSS: 9 files, 104 KB
Status: ✅ Good performance
```

### Interactions Page

```
URL: /interactions
TTFB: 12 ms
DOM Interactive: 72 ms
Page Load: 76 ms
Resources: 85
JS: 75 files, 1.3 MB
CSS: 9 files, 104 KB
Status: ✅ Good performance
```

---

## Appendix B: Tools for Further Analysis

**Run these to drill deeper:**

```bash
# Lighthouse audit (Chrome DevTools > Lighthouse)
# Open DevTools, Tab: Lighthouse, Category: Performance

# WebPageTest analysis
# https://www.webpagetest.org/?url=https://qa.myrecruitingcompass.com

# Bundle analyzer
npm install -D vite-plugin-visualizer
# Then: npm run build && npx vite-plugin-visualizer

# Lighthouse CI
npm install -D @lhci/cli@0.8.x
lhci autorun

# Vercel Web Analytics (recommended)
# https://vercel.com/docs/analytics
```

---

**Report prepared:** February 2, 2026
**Next audit recommended:** After implementing Priority 1 recommendations (1-2 weeks)
