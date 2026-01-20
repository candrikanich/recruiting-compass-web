# Build Optimization - Quick Reference

**Full Analysis:** See `BUILD_ANALYSIS.md`
**Implementation Details:** See `BUILD_IMPLEMENTATION_GUIDE.md`

---

## Problem Summary

| Metric | Current | Target | Gain |
|--------|---------|--------|------|
| **Entry CSS** | 66 KB (10.73 KB gzip) | 20-25 KB (5-7 KB gzip) | 50-60% ↓ |
| **Cold Build** | 45-50 sec | 45-50 sec | 0% (expected) |
| **Warm Build** | 45-50 sec | 30-35 sec | 25-35% ↓ |
| **Client Bundle** | 3.0 MB | 2.4-2.6 MB | 15-20% ↓ |
| **Largest JS Chunk** | 406 KB | 280-320 KB | 20-25% ↓ |

---

## Top 5 Optimizations (Prioritized by ROI)

### 1. **Optimize TailwindCSS** (QUICK WIN)
- **Effort:** 1-2 hours
- **Impact:** 50-60% CSS reduction (biggest quick win)
- **Steps:**
  1. Verify `tailwind.config.js` content paths
  2. Consolidate CSS files (merge theme.css, transitions.css)
  3. Audit component-scoped styles
  4. Clean build: `rm -rf .nuxt .vite && npm run build`
  5. Measure: `du -h .nuxt/dist/client/_nuxt/entry.*.css`

**Expected:** Entry CSS 10.73 KB → 5-7 KB gzipped

---

### 2. **Enable Vite Caching** (MEDIUM EFFORT)
- **Effort:** 2-3 hours (config + test)
- **Impact:** 25-35% build time reduction (subsequent builds)
- **Steps:**
  1. Add vite caching config to `nuxt.config.ts`:
     ```typescript
     vite: {
       cacheDir: '.vite',
       optimizeDeps: {
         include: ['vue', '@pinia/nuxt', '@supabase/supabase-js', 'chart.js', 'fuse.js']
       }
     }
     ```
  2. Create `netlify.toml` with cache sections
  3. Verify `.vite/` in `.gitignore`
  4. Test: `npm run build` twice, measure timing

**Expected:** Build 45 sec → 30-35 sec (warm cache)

---

### 3. **Code-Split Heavy Dependencies** (MEDIUM EFFORT)
- **Effort:** 3-4 hours
- **Impact:** 15-20% bundle reduction + better caching
- **Steps:**
  1. Lazy-load Chart.js: Convert eager imports to `await import('chart.js')`
  2. Lazy-load PDF libs: Wrap jspdf/html2canvas in `defineAsyncComponent()`
  3. Optional: Lazy-load Leaflet
  4. Measure bundle: `npm run build && ls -lhS .nuxt/dist/client/_nuxt/*.js`

**Expected:** Top bundle 406 KB → 280-320 KB

---

### 4. **Consolidate CSS Files** (QUICK)
- **Effort:** 1 hour
- **Impact:** 5-10% CSS deduplication
- **Steps:**
  1. Merge `assets/styles/theme.css` → `assets/css/main.css`
  2. Merge `assets/styles/transitions.css` → `assets/css/main.css`
  3. Remove duplicate `assets/styles/main.css` (if exists)
  4. Verify `nuxt.config.ts` imports single file
  5. Build and verify: `npm run build`

**Expected:** Modest CSS savings through deduplication

---

### 5. **Optimize Test Infrastructure** (QUICK)
- **Effort:** 1-2 hours
- **Impact:** 30-40% local test speedup
- **Steps:**
  1. Update `vitest.config.ts`: Switch to glob patterns, conditional workers
  2. Configure: `maxWorkers: process.env.CI ? 2 : 8`
  3. Run locally: `npm run test` (should use 8 workers)
  4. Run in CI: `CI=true npm run test` (should use 2 workers)

**Expected:** Local unit tests 30-40% faster

---

## Implementation Order

### Week 1: Quick Wins (Tier 1)
1. **Monday-Tuesday:** Optimize TailwindCSS (66 KB → 25 KB gzipped)
2. **Tuesday-Wednesday:** Implement Vite caching (local + Netlify)
3. **Wednesday-Thursday:** Code-split Chart.js and PDF libs
4. **Friday:** Measure, document, commit

### Week 2: Consolidation (Tier 2)
1. **Monday:** Consolidate CSS files
2. **Tuesday:** Audit and optimize dependencies
3. **Wednesday:** Image optimization setup
4. **Thursday-Friday:** Measure all improvements, document

### Week 3+: Architecture (Tier 3)
1. Refactor components for better splitting
2. Optimize E2E browser selection
3. Implement build monitoring

---

## Measurement Commands

### Baseline (Do This First)
```bash
npm run build:clean  # Clean slate
npm run perf:measure # or: bash scripts/measure-build.sh

# Record:
# - Cold build time: _____ sec
# - Entry CSS size: _____ KB gzipped
# - Largest bundle: _____ KB
```

### After Each Optimization
```bash
npm run perf:measure

# Compare:
# - Build time improvement: _____ %
# - CSS reduction: _____ %
# - Bundle reduction: _____ %
```

---

## Validation Checklist

Before committing each optimization:

- [ ] Clean build completes successfully
- [ ] All unit tests pass: `npm run test`
- [ ] All E2E tests pass: `npm run test:e2e`
- [ ] No browser console errors
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] Bundle size improved (or documented as intentional)

---

## Key Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `nuxt.config.ts` | Add vite.cacheDir, optimizeDeps | Enable Vite caching |
| `tailwind.config.js` | Verify content paths, add safelist | Optimize CSS output |
| `vitest.config.ts` | Glob patterns, conditional workers | Speed up tests |
| `netlify.toml` | Add build cache config | Cache in CI/CD |
| `assets/css/main.css` | Consolidate theme.css, transitions.css | Single CSS entry |
| Composables | Add lazy imports for chart.js | Reduce bundle |
| Components | Add defineAsyncComponent for reports | Lazy-load heavy features |

---

## Success Metrics

When complete, you should see:

```
Before Optimization:
- Entry CSS: 66 KB (10.73 KB gzipped)
- Cold build: 45-50 sec
- Warm build: 45-50 sec
- Client bundle: 3.0 MB
- Largest chunk: 406 KB

After Optimization:
- Entry CSS: 20-25 KB gzipped (50-60% improvement) ✓
- Cold build: 45-50 sec (unchanged)
- Warm build: 30-35 sec (25-35% improvement) ✓
- Client bundle: 2.4-2.6 MB (15-20% improvement) ✓
- Largest chunk: 280-320 KB (20-25% improvement) ✓
```

---

## Rollback Strategy

If any optimization breaks functionality:

```bash
git stash                    # Discard changes
rm -rf .nuxt .output .vite  # Clear cache
npm run build               # Rebuild with original config
npm run test                # Verify tests pass
```

---

## Questions to Ask Chris Before Starting

1. **CSS Priority:** Can we aggressively optimize TailwindCSS even if it requires refactoring? (Biggest bang for buck)
2. **Lazy-Loading:** Are analytics charts and PDF generation "must-have on load" or can they be deferred?
3. **Map Feature:** Is the school map critical path or nice-to-have? (Affects code-splitting strategy)
4. **Build Frequency:** How often do builds happen locally vs. CI? (Helps prioritize caching strategy)
5. **Test Philosophy:** Can we run tests with 8 workers locally but 2 in CI for memory safety?

---

## Estimated Timeline

| Phase | Effort | Expected Result |
|-------|--------|-----------------|
| **TailwindCSS Optimization** | 1-2 hours | CSS 50-60% ↓ |
| **Vite Caching** | 2-3 hours | Build 25-35% ↓ |
| **Code Splitting** | 3-4 hours | Bundle 15-20% ↓ |
| **CSS Consolidation** | 1 hour | CSS 5-10% ↓ |
| **Dependency Audit** | 1-2 hours | Tree clarity |
| **Test Optimization** | 1-2 hours | Tests 30-40% ↓ |
| **Monitoring & Docs** | 1-2 hours | Maintainability ↑ |
| **TOTAL** | 10-16 hours | 60-65% CSS, 25-35% builds, 15-20% bundles |

---

## Common Pitfalls to Avoid

1. **Don't remove CSS files without verifying imports** - Will break styling
2. **Don't skip testing after optimizations** - Easy to regress
3. **Don't lazy-load critical path features** - Will hurt Time-to-Interactive
4. **Don't push to production without local validation** - Always test before deploying
5. **Don't ignore cache invalidation** - Clear `.vite/` if encountering stale builds

---

## Documentation After Completion

Add to project docs:

```markdown
## Build Performance (Optimized)

**Current Metrics (as of [date]):**
- Entry CSS: X KB gzipped
- Production build: X sec
- Client bundle: X MB
- Largest chunk: X KB

**Key Optimizations:**
1. TailwindCSS purged for unused utilities
2. Vite cache enabled for faster rebuilds
3. Heavy dependencies (charts, PDF, maps) lazy-loaded
4. CSS files consolidated for clarity
5. Test infrastructure optimized (8 workers local, 2 in CI)

**Monitoring:**
- Run `npm run perf:measure` to check build performance
- Compare against baseline stored in `.perf-baseline.txt`
- Alert if build time exceeds 60 seconds (cold) or 45 seconds (warm)
```

---

## Next Steps

1. **Read full analysis:** `BUILD_ANALYSIS.md` (5-10 min)
2. **Review implementation guide:** `BUILD_IMPLEMENTATION_GUIDE.md` (10-15 min)
3. **Ask Chris clarifying questions** (see above)
4. **Start with TailwindCSS optimization** (highest ROI)
5. **Follow checklist, measure, validate, commit**

Good luck! 🚀
