# History: Performance

## 2026-02-02 — QA Performance Audit
QA performance audit: bundle 1.3-1.4MB JS, 104KB CSS, TTFB 12-18ms. Identified monolithic CSS and resource fragmentation as primary targets.

## 2026-04-16 — Lighthouse CI
Added Lighthouse CI to the staging deploy pipeline for perf-regression detection plus Vercel Speed Insights for real-user Core Web Vitals.

## 2026-02-14 — Performance optimization
Three-phase plan (bundle lazy-loading/vendor chunking, `@nuxt/image` WebP/AVIF, hybrid SSR route rules); delivered ~39% bundle reduction and improved FCP/Lighthouse.

## 2026-02-14 — Performance testing
Five perf-regression unit-test suites verifying optimized query paths (batch upsert, N+1 prevention) via a mock-verification strategy (assert the query chain rather than measure timing).
