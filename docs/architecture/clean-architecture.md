# Clean Architecture (Nuxt)

This app stays a Nuxt 3 app. File-based routing, auto-imported components, Pinia, and Nitro endpoints are the **presentation and delivery** layers. Clean architecture here means: business rules do not live inside Vue composables or Supabase call chains.

```
┌─────────────────────────────────────────────────────────┐
│ Presentation                                            │
│  pages/  components/  composables/  stores/             │
│  Vue adapters. Own refs, inject family, call ports.     │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
                ▼                         ▼
┌──────────────────────────┐  ┌───────────────────────────┐
│ Domain                   │  │ Application               │
│  domain/<bounded-context>│  │  application/<context>    │
│  Pure rules. No Vue.     │  │  Ports (interfaces).      │
│  No I/O. No Supabase.    │  │  Use cases if orchestration│
│                          │  │  is more than “call repo”. │
└──────────────────────────┘  └─────────────┬─────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │ Infrastructure            │
                              │  infrastructure/<context> │
                              │  Supabase, HTTP, Fuse, …  │
                              └───────────────────────────┘
```

**Dependency rule:** `domain` imports nothing from Vue, Pinia, or Supabase. `application` imports `domain` and types only. `infrastructure` implements `application` ports. `composables` may import all three. Never the reverse.

## Folder structure

```
domain/
  performance/          # averages, trends, grouping, funnel
  search/               # filter predicates, TTL cache, suggestion mapping
application/
  performance/          # PerformanceMetricsRepository port
infrastructure/
  performance/          # Supabase adapter for that port
composables/            # stable public APIs (facades)
  usePerformance.ts
  usePerformanceAnalytics.ts
  usePerformanceConsolidated.ts
  usePerformanceMetricsCrud.ts
  useSearchConsolidated.ts
```

Nuxt still auto-imports `composables/`. Domain modules are **explicit imports** (`~/domain/performance`). That is intentional — business rules should not appear as magic globals.

## What migrated (behavior unchanged)

The first slices were the “consolidated” god-composables that mixed math, cache policy, and I/O:

| Before | After |
|---|---|
| `usePerformanceAnalytics` duplicated the same math as `usePerformanceConsolidated` | Single `domain/performance` module; both composables re-export it |
| `usePerformance` and `usePerformanceConsolidated` each owned identical CRUD | Shared Vue adapter `usePerformanceMetricsCrud` over `infrastructure/performance` |
| Search filters / TTL cache / College Scorecard mapping inlined in the composable | `domain/search` |

Public call sites did not change:

```ts
const { fetchMetrics, createMetric } = usePerformance();
const { calculateTrend } = usePerformanceAnalytics();
const { performSearch, filters } = useSearchConsolidated();
```

## How to migrate the next domain

1. Find duplicated or mixed logic (CRUD + calculation, or I/O + policy).
2. Move **pure functions** to `domain/<name>/` with tests that do not mount Vue.
3. Declare a **port** in `application/<name>/` if more than one adapter will exist, or if the composable should not mention Supabase.
4. Put the Supabase (or HTTP) implementation in `infrastructure/<name>/`.
5. Leave the existing `useXxx` composable as a facade so pages and tests keep their imports.
6. Do not “fix” quirks while moving (e.g. search `maxValue: 100` counting as an active filter). Behavior first; policy changes are a separate PR.

Good next candidates: documents (fetch / upload / sharing still split *and* copied into `useDocumentsConsolidated`), coach-outreach compose/guardrails, fit-score + phase calculation.

## What this is not

- Not a rewrite of `pages/` into a hexagonal `src/` tree. Nuxt conventions win for UI.
- Not a new service-locator or DI container. Factories (`createPerformanceMetricsRepository(client)`) are enough.
- Not a license to add layers for a 20-line helper. If it is already a pure function in `utils/`, leave it until a second copy appears.
