# Performance Optimization Design

**Date:** 2026-02-14
**Status:** Approved
**Scope:** Comprehensive web performance optimization across bundle size, images, and rendering

---

## Executive Summary

This design outlines a three-phase sequential approach to optimize The Recruiting Compass web application performance:

1. **Phase 1: Bundle Optimization** - Lazy loading, code splitting, vendor chunking (~40% bundle reduction)
2. **Phase 2: Image Optimization** - Nuxt Image integration, WebP/AVIF formats (~30-50% image size reduction)
3. **Phase 3: SSR Migration** - Hybrid server-side rendering for public pages (faster FCP, better SEO)

**Expected Results:**
- Total bundle size: 3.6 MB → ~2.2 MB (-39%)
- Time to Interactive: ~4.5s → ~2.5s (-44% on 3G)
- Lighthouse Score: ~60 → ~85 (+42%)

**Timeline:** 2-3 weeks (conservative) or 1 week (aggressive)

---

## Architecture Overview

### Three-Phase Sequential Optimization

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Bundle Optimization (Week 1)                      │
│ ├─ Lazy load heavy libraries (PDF, Charts, Maps)           │
│ ├─ Manual vendor chunking                                  │
│ ├─ Lazy load below-fold components                         │
│ └─ Add performance budgets                                 │
│                                                             │
│ Deploy → Production ✅ (~40% bundle reduction)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Image Optimization (Week 2)                       │
│ ├─ Install @nuxt/image                                     │
│ ├─ Migrate <img> → <NuxtImg>                               │
│ ├─ Configure WebP/AVIF                                     │
│ └─ Add responsive sizing                                   │
│                                                             │
│ Deploy → Production ✅ (~30-50% image size reduction)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: SSR Migration (Week 3)                            │
│ ├─ Audit client-only code                                  │
│ ├─ Configure hybrid SSR (route rules)                      │
│ ├─ Refactor localStorage/window usage                      │
│ └─ Comprehensive E2E testing                               │
│                                                             │
│ Deploy → Production ✅ (Faster FCP, better SEO)             │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

- **Independent Deployment:** Each phase is separately deployable to production
- **Full Validation:** All 2836 tests must pass after each phase
- **Performance Measurement:** Metrics captured after each deployment
- **Rollback Safety:** Can pause or rollback at any phase boundary

### Working Branch Strategy

- Phase 1: `feature/bundle-optimization`
- Phase 2: `feature/image-optimization` (branches from Phase 1)
- Phase 3: `feature/ssr-migration` (branches from Phase 2)

---

## Phase 1: Bundle Optimization

### Current State

**Bundle Analysis:**
- Total size: 3.6 MB uncompressed
- Largest chunks:
  - Entry: 396 KB
  - jsPDF: 380 KB
  - html2canvas: 200 KB
  - Chart.js: 192 KB
  - Leaflet: 148 KB
  - Dashboard: 116 KB

**Problem:** All users download PDF/chart/map libraries even if they never use those features.

### 1.1 Lazy Loading Strategy

**Heavy Libraries (Conditional Imports):**

```typescript
// pages/documents/view.vue - Only load when user clicks "Export PDF"
const exportToPDF = async () => {
  const { useRecruitingPacket } = await import('~/composables/useRecruitingPacket')
  const { generatePDF } = useRecruitingPacket()
  await generatePDF()
}

// components/Dashboard/DashboardChartsSection.vue - Lazy load entire component
const DashboardChartsSection = defineAsyncComponent(
  () => import('~/components/Dashboard/DashboardChartsSection.vue')
)
```

**Target Components for Lazy Loading:**

1. **PDF Generation:**
   - `jspdf` (380 KB)
   - `html2canvas` (200 KB)
   - **Savings:** 580 KB

2. **Charts:**
   - `chart.js` (192 KB)
   - `vue-chartjs` wrappers
   - **Savings:** 192 KB

3. **Maps:**
   - `leaflet` (148 KB) on school detail pages
   - **Savings:** 148 KB

4. **Below-fold Dashboard Components:**
   - `DashboardChartsSection`
   - `DashboardMapActivitySection`
   - `DashboardWidgetsSection`
   - **Savings:** ~60 KB

5. **Modals:**
   - `EmailRecruitingPacketModal`
   - All settings modals
   - **Savings:** ~40 KB

**Total Expected Savings:** ~900 KB from initial bundle

### 1.2 Manual Vendor Chunking

```typescript
// nuxt.config.ts
vite: {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-charts': ['chart.js', 'vue-chartjs', 'chartjs-adapter-date-fns'],
          'vendor-maps': ['leaflet', 'vue-leaflet'],
          'vendor-utils': ['fuse.js', 'date-fns'],
        }
      }
    }
  }
}
```

**Benefits:**
- Better browser caching (vendor chunks change less frequently)
- Parallel chunk downloads
- Smaller main bundle
- Long-term cache hits for vendor code

### 1.3 Image Lazy Loading (Quick Win)

```vue
<!-- Add loading="lazy" to all images -->
<img :src="logoUrl" alt="School logo" loading="lazy" />
```

**Implementation:**
- Automated with find/replace script
- Manual review for above-fold images (hero, logo)
- Immediate savings on page load

### 1.4 Performance Budgets

```typescript
// nuxt.config.ts
vite: {
  build: {
    chunkSizeWarningLimit: 500, // Warn if any chunk > 500 KB
  }
}

// package.json
"scripts": {
  "analyze": "nuxi build --analyze",
  "build:check": "npm run build && npm run analyze"
}
```

**Purpose:**
- Prevent bundle size regressions
- Visibility into chunk composition
- CI integration to catch bloat early

### Phase 1 Success Criteria

- ✅ Bundle size reduced by 30-40%
- ✅ All 2836 tests passing
- ✅ No console errors in production preview
- ✅ Manual smoke test: dashboard, schools, PDF export working
- ✅ Lighthouse performance score improved

---

## Phase 2: Image Optimization

### Current State

**Issues:**
- Using native `<img>` tags (no format optimization)
- No responsive sizing
- No automatic WebP/AVIF conversion
- Manual `loading="lazy"` attribute management

### 2.1 Nuxt Image Setup

**Installation:**
```bash
npm install --save-dev @nuxt/image
```

**Configuration:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxt/image'],

  image: {
    formats: ['webp', 'avif', 'png', 'jpg'],
    quality: 80,

    // Vercel image optimization (built-in on deployment)
    provider: 'vercel',

    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
})
```

**Benefits:**
- Automatic format conversion (WebP/AVIF for modern browsers)
- Responsive image sizing
- Lazy loading by default
- CDN optimization via Vercel

### 2.2 Migration Strategy

**Pattern Replacement:**
```vue
<!-- BEFORE -->
<img :src="logoUrl" :alt="`${school.name} logo`" loading="lazy" />

<!-- AFTER -->
<NuxtImg
  :src="logoUrl"
  :alt="`${school.name} logo`"
  format="webp"
  quality="80"
  loading="lazy"
  width="48"
  height="48"
/>
```

**Components to Migrate:**

1. `components/School/SchoolLogo.vue` - School favicons (high priority)
2. `components/Settings/ProfilePhotoUpload.vue` - Profile pictures
3. `components/Header/HeaderProfile.vue` - Avatar images
4. `pages/schools/new.vue` - Any marketing images
5. `pages/login.vue` - Landing page images
6. All other `<img>` tags found in codebase

**Migration Process:**
1. Automated find/replace for simple cases
2. Manual migration for complex cases (dynamic sources, custom styling)
3. Add fallback placeholders where needed

### 2.3 Responsive Images

```vue
<!-- Serve different sizes based on screen -->
<NuxtImg
  :src="school.imageUrl"
  sizes="xs:100vw sm:50vw md:400px"
  :modifiers="{ fit: 'cover', position: 'center' }"
/>
```

**Benefits:**
- Mobile devices get appropriately-sized images
- Desktop gets high-resolution versions
- Bandwidth savings on mobile
- Better Core Web Vitals (LCP)

### 2.4 Fallback Strategy

**For External Images (API-sourced logos):**
```vue
<NuxtImg
  :src="externalLogoUrl"
  format="webp"
  @error="handleImageError"
>
  <template #placeholder>
    <div class="logo-fallback">{{ school.name[0] }}</div>
  </template>
</NuxtImg>
```

**Graceful Degradation:**
- Fallback to PNG/JPG if WebP/AVIF fails
- Placeholder while loading
- Error state for broken images

### Phase 2 Success Criteria

- ✅ All `<img>` migrated to `<NuxtImg>`
- ✅ WebP images serving correctly in modern browsers
- ✅ No image loading errors or broken images
- ✅ Lighthouse performance score improved (image metrics)
- ✅ All 2836 tests passing
- ✅ Mobile image sizes reduced by 30-50%

---

## Phase 3: SSR Migration (Hybrid Rendering)

### Current State

**Configuration:**
```typescript
ssr: false  // Full SPA mode
```

**Issues:**
- No server-rendered HTML (empty `<div id="__nuxt">`)
- Slower Time to First Contentful Paint
- Poor SEO for public pages
- No progressive enhancement

### 3.1 Hybrid SSR Strategy

**Not Full SSR - Strategic Route Rules:**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: true, // Enable SSR globally

  routeRules: {
    // SSR for SEO-critical public pages
    '/': { ssr: true },
    '/schools/**': { ssr: true },
    '/coaches/**': { ssr: true },
    '/login': { ssr: true },
    '/signup': { ssr: true },

    // SPA for authenticated pages (localStorage, reactive state)
    '/dashboard': { ssr: false },
    '/settings/**': { ssr: false },
    '/interactions/**': { ssr: false },
    '/documents/**': { ssr: false },
    '/admin/**': { ssr: false },

    // Static for legal pages
    '/legal/**': { prerender: true },
  }
})
```

**Reasoning:**
- **Public pages benefit from SSR:** SEO, faster initial load, crawlability
- **Authenticated pages stay SPA:** Simpler (no localStorage/auth headaches)
- **Best of both worlds:** Optimal UX per route type

### 3.2 Client-Only Code Audit

**Common Issues to Fix:**

```typescript
// ❌ BEFORE - Breaks on SSR
onMounted(() => {
  const token = localStorage.getItem('auth_token')
  fetchData(token)
})

// ✅ AFTER - SSR-safe
onMounted(() => {
  if (import.meta.client) {
    const token = localStorage.getItem('auth_token')
    fetchData(token)
  }
})
```

**Components Needing `<ClientOnly>` Wrapper:**
- Supabase auth initialization (already handled by `useAuth`)
- Session timeout warnings
- Toast notifications
- Any direct `window` or `document` API usage

```vue
<template>
  <div>
    <ServerSafeContent />

    <ClientOnly>
      <SessionTimeoutWarning />
    </ClientOnly>
  </div>
</template>
```

**Files to Audit:**
1. `composables/useAuth.ts` - Auth state management
2. `composables/useSupabase.ts` - Client initialization
3. `app.vue` - App-level initialization
4. `components/Auth/SessionTimeoutWarning.vue` - Client-only component
5. `components/DesignSystemToast.vue` - Client-only notifications

### 3.3 Supabase SSR Compatibility

**Current Implementation (Already SSR-Safe):**

```typescript
// composables/useSupabase.ts
export const useSupabase = () => {
  if (import.meta.server) {
    // Server-side: create new client per request
    return createClient(/* ... */)
  }
  // Client-side: singleton
  return supabaseClient
}
```

**No Breaking Changes Needed** - Current pattern is already SSR-compatible!

**Auth Flow:**
- Server renders initial HTML
- Client hydrates and initializes auth
- Auth state managed client-side
- Protected routes redirect on client

### 3.4 Testing Strategy for SSR

**Build & Preview:**
```bash
# Build with SSR enabled
npm run build

# Preview locally
npm run preview

# Visit http://localhost:3000
```

**Manual Test Checklist:**

1. ✅ Visit `/` - View page source, should see rendered HTML content (not empty `<div>`)
2. ✅ Navigate to `/schools` - Should server-render school listings
3. ✅ Click into `/schools/[id]` - School detail server-rendered
4. ✅ Navigate to `/dashboard` - Should client-side navigate (SPA mode)
5. ✅ Login flow - Auth should work without issues
6. ✅ Logout - Session clearing works
7. ✅ Protected routes - Redirect to login when unauthenticated

**Automated E2E Tests:**
Your existing 2836 tests (including Playwright E2E) will validate SSR automatically. If they pass with `ssr: true`, SSR is working correctly.

### 3.5 Progressive Rollout Strategy

**Option 1: All Routes at Once**
```typescript
ssr: true  // Enable globally with route rules
```

**Option 2: Gradual (Lower Risk)**

**Week 1:**
```typescript
routeRules: {
  '/': { ssr: true }  // Just landing page
}
```

**Week 2:**
```typescript
routeRules: {
  '/': { ssr: true },
  '/schools/**': { ssr: true }  // Add schools
}
```

**Week 3:**
```typescript
// Full hybrid SSR (all public pages)
```

### 3.6 Rollback Plan

**Emergency Disable:**
```typescript
// nuxt.config.ts
ssr: false  // One-line rollback to SPA
```

**Selective Disable:**
```typescript
routeRules: {
  '/problematic-route': { ssr: false }  // Disable specific route
}
```

**Feature Flag (Optional):**
```typescript
export default defineNuxtConfig({
  ssr: process.env.NUXT_PUBLIC_ENABLE_SSR !== 'false'
})

// Disable via env var:
// NUXT_PUBLIC_ENABLE_SSR=false npm run build
```

### Phase 3 Success Criteria

- ✅ SSR rendering correct HTML for public pages (`/`, `/schools`, `/coaches`)
- ✅ SPA mode working correctly for authenticated pages (`/dashboard`, `/settings`)
- ✅ View page source shows content (not empty `<div id="__nuxt">`)
- ✅ Auth flow unaffected (login, logout, session management)
- ✅ FCP improved by 30-50% on public pages
- ✅ All 2836 tests passing (unit + E2E)
- ✅ Lighthouse SEO score improved

---

## Testing & Validation Strategy

### Per-Phase Testing Checklist

**After Each Phase:**

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Unit tests
npm test

# 4. E2E tests
npm run test:e2e

# 5. Build validation
npm run build
du -sh .vercel/output/static/_nuxt

# 6. Bundle analysis
npm run analyze
```

**Gate:** All 2836 tests must pass before merging each phase.

### Performance Benchmarking

**Baseline Metrics (Before Phase 1):**
```bash
npm run build
ls -lh .vercel/output/static/_nuxt/*.js | awk '{sum+=$5} END {print "Total:", sum/1024/1024, "MB"}'
```

**After Each Phase:**
Document improvements in `docs/plans/performance-results.md`:

```markdown
## Phase 1 Results
- Bundle size: 3.6 MB → 2.4 MB (-33%)
- Dashboard chunk: 116 KB → 65 KB (-44%)
- Lazy chunks: PDF (580 KB), Charts (192 KB), Maps (148 KB)

## Phase 2 Results
- Image size reduction: -40% (WebP format)
- Mobile bandwidth savings: -50%
- Lighthouse image score: 70 → 95

## Phase 3 Results
- FCP: 2.1s → 1.2s (-43%)
- TTI: 4.5s → 2.8s (-38%)
- SEO score: 65 → 92
```

### Lighthouse Audits

**Before & After Each Phase:**
```bash
npm run preview
# Open DevTools > Lighthouse > Run audit
```

**Track Metrics:**
- Performance score
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

### Vercel Speed Insights

Monitor real-user metrics in production:
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

**Already Installed:** `@vercel/speed-insights` ✅

### Regression Testing

**Watch For:**
- Auth flow breaks (localStorage/SSR issues in Phase 3)
- Image loading failures (missing fallbacks in Phase 2)
- Chart/map rendering issues (lazy load timing in Phase 1)
- PDF export errors (async import failures in Phase 1)

**Automated Coverage:**
Your Playwright E2E tests already cover critical flows - they'll catch regressions automatically.

---

## Deployment & Rollback Strategy

### Deployment Flow

**Each Phase:**
```
Feature Branch → PR → Code Review → Merge to develop → Deploy to staging → Smoke test → Merge to main → Production
```

**Vercel Preview Deployments:**
- Every PR gets automatic preview URL
- Test performance improvements in production-like environment
- Share preview links for stakeholder review
- Lighthouse audits on preview URLs

### Feature Flags (Optional Safety Net)

For risky changes (especially SSR), consider feature flags:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      enableSSR: process.env.NUXT_PUBLIC_ENABLE_SSR !== 'false',
      enableLazyCharts: process.env.NUXT_PUBLIC_ENABLE_LAZY_CHARTS !== 'false',
      enableNuxtImage: process.env.NUXT_PUBLIC_ENABLE_NUXT_IMAGE !== 'false',
    }
  }
})

// Usage in code
const config = useRuntimeConfig()
const chartComponent = config.public.enableLazyCharts
  ? defineAsyncComponent(() => import('./Charts.vue'))
  : Charts
```

**Benefits:**
- Quick disable via environment variable
- A/B testing performance improvements
- Gradual rollout to subset of users
- Zero code changes to toggle features

### Rollback Plan

**Phase 1 Rollback (Bundle Optimization):**
```bash
git revert <commit-hash>
git push
# Vercel auto-deploys revert within minutes
```

**Phase 2 Rollback (Image Optimization):**
```typescript
// Quick fix: Disable Nuxt Image, fallback to native <img>
// OR change provider
image: {
  provider: 'ipx',  // Fallback to local optimization
}
```

**Phase 3 Rollback (SSR):**
```typescript
// Emergency disable - one line
ssr: false  // Back to full SPA mode

// OR selective disable
routeRules: {
  '/problematic-route': { ssr: false }
}
```

**Monitoring:**
- Vercel Speed Insights alerts to performance regressions
- Error tracking (Sentry/similar) for runtime issues
- CI alerts for test failures

### Communication Plan

**Before Each Phase:**
- Update team: "Deploying Phase X performance optimizations"
- Expected impact: "Bundle size reduction, faster load times"
- Watch for: "Any issues with [specific features]"
- Timeline: "Deploying to staging at X, production at Y"

**After Each Phase:**
- Share metrics: "Bundle reduced by X%, load time improved by Y%"
- User-facing improvements: "Pages load 40% faster on mobile"
- Celebrate wins! 🎉

### Timeline

**Conservative Estimate (with buffer):**
- Phase 1: 3-4 days (implementation + testing + deployment)
- Phase 2: 2-3 days (migration + validation)
- Phase 3: 4-5 days (SSR audit + testing + gradual rollout)
- **Total:** 2-3 weeks

**Aggressive Estimate (ideal conditions):**
- Phase 1: 1-2 days
- Phase 2: 1 day
- Phase 3: 2-3 days
- **Total:** 1 week

**Recommendation:** Plan for conservative timeline, celebrate if aggressive timeline is achieved.

---

## Expected Results

### Performance Improvements

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 | Total Improvement |
|--------|---------|---------------|---------------|---------------|-------------------|
| Bundle Size | 3.6 MB | 2.4 MB | 2.4 MB | 2.2 MB | **-39%** |
| Image Size | Baseline | Baseline | -40% | -40% | **-40%** |
| FCP | ~2.5s | ~2.0s | ~1.8s | ~1.2s | **-52%** |
| TTI | ~4.5s | ~3.0s | ~2.8s | ~2.5s | **-44%** |
| Lighthouse | ~60 | ~75 | ~80 | ~85 | **+42%** |

*Estimates based on 3G connection

### User Experience Improvements

**Mobile Users (Most Impacted):**
- Faster initial page load
- Reduced data usage
- Better perceived performance
- Improved Core Web Vitals

**Desktop Users:**
- Smoother interactions
- Faster navigation
- Better responsiveness
- Reduced memory usage

**SEO Benefits (Phase 3):**
- Server-rendered content for crawlers
- Improved search rankings
- Better social media previews
- Faster indexing

---

## Risks & Mitigations

### Phase 1 Risks

**Risk:** Lazy-loaded components cause UI delays
**Mitigation:** Preload critical chunks, add loading states, test timing

**Risk:** Vendor chunk splitting breaks imports
**Mitigation:** Comprehensive testing, gradual rollout

### Phase 2 Risks

**Risk:** External images fail to load with Nuxt Image
**Mitigation:** Fallback strategy, placeholder images, error handling

**Risk:** Image format conversion breaks layouts
**Mitigation:** Explicit width/height, maintain aspect ratios

### Phase 3 Risks

**Risk:** SSR breaks auth flow
**Mitigation:** Keep auth pages in SPA mode, `<ClientOnly>` wrappers

**Risk:** Client-only code runs on server
**Mitigation:** `import.meta.client` guards, thorough audits

**Risk:** Hydration mismatches
**Mitigation:** Consistent server/client rendering, E2E testing

---

## Success Metrics

### Phase 1 Complete When:
- ✅ Bundle size reduced by 30-40%
- ✅ All 2836 tests passing
- ✅ No console errors in production preview
- ✅ Manual smoke test: dashboard, schools, PDF export working
- ✅ Lighthouse performance score improved

### Phase 2 Complete When:
- ✅ All `<img>` migrated to `<NuxtImg>`
- ✅ WebP images serving correctly
- ✅ No image loading errors
- ✅ Lighthouse performance score improved
- ✅ All 2836 tests passing

### Phase 3 Complete When:
- ✅ SSR rendering correct HTML for public pages
- ✅ SPA mode working for authenticated pages
- ✅ Auth flow unaffected
- ✅ FCP improved by 30-50%
- ✅ All 2836 tests passing
- ✅ Lighthouse SEO score improved

---

## Next Steps

1. **Review & Approve Design** - Stakeholder sign-off
2. **Create Implementation Plan** - Detailed step-by-step implementation tasks
3. **Phase 1 Implementation** - Start with bundle optimization
4. **Monitor & Iterate** - Track metrics, adjust as needed

---

## References

- [Nuxt Performance Guide](https://nuxt.com/docs/guide/going-further/performance)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [Nuxt Image Module](https://image.nuxt.com/)
- [Web Vitals](https://web.dev/vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)

---

**Design Approved By:** Chris Andrikanich
**Date:** 2026-02-14
