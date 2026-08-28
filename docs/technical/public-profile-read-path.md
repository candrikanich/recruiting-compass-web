# Public Profile Read Path

Scale-out design for Recruiting Compass, with the production MVP implemented
on the only unauthenticated hot path: `GET /api/public/profile/:slug`.

This is **not** a rewrite and **not** a move to microservices. The product stays
a modular Nuxt/Nitro monolith on Vercel + Supabase. What changes is the read
path for data that will be hit by coaches, shared links, and crawlers — traffic
that does not share a family session and cannot be absorbed by Pinia.

Related issue: [#529](https://github.com/candrikanich/recruiting-compass-web/issues/529).

---

## 1. Architecture

Recruiting Compass is a **modular monolith**. At current and near-term load
(families, not millions of concurrent coaches), splitting services would add
operational cost without buying scale. Scale is achieved by:

1. Keeping writes on Postgres + RLS (one source of truth, tenant isolation).
2. Adding a **read-through cache** in front of expensive assembled reads.
3. Bounding every public/list endpoint (already a standing rule).
4. Using Vercel Fluid / serverless concurrency, not a long-lived Node fleet.
5. Using Upstash Redis where it already exists (rate limit, college search)
   as L1, with Postgres snapshots as L2 so Redis is optional.

```
                    ┌─────────────────────────────────────────┐
                    │  Coach browser / iOS / crawler          │
                    └──────────────────┬──────────────────────┘
                                       │ GET /api/public/profile/:slug
                                       ▼
                    ┌─────────────────────────────────────────┐
                    │  Nitro (Vercel)                         │
                    │  1. Validate slug                       │
                    │  2. player_profiles lookup (authoritative │
                    │     is_published — never cached)          │
                    │  3. L1 Redis  pubprof:v1:{userId}        │
                    │  4. L2 Postgres cache_snapshots           │
                    │  5. Origin fan-out (5–6 tables)         │
                    │  6. ETag / 304                          │
                    └───────────┬───────────────┬─────────────┘
                                │               │
                     Upstash Redis          Supabase Postgres
                     (optional L1)         RLS + cache_snapshots
```

**Why not CDN-cache the JSON for 5 minutes?** Unpublish is a privacy event.
`s-maxage=300` would keep serving a live profile after the athlete takes it
down. The MVP uses `Cache-Control: private, no-cache` plus ETag so clients
revalidate, and Redis invalidation is immediate. CDN caching is a later
phase with an explicit purge-on-unpublish.

**What stays the same**

- Page → Composable → Pinia → API/Supabase for authenticated app traffic.
- Family-scoped RLS. Cache rows are derived public payloads, not tenant rows.
- iOS consumes the same JSON contract; response shape is unchanged.

**Scale-out later (not in this MVP)**

| Phase | Trigger | Change |
|---|---|---|
| Now | Public profile shares | Two-tier cache + ETag (this PR) |
| Next | Dashboard fan-out on login | Same `cache_snapshots` namespace `dashboard` |
| Later | College search already Redis | Route it through `readThroughCache` |
| Later | True fan-out (email/push) | Existing cron + skip-locked queues |
| Not yet | Multi-region | Supabase read replica + regional Redis |

---

## 2. Component structure

```
pages/p/[slug].vue                 public layout, useFetch → API
components/profile/PublicProfileCard.vue   presentational card
components/Dashboard/PublicProfileLinkCard.vue   athlete share widget

server/api/public/profile/[slug].get.ts    HTTP adapter (slug, headers, 304)
server/api/player/profile.put.ts            write adapter + invalidate

server/utils/publicProfileAssemble.ts   pure allowlisted JSON assembly
server/utils/publicProfileRead.ts     publish check + origin + cache orchestration
server/utils/readThroughCache.ts      generic L1/L2/singleflight (reusable)
server/utils/redis.ts                 Upstash client (fail-open)

supabase/migrations/20260912000000_cache_snapshots.sql
```

The Vue tree does not change. Caching is a server concern. `PublicProfileCard`
keeps rendering `PublicProfileData`; it never talks to Redis or snapshots.

---

## 3. Data flow

### Read (published)

```
GET /api/public/profile/k7x9m2
  → slug regex
  → SELECT player_profiles WHERE hash_slug OR vanity_slug
  → if unpublished: DELETE cache key, 410, Cache-Control: private, no-store
  → L1 GET pubprof:v1:{user_id}
      hit → ETag / optional 304 / JSON
  → L2 SELECT cache_snapshots WHERE cache_key AND expires_at > now()
      hit → fill L1, return
  → singleflight(user_id)
      origin: users, user_preferences, schools, video_links, performance_metrics
      assemblePublicProfile (allowlist — never email/phone)
      SET L1 (60s) + UPSERT L2 (300s)
```

Origin queries that are gated by section visibility still skip (film/metrics/
schools). Cache does not change that.

### Write

```
PUT /api/player/profile
  → UPDATE player_profiles (updated_at trigger fires)
  → AFTER trigger DELETE cache_snapshots pubprof:v1:{user_id}
  → invalidatePublicProfileForUser → Redis DEL + L2 DELETE
```

A GET in flight during the write can theoretically refill with a snapshot
taken before the commit. TTL (60s L1 / 5 min L2) bounds that; unpublish is
still correct because `is_published` is read on every request.

### Related-data staleness (accepted MVP bound)

Prefs, film, and metrics do not bump `player_profiles.updated_at`. Those
fields can be up to **5 minutes** stale unless the athlete also saves the
profile (which invalidates). Next increment: a small trigger on those tables
that deletes the same cache_key.

---

## 4. API design

### `GET /api/public/profile/:slug`

Unauthenticated. Unchanged JSON body (`PublicProfileData`).

| Status | When |
|---|---|
| 200 | Published profile |
| 304 | `If-None-Match` matches current ETag |
| 404 | Bad slug format or unknown slug |
| 410 | Exists but `is_published = false` |

Headers on 200/304:

| Header | Value | Why |
|---|---|---|
| `Cache-Control` | `private, no-cache` | Must revalidate; no CDN copy of PII-adjacent public pages |
| `ETag` | `"sha256-16hex"` of payload | Cheap 304 after publish check |
| `X-Cache` | `l1` \| `l2` \| `origin` | Ops visibility |

410 uses `Cache-Control: private, no-store`.

### `PUT /api/player/profile`

Authenticated. Response `{ success: true }` unchanged. After a successful
update it fire-and-forgets `invalidatePublicProfileForUser`. Invalidation
failure is logged, never fails the write.

No new public endpoints. Cache is not a client-facing resource.

---

## 5. Database schema

```sql
cache_snapshots (
  cache_key   text PRIMARY KEY,           -- 'pubprof:v1:' || user_id
  namespace   text NOT NULL,             -- 'public_profile'
  payload     jsonb NOT NULL,          -- assembled PublicProfileData
  etag        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)

idx cache_snapshots_namespace_idx (namespace)
idx cache_snapshots_expires_at_idx (expires_at)
```

- RLS on, **no policies** — service-role only (same as `admin_audit_log`).
- `REVOKE ALL FROM anon, authenticated`.
- Trigger `player_profiles_invalidate_cache_snapshot` deletes the L2 row
  on UPDATE/DELETE of `player_profiles`.

No `family_unit_id` on this table: the payload is already the public allowlist,
and the key is the athlete `user_id`. Putting family scope on a derived cache
would invite RLS joins that the service-role writer would bypass anyway.

**Indexes already used by origin** (no new ones required for the lookup):
`player_profiles.hash_slug`, `player_profiles.vanity_slug` (unique),
`video_links.user_id`, `performance_metrics.user_id`, `schools.family_unit_id`.

---

## 6. Caching strategy

| Layer | Store | TTL | Invalidation | Failure mode |
|---|---|---|---|---|
| Authoritative publish | `player_profiles` row | none | n/a | Always hit (1 indexed read) |
| L1 | Upstash Redis | 60s | DEL on PUT + unpublish | Missing env → skip |
| L2 | `cache_snapshots` | 300s | DELETE on PUT + trigger | Missing table / query error → skip |
| Coalesce | in-process `Map` | request | n/a | Per isolate only |
| HTTP | ETag + no-cache | n/a | client revalidate | 304 after publish check |

**Key design rules**

- Cache key includes every input that shapes the payload. Here that is
  `user_id` (one assembled doc per athlete, shared by hash and vanity slug).
- Never cache 410/404 as success. Negative caching is a later hardening step
  for slug scanners.
- Fail-open: Redis or snapshot errors do not 500 the request.
- Do not cache unpublished payloads.
- `JSON.stringify` ETag is acceptable because `assemblePublicProfile` is
  deterministic for a given row set.

**Memory / cost**

- Payload is a small JSON card (low tens of KB). 10k live profiles ≈ tens of
  MB in Redis. L2 is cheap jsonb.
- Expired L2 rows can be deleted with `DELETE WHERE expires_at < now()` from
  an existing cron later; not in this MVP.

---

## 7. Implementation

Shipped in this change:

- `readThroughCache` + `publicProfileRead` + GET/PUT wiring
- Migration `20260912000000_cache_snapshots.sql` (apply to the live DB before
  L2 starts filling; until then L2 fail-opens and L1/origin still work)
- Unit tests for cache semantics, origin skip rules, GET 304, existing
  public-profile assembly contract

**Not in this MVP (intentionally)**

- CDN purge API
- Dashboard snapshot namespace
- Triggers on `user_preferences` / `video_links` / `performance_metrics`
- Admin UI for cache inspection
- iOS code (JSON contract unchanged)
