# System Architecture

## Overview

The Recruiting Compass is a Nuxt 3 full-stack application deployed to Vercel. The client renders with Vue 3, state lives in Pinia stores, and Nitro serverless functions serve all `/api/**` routes backed by Supabase PostgreSQL.

---

## System Diagram

```mermaid
graph TB
    subgraph Client["Browser (Nuxt 3 SSR/CSR)"]
        Pages["Pages\n(file-based routing)"]
        Components["Vue Components\n(auto-imported)"]
        Composables["Composables\nuseXxx()"]
        Stores["Pinia Stores\n(state)"]
        Pages --> Components --> Composables --> Stores
    end

    subgraph Server["Vercel Serverless (Nitro)"]
        APIRoutes["API Routes\n/api/**"]
        CSRF["CSRF Middleware"]
        RateLimit["Rate Limit Middleware"]
        Auth["Auth Middleware"]
        Logging["Structured Logger\n+ Correlation IDs"]
        APIRoutes --> CSRF --> RateLimit --> Auth --> Logging
    end

    subgraph Supabase["Supabase"]
        PG["PostgreSQL\n+ RLS Policies"]
        SupaAuth["Auth\n(JWT)"]
        Storage["File Storage"]
    end

    Client -->|"$fetch('/api/**') + JWT"| Server
    Server --> PG
    Server --> SupaAuth
    Server --> Storage
    Client -->|"Direct auth calls"| SupaAuth

    style Client fill:#e1f5ff,stroke:#0288d1
    style Server fill:#f3e5f5,stroke:#7b1fa2
    style Supabase fill:#e8f5e9,stroke:#388e3c
```

---

## Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Vue Component
    participant Cx as Composable
    participant S as Pinia Store
    participant API as Nitro Route
    participant DB as Supabase

    U->>C: Interaction
    C->>Cx: Call useXxx()
    Cx->>API: $fetch('/api/...', {method, body})
    API->>API: Validate JWT + CSRF
    API->>DB: Supabase query (RLS enforced)
    DB-->>API: Data
    API-->>Cx: Response
    Cx->>S: Update store state
    S-->>C: Reactive re-render
```

---

## Layer Responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| **Pages** | `pages/` | Route definitions, layout composition |
| **Components** | `components/` | UI rendering, emit events |
| **Composables** | `composables/` | Data fetching, orchestration, local state |
| **Stores** | `stores/` | Global state, mutations (never in components) |
| **API Routes** | `server/api/` | Auth, validation, business logic |
| **Middleware** | `server/middleware/` | CSRF, rate limiting, request correlation |
| **Utils** | `server/utils/` | Validation, logging, shared helpers |

---

## Data Access Pattern

```
Page → Component → Composable (useXxx) → Pinia Store → Supabase / API
```

- Components **never** call Supabase directly
- Mutations happen **only** in Pinia actions
- Composables return `{ data, loading, error, fetchXxx }` refs

---

## API Routing (Nitro file-based)

```
server/api/
├── schools.get.ts              → GET  /api/schools
├── schools.post.ts             → POST /api/schools
├── schools/
│   ├── [id].get.ts             → GET  /api/schools/:id
│   ├── [id].put.ts             → PUT  /api/schools/:id
│   ├── [id].delete.ts          → DELETE /api/schools/:id
│   └── [id]/
│       ├── fit-score.get.ts    → GET  /api/schools/:id/fit-score
│       └── coaches.get.ts      → GET  /api/schools/:id/coaches
└── coaches/
    └── [id].get.ts             → GET  /api/coaches/:id
```

---

## Security

- **Authentication:** Supabase JWT, verified on every server route
- **Authorization:** RLS policies enforce row-level data ownership
- **CSRF:** Token required for all mutating endpoints (`server/middleware/csrf.ts`)
- **Rate limiting:** Per-IP limits on write endpoints
- **Input validation:** Zod schemas at API boundaries
- **Secrets:** Never in code — use `process.env.*` with runtime validation

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Package bundling | `nitro.externals.inline` | Vercel doesn't install deps at runtime |
| SSR teleport | Wrap in `<ClientOnly>` | `<Teleport>` crashes during SSR |
| HTML sanitization | `sanitize-html` | `isomorphic-dompurify` has ESM/CJS conflicts |
| State mutations | Pinia actions only | Predictable state, testable |

See [`/planning/lessons.md`](../planning/lessons.md) for evolving patterns.

---

## Detailed Docs

- [Database Schema](technical/DATABASE_SCHEMA.md)
- [Architecture Diagrams (extended)](technical/ARCHITECTURE_DIAGRAMS.md)
- [Feature Flow Diagrams](technical/FEATURE_FLOW_DIAGRAMS.md)
- [API Reference](api/API_ENDPOINT_DOCUMENTATION.md)
