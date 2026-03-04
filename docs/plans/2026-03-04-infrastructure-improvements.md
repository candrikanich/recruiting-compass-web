# Infrastructure Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add PostHog analytics, upgrade Tailwind to v4, adopt Nuxt UI v3, and add Upstash rate limiting to sensitive API endpoints.

**Architecture:** Five sequential phases — PostHog first (no dependencies), Tailwind v4 next (required for Nuxt UI v3), then Nuxt UI v3 incrementally, then rate limiting on auth/family/feedback endpoints, then bundle verification.

**Tech Stack:** posthog-js, @tailwindcss/upgrade, @nuxt/ui v3, @upstash/ratelimit, @upstash/redis

**Design doc:** `docs/plans/2026-03-04-infrastructure-improvements-design.md`

---

## Phase 1 — PostHog Analytics

### Task 1: Install PostHog and add config

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`

**Step 1: Install the package**

```bash
npm install posthog-js
```

Expected: posthog-js appears in `dependencies` in package.json.

**Step 2: Add runtime config keys to `nuxt.config.ts`**

In the `runtimeConfig.public` block, add:

```typescript
posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || "",
posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
```

**Step 3: Add env vars to `.env.local`**

```bash
NUXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NUXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

To get the key: sign up at posthog.com → create project → copy Project API Key.

**Step 4: Commit**

```bash
git add package.json nuxt.config.ts
git commit -m "chore: install posthog-js and add runtime config keys"
```

---

### Task 2: Create PostHog plugin with tests

**Files:**
- Create: `plugins/posthog.client.ts`
- Create: `tests/unit/plugins/posthog.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/plugins/posthog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock posthog-js before any imports
const mockCapture = vi.fn()
const mockInit = vi.fn().mockReturnValue({ capture: mockCapture })

vi.mock("posthog-js", () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
  },
}))

// Mock Nuxt composables
const mockAfterEach = vi.fn()
vi.mock("#app", () => ({
  defineNuxtPlugin: (fn: Function) => fn,
  useRuntimeConfig: vi.fn(),
  useRouter: vi.fn(),
}))

import { useRuntimeConfig, useRouter } from "#app"

describe("posthog plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not initialize when posthogKey is empty", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    expect(mockInit).not.toHaveBeenCalled()
  })

  it("initializes posthog with correct privacy settings when key is set", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "phc_test123", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    expect(mockInit).toHaveBeenCalledWith(
      "phc_test123",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        disable_session_recording: true,
        capture_pageview: false,
      }),
    )
  })

  it("registers router afterEach hook for page tracking", async () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      public: { posthogKey: "phc_test123", posthogHost: "https://us.i.posthog.com" },
    } as ReturnType<typeof useRuntimeConfig>)
    vi.mocked(useRouter).mockReturnValue({ afterEach: mockAfterEach } as ReturnType<typeof useRouter>)

    const { default: plugin } = await import("~/plugins/posthog.client")
    plugin({ provide: vi.fn() } as never)

    expect(mockAfterEach).toHaveBeenCalledOnce()
    // Simulate a route change
    const hook = mockAfterEach.mock.calls[0][0]
    hook({ name: "dashboard" })
    expect(mockCapture).toHaveBeenCalledWith("page_view", { route_name: "dashboard" })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/plugins/posthog.test.ts
```

Expected: FAIL — module not found or plugin doesn't exist yet.

**Step 3: Create the plugin**

Create `plugins/posthog.client.ts`:

```typescript
import posthog from "posthog-js"

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  if (!config.public.posthogKey) return

  posthog.init(config.public.posthogKey, {
    api_host: config.public.posthogHost,
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
  })

  const router = useRouter()
  router.afterEach((to) => {
    posthog.capture("page_view", { route_name: to.name })
  })

  return {
    provide: { posthog },
  }
})
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/unit/plugins/posthog.test.ts
```

Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add plugins/posthog.client.ts tests/unit/plugins/posthog.test.ts
git commit -m "feat(analytics): add PostHog plugin with page view tracking"
```

---

### Task 3: Instrument product events in composables

**Files:**
- Modify: `composables/useSchools.ts` (line ~293, `createSchool`)
- Modify: `composables/useCoaches.ts` (find `createCoach` function)
- Modify: `composables/useFamilyInvite.ts` (find send invite action)
- Modify: `composables/useRecruitingPacket.ts` (find generate/email action)
- Modify: `composables/useOnboarding.ts` (find step completion)
- Modify: `server/api/family/invite/[token]/accept.post.ts` (server-side: family invite accepted)

**The pattern for all composable event calls:**

```typescript
// At top of composable function body:
const { $posthog } = useNuxtApp()

// After a successful async action:
$posthog?.capture("school_added", { school_type: schoolData.schoolType ?? null })
```

The `?.` guard is critical — it handles dev environments (no key) and test environments (no plugin) gracefully. Never let analytics calls throw or block user actions.

**Step 1: Write tests for school_added event**

Add to `tests/unit/composables/useSchools.test.ts` (or create if not exists):

```typescript
it("captures school_added event after successful createSchool", async () => {
  const mockCapture = vi.fn()
  vi.mocked(useNuxtApp).mockReturnValue({
    $posthog: { capture: mockCapture },
  } as ReturnType<typeof useNuxtApp>)

  // ... set up supabase mock to return a valid school ...
  await createSchool({ name: "Test U", schoolType: "university", /* ... */ })

  expect(mockCapture).toHaveBeenCalledWith("school_added", expect.objectContaining({
    school_type: "university",
  }))
})
```

Follow the same pattern for each event. Run failing tests first, then add the capture calls.

**Step 2: Add `school_added` to `useSchools.ts`**

Find the `createSchool` function (line ~293). After the Supabase insert succeeds and before returning, add:

```typescript
const { $posthog } = useNuxtApp()
$posthog?.capture("school_added", { school_type: schoolData.schoolType ?? null })
```

**Step 3: Add `coach_added` to `useCoaches.ts`**

Find the create coach function. After success:

```typescript
const { $posthog } = useNuxtApp()
$posthog?.capture("coach_added")
```

**Step 4: Add `family_invite_sent` to `useFamilyInvite.ts`**

Find the send invite function. After success:

```typescript
const { $posthog } = useNuxtApp()
$posthog?.capture("family_invite_sent", { method: "email" })
```

If there's a code-based invite path, use `{ method: "code" }` there.

**Step 5: Add `recruiting_packet_generated` to `useRecruitingPacket.ts`**

Find the generate/email function. After success:

```typescript
const { $posthog } = useNuxtApp()
$posthog?.capture("recruiting_packet_generated")
```

**Step 6: Add `onboarding_step_completed` to `useOnboarding.ts`**

Find the step advancement logic. After each step completes:

```typescript
const { $posthog } = useNuxtApp()
$posthog?.capture("onboarding_step_completed", { step: currentStep.value })
```

**Step 7: Add `family_invite_accepted` to `server/api/family/invite/[token]/accept.post.ts`**

This is a server-side handler — PostHog has a Node.js client but it's simpler to let the client track this. In the accept handler, the API already returns success — the client page that calls this endpoint should fire the event. Find the page/composable that calls `/api/family/invite/[token]/accept` and add there:

```typescript
const { $posthog } = useNuxtApp()
$posthog?.capture("family_invite_accepted")
```

**Step 8: Run all tests**

```bash
npm test
```

Expected: all existing tests pass, new event tests pass.

**Step 9: Commit**

```bash
git add composables/useSchools.ts composables/useCoaches.ts composables/useFamilyInvite.ts \
  composables/useRecruitingPacket.ts composables/useOnboarding.ts \
  tests/unit/composables/
git commit -m "feat(analytics): instrument product events in composables"
```

---

## Phase 2 — Tailwind v4 Upgrade

> **Warning:** This is the highest-risk phase. Read every step before starting. Do not merge until the full visual smoke test passes.

### Task 4: Run the official upgrade tool

**Files:** Multiple (tool determines which)

**Step 1: Run the upgrade tool**

```bash
npx @tailwindcss/upgrade@next
```

This tool will:
- Update `tailwindcss`, `postcss` in package.json
- Install `@tailwindcss/postcss`
- Rewrite `@tailwind base/components/utilities` → `@import "tailwindcss"` in `main.css`
- Rename deprecated utility classes across all `.vue`, `.ts` files
- Update `nuxt.config.ts` postcss section

**Step 2: Review what changed**

```bash
git diff --stat
```

Review each changed file carefully. Common things to verify:
- `nuxt.config.ts` postcss config now uses `@tailwindcss/postcss`
- `assets/css/main.css` now starts with `@import "tailwindcss"` (not `@tailwind` directives)
- Any renamed classes (check the diff for `shadow-sm`, `ring-*`, `blur-sm` etc. — these renamed in v4)

**Step 3: Run type-check and tests**

```bash
npm run type-check && npm test
```

Expected: all pass. If tests fail, check for component rendering issues — some snapshot tests may need updating if class names changed.

**Step 4: Start dev server and do a quick visual check**

```bash
npm run dev
```

Open http://localhost:3003 and check:
- Dashboard renders correctly
- No broken styles (missing colors, spacing, shadows)
- No console errors about unknown utilities

**Step 5: Commit the upgrade tool output**

```bash
git add -A
git commit -m "chore: run @tailwindcss/upgrade for v4 migration"
```

---

### Task 5: Migrate custom brand colors to CSS @theme

**Files:**
- Modify: `assets/css/main.css`
- Delete: `tailwind.config.js`
- Delete: `tailwind.config.cjs` (if exists and is duplicate)

**Context:** The project has six custom color families in `tailwind.config.js`: `brand-blue`, `brand-emerald`, `brand-purple`, `brand-orange`, `brand-slate`, `brand-red`. In Tailwind v4, these move to a CSS `@theme {}` block. The JS config file is no longer needed after migration.

**Step 1: Add `@theme` block to `assets/css/main.css`**

After `@import "tailwindcss"` and before any other rules, insert:

```css
@theme {
  /* brand-blue */
  --color-brand-blue-50: #eff6ff;
  --color-brand-blue-100: #dbeafe;
  --color-brand-blue-200: #bfdbfe;
  --color-brand-blue-300: #93c5fd;
  --color-brand-blue-400: #60a5fa;
  --color-brand-blue-500: #3b82f6;
  --color-brand-blue-600: #2563eb;
  --color-brand-blue-700: #1d4ed8;
  --color-brand-blue-800: #1e40af;
  --color-brand-blue-900: #1e3a8a;

  /* brand-emerald */
  --color-brand-emerald-50: #f0fdf4;
  --color-brand-emerald-100: #dcfce7;
  --color-brand-emerald-200: #bbf7d0;
  --color-brand-emerald-300: #86efac;
  --color-brand-emerald-400: #4ade80;
  --color-brand-emerald-500: #10b981;
  --color-brand-emerald-600: #059669;
  --color-brand-emerald-700: #047857;
  --color-brand-emerald-800: #065f46;
  --color-brand-emerald-900: #064e3b;

  /* brand-purple */
  --color-brand-purple-50: #faf5ff;
  --color-brand-purple-100: #f3e8ff;
  --color-brand-purple-200: #e9d5ff;
  --color-brand-purple-300: #d8b4fe;
  --color-brand-purple-400: #c084fc;
  --color-brand-purple-500: #a855f7;
  --color-brand-purple-600: #9333ea;
  --color-brand-purple-700: #7e22ce;
  --color-brand-purple-800: #6b21a8;
  --color-brand-purple-900: #581c87;

  /* brand-orange */
  --color-brand-orange-50: #fff7ed;
  --color-brand-orange-100: #ffedd5;
  --color-brand-orange-200: #fed7aa;
  --color-brand-orange-300: #fdba74;
  --color-brand-orange-400: #fb923c;
  --color-brand-orange-500: #f97316;
  --color-brand-orange-600: #ea580c;
  --color-brand-orange-700: #c2410c;
  --color-brand-orange-800: #9a3412;
  --color-brand-orange-900: #7c2d12;

  /* brand-slate */
  --color-brand-slate-50: #f8fafc;
  --color-brand-slate-100: #f1f5f9;
  --color-brand-slate-200: #e2e8f0;
  --color-brand-slate-300: #cbd5e1;
  --color-brand-slate-400: #94a3b8;
  --color-brand-slate-500: #64748b;
  --color-brand-slate-600: #475569;
  --color-brand-slate-700: #334155;
  --color-brand-slate-800: #1e293b;
  --color-brand-slate-900: #0f172a;

  /* brand-red */
  --color-brand-red-50: #fef2f2;
  --color-brand-red-100: #fee2e2;
  --color-brand-red-200: #fecaca;
  --color-brand-red-300: #fca5a5;
  --color-brand-red-400: #f87171;
  --color-brand-red-500: #ef4444;
  --color-brand-red-600: #dc2626;
  --color-brand-red-700: #b91c1c;
  --color-brand-red-800: #991b1b;
  --color-brand-red-900: #7f1d1d;
}
```

**Step 2: Delete `tailwind.config.js`**

```bash
rm tailwind.config.js tailwind.config.cjs 2>/dev/null; true
```

**Step 3: Build to verify custom colors resolve**

```bash
npm run build
```

If the build fails with "unknown utility" errors for `brand-*` colors, the `@theme` block wasn't picked up. Check that `@import "tailwindcss"` comes before `@theme` and that there are no syntax errors.

**Step 4: Run tests**

```bash
npm test
```

**Step 5: Visual smoke test**

Start dev server and verify brand colors still appear correctly on dashboard, schools list, coaches page.

**Step 6: Commit**

```bash
git add assets/css/main.css
git rm tailwind.config.js tailwind.config.cjs 2>/dev/null; true
git add -A
git commit -m "chore: migrate custom brand colors to CSS @theme, remove tailwind.config.js"
```

---

### Task 6: Full visual smoke test and fix remaining issues

**Files:** Various `.vue` files as needed

**Step 1: Run the full test suite**

```bash
npm run type-check && npm test
```

Fix any failures before continuing.

**Step 2: Visual check of all major pages**

Start dev server (`npm run dev`). Check each:
- [ ] Dashboard — cards, charts, stats tiles
- [ ] Schools list — status badges, school cards
- [ ] School detail — tabs, fit score, status colors
- [ ] Coaches list — table, filters
- [ ] Settings → family management — pending/received/sent/completed cards
- [ ] Settings → account — form fields, buttons
- [ ] Onboarding wizard — step indicators, form inputs

Note any broken utilities. Fix by checking the [Tailwind v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide) for renamed classes.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(styles): resolve Tailwind v4 utility renames after upgrade"
```

---

## Phase 3 — Nuxt UI v3

### Task 7: Install and configure Nuxt UI v3

**Files:**
- Modify: `nuxt.config.ts`
- Create: `app.config.ts`

**Step 1: Install @nuxt/ui**

```bash
npm install @nuxt/ui
```

**Step 2: Add to modules in `nuxt.config.ts`**

```typescript
modules: ["@pinia/nuxt", "@sentry/nuxt/module", "@nuxt/ui"],
```

**Step 3: Create `app.config.ts`** in the project root

Nuxt UI v3 is configured via `app.config.ts`. Map your brand colors to the UI theme:

```typescript
export default defineAppConfig({
  ui: {
    primary: "blue",  // maps to Tailwind's blue scale
    gray: "slate",    // maps to Tailwind's slate scale
  },
})
```

Note: Nuxt UI v3 uses Tailwind's built-in color palette by default. Your custom `brand-*` colors are still available for direct use with `text-brand-blue-500` etc. The `ui.primary` setting controls which color Nuxt UI components use for their default variant.

**Step 4: Verify the app still starts**

```bash
npm run dev
```

Expected: no errors. Nuxt UI auto-imports its components — no explicit import needed.

**Step 5: Run tests**

```bash
npm test
```

Expected: all pass. If Nuxt UI components appear in tests, mock them the same way other auto-imported components are mocked.

**Step 6: Commit**

```bash
git add nuxt.config.ts app.config.ts package.json
git commit -m "feat(ui): install and configure @nuxt/ui v3"
```

---

### Task 8: Migrate one page as proof of concept

**Files:**
- Modify: `pages/settings/account.vue`

**Goal:** Replace custom button/input/form patterns on the account settings page with Nuxt UI equivalents. This establishes the migration pattern for the rest of the codebase.

**Step 1: Read the current file**

Read `pages/settings/account.vue` in full to understand its current structure.

**Step 2: Identify replacement targets**

Look for:
- Custom button patterns like `<button class="...bg-blue-600 text-white...">` → replace with `<UButton>`
- Input fields like `<input class="...border border-gray-300...">` → replace with `<UInput>`
- Form structure → wrap with `<UForm>`
- Status/confirmation messages → replace with `<UAlert>`
- Modal/dialog patterns → replace with `<UModal>`

**Step 3: Apply replacements**

Key component mappings:

```vue
<!-- Before -->
<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Save Changes
</button>

<!-- After -->
<UButton label="Save Changes" />
```

```vue
<!-- Before -->
<input
  v-model="email"
  type="email"
  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
/>

<!-- After -->
<UInput v-model="email" type="email" />
```

```vue
<!-- Before: custom alert/banner -->
<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
  <p class="text-amber-800">Warning message</p>
</div>

<!-- After -->
<UAlert color="warning" description="Warning message" />
```

Nuxt UI docs: https://ui.nuxt.com/components

**Step 4: Run tests for this page**

```bash
npm test -- tests/unit/pages/settings/account
```

Fix any test breakage from changed element selectors.

**Step 5: Visual check**

Check `http://localhost:3003/settings/account` — verify the page renders correctly with the new components.

**Step 6: Commit**

```bash
git add pages/settings/account.vue tests/
git commit -m "refactor(ui): migrate account settings page to Nuxt UI v3 components"
```

---

## Phase 4 — Upstash Rate Limiting

### Task 9: Set up Upstash and install packages

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

**Step 1: Create Upstash account and Redis database**

1. Go to https://upstash.com → sign up (free)
2. Create a new Redis database (select region closest to your Vercel deployment — likely `us-east-1`)
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the database dashboard

**Step 2: Install packages**

```bash
npm install @upstash/redis @upstash/ratelimit
```

**Step 3: Add env vars to `.env.local`**

```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Step 4: Add the same vars to Vercel project settings**

In Vercel dashboard → Project → Settings → Environment Variables, add both vars to Production and Preview environments.

**Step 5: Commit package changes only (never commit .env.local)**

```bash
git add package.json package-lock.json
git commit -m "chore: install @upstash/redis and @upstash/ratelimit"
```

---

### Task 10: Create rate limit utility

**Files:**
- Create: `server/utils/rateLimit.ts`
- Create: `tests/unit/server/utils/rateLimit.test.ts`

**Step 1: Write the failing tests**

Create `tests/unit/server/utils/rateLimit.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createError } from "h3"

const mockLimit = vi.fn()

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({ limit: mockLimit })),
}))

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}))

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>()
  return {
    ...actual,
    getRequestIP: vi.fn().mockReturnValue("127.0.0.1"),
    createError: vi.fn().mockImplementation((opts) => ({ ...opts, _isH3Error: true })),
  }
})

import { rateLimitByIp, rateLimitByUser, throwIfRateLimited } from "~/server/utils/rateLimit"

describe("rateLimitByIp", () => {
  it("returns success result when under limit", async () => {
    const now = Date.now()
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: now + 3600000 })

    const result = await rateLimitByIp({} as never, { requests: 5, window: "1 h" })

    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("uses IP address as rate limit key", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() })

    await rateLimitByIp({} as never, { requests: 5, window: "1 h" })

    expect(mockLimit).toHaveBeenCalledWith("127.0.0.1")
  })
})

describe("rateLimitByUser", () => {
  it("uses userId as rate limit key", async () => {
    mockLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() })

    await rateLimitByUser({} as never, "user-abc", { requests: 10, window: "1 h" })

    expect(mockLimit).toHaveBeenCalledWith("user-abc")
  })
})

describe("throwIfRateLimited", () => {
  it("does not throw when success is true", () => {
    expect(() =>
      throwIfRateLimited({ success: true, reset: Date.now() + 60000 }),
    ).not.toThrow()
  })

  it("throws 429 with Retry-After when rate limit exceeded", () => {
    expect(() =>
      throwIfRateLimited({ success: false, reset: Date.now() + 60000 }),
    ).toThrow()

    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 }),
    )
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/unit/server/utils/rateLimit.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create `server/utils/rateLimit.ts`**

```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getRequestIP, createError } from "h3"
import type { H3Event } from "h3"

interface RateLimitOptions {
  requests: number
  window: `${number} ${"s" | "m" | "h" | "d"}`
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

function createLimiter(options: RateLimitOptions): Ratelimit {
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(options.requests, options.window),
  })
}

export async function rateLimitByIp(
  event: H3Event,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown"
  return createLimiter(options).limit(ip)
}

export async function rateLimitByUser(
  event: H3Event,
  userId: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  return createLimiter(options).limit(userId)
}

export function throwIfRateLimited(result: Pick<RateLimitResult, "success" | "reset">): void {
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: "Too many requests",
      data: { retryAfter },
    })
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- tests/unit/server/utils/rateLimit.test.ts
```

Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add server/utils/rateLimit.ts tests/unit/server/utils/rateLimit.test.ts
git commit -m "feat(security): add Upstash rate limit utility"
```

---

### Task 11: Apply rate limiting to auth endpoints

**Files:**
- Modify: `server/api/auth/request-password-reset.post.ts`
- Modify: `server/api/auth/resend-verification.post.ts`
- Modify: `server/api/auth/verify-email.post.ts`
- Modify: their existing test files (or create new ones alongside)

**The pattern for all auth endpoints:**

```typescript
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit"

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/route-name")

  const rateLimitResult = await rateLimitByIp(event, { requests: 5, window: "1 h" })
  throwIfRateLimited(rateLimitResult)

  // ... rest of existing handler ...
})
```

Place the rate limit check as the **first thing** in the handler, before auth checks or body parsing.

**Step 1: Write test for rate limited response on `request-password-reset`**

Add to the existing test file for this endpoint (find it under `tests/unit/server/api/auth/`):

```typescript
it("returns 429 when rate limit exceeded", async () => {
  vi.mocked(rateLimitByIp).mockResolvedValue({
    success: false,
    limit: 5,
    remaining: 0,
    reset: Date.now() + 3600000,
  })

  await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 429 })
})
```

**Step 2: Add rate limiting to `request-password-reset.post.ts`**

Read the file first, then add at the top of the handler.

**Step 3: Repeat for `resend-verification.post.ts` (5 req/hr) and `verify-email.post.ts` (10 req/hr)**

Same pattern, adjust the `requests` value:
- `resend-verification`: `{ requests: 5, window: "1 h" }`
- `verify-email`: `{ requests: 10, window: "1 h" }`

**Step 4: Run tests**

```bash
npm test -- tests/unit/server/api/auth/
```

Expected: all pass.

**Step 5: Commit**

```bash
git add server/api/auth/request-password-reset.post.ts \
  server/api/auth/resend-verification.post.ts \
  server/api/auth/verify-email.post.ts \
  tests/
git commit -m "feat(security): rate limit auth endpoints (5-10 req/hr per IP)"
```

---

### Task 12: Apply rate limiting to family invite and feedback endpoints

**Files:**
- Modify: `server/api/family/invite.post.ts`
- Modify: `server/api/feedback.post.ts`
- Modify: `server/api/help/feedback.post.ts`
- Modify: `server/api/recruiting-packet/email.post.ts`

**Limits:**
- `family/invite`: `rateLimitByUser(event, userId, { requests: 10, window: "1 h" })` — requires auth first, then use authed user's ID
- `feedback` + `help/feedback`: `rateLimitByIp(event, { requests: 10, window: "1 h" })`
- `recruiting-packet/email`: `rateLimitByUser(event, userId, { requests: 5, window: "24 h" })`

**Important for user-keyed limits:** The user ID must come from the auth check, not the request body. The pattern:

```typescript
const logger = useLogger(event, "family/invite")
const { id: userId } = await requireAuth(event)  // auth first

const rateLimitResult = await rateLimitByUser(event, userId, { requests: 10, window: "1 h" })
throwIfRateLimited(rateLimitResult)
```

**Step 1: Write tests, then add rate limiting to each endpoint**

Follow the same test-first pattern as Task 11. For each endpoint:
1. Write a test that mocks the rate limit utility to return `success: false`
2. Verify the handler throws a 429
3. Add the rate limit call to the handler
4. Run tests

**Step 2: Run all server API tests**

```bash
npm test -- tests/unit/server/api/
```

Expected: all pass.

**Step 3: Commit**

```bash
git add server/api/family/invite.post.ts \
  server/api/feedback.post.ts \
  server/api/help/feedback.post.ts \
  server/api/recruiting-packet/email.post.ts \
  tests/
git commit -m "feat(security): rate limit family invite and feedback endpoints"
```

---

## Phase 5 — Bundle Analysis

### Task 13: Run bundle analysis and verify chunk splitting

**Files:** Modify `nuxt.config.ts` if issues found

**Step 1: Build with analyzer**

```bash
npm run build:check
```

This runs `nuxi build --analyze`. A Rollup visualizer will open in your browser.

**Step 2: Review the visualizer**

Look for:
- **vendor-pdf** (`jspdf`, `html2canvas`, `jspdf-autotable`) — should be a separate chunk, NOT in the entry bundle
- **vendor-charts** (`chart.js`, `vue-chartjs`) — should be a separate chunk
- **vendor-maps** (`leaflet`) — should be a separate chunk
- **posthog-js** — should be small and in the main bundle (it's always loaded)
- Initial entry bundle — should be under ~500KB uncompressed

**Step 3: If vendor-pdf appears in the entry bundle**

This means something is eagerly importing it. Search for the culprit:

```bash
grep -r "jspdf\|html2canvas" components/ pages/ composables/ --include="*.ts" --include="*.vue" -l
```

Wrap the import in `defineAsyncComponent` or a dynamic import:

```typescript
// Instead of:
import jsPDF from "jspdf"

// Use:
const { default: jsPDF } = await import("jspdf")
```

**Step 4: If initial bundle is over 500KB**

Check what's large in the visualizer. Common culprits:
- `@vueuse/core` — only import specific functions: `import { useLocalStorage } from "@vueuse/core"` (already should be tree-shaken)
- `date-fns` — same, only import specific functions
- Any polyfills being included unnecessarily

**Step 5: Commit any changes**

```bash
git add nuxt.config.ts
git commit -m "perf: fix bundle splitting issues found in Rollup analysis"
```

If no issues found, just note it in a comment and move on — no commit needed.

---

## Final Verification

After all phases are complete:

```bash
npm run type-check
npm test
npm run build
```

All three must pass before creating a PR.

Deploy to preview via Vercel (push to `develop`) and verify PostHog events appear in the PostHog dashboard when navigating the app.

---

## Unresolved Questions

- PostHog project API key needs to be obtained and added to Vercel env vars
- Upstash Redis credentials need to be obtained and added to Vercel env vars
- Nuxt UI v3 POC page: `pages/settings/account.vue` chosen as the migration target — change if another page is more representative of current UI patterns
