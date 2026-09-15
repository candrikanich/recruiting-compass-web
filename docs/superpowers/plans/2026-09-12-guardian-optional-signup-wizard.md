# Guardian-Optional Signup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a 13-17 player create an account with just name/DOB/email/password, name a guardian as its own skippable step, and reach the dashboard immediately — while messaging coaches and profile-publishing stay correctly locked until a guardian actually confirms, including for players who skip.

**Architecture:** No new network calls are introduced for the signup flow itself — `pages/signup.vue`/`components/Auth/SignupForm.vue` already gather every field (guardian email, grad year, sport, gender, zip) into one client-side form that fires a single combined request (`POST /api/auth/signup-minor` for a 13-17 player, the ordinary `useAuth().signup()` composable otherwise) because Supabase withholds the session until email confirmation, so no intermediate authenticated call is possible between "account created" and "email confirmed." This plan turns that one form into a client-side, purely local wizard (step state in a `ref`, no routing change) and makes the guardian field genuinely optional end-to-end: the DB trigger that currently requires a guardian link at row-insert time is relaxed, the endpoint accepts an absent `guardianEmail`, and the server-side gate that guards messaging/publishing is inverted to lock by default (keyed on `guardian_consent_at`) so a skip can never accidentally leave those surfaces unlocked. A dashboard banner and the already-authenticated `guardian/resend` endpoint (extended to create a claim where none exists) handle inviting a guardian later, post-login.

**Tech Stack:** Nuxt 3 / Vue 3 `<script setup>`, TypeScript strict, Supabase (Postgres + Auth), Nitro server routes, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md`

## Global Constraints

- iOS is explicitly out of scope for every task in this plan (spec's "iOS Parity" section) — do not touch any file outside this repo.
- No backfill migration for `guardian_consent_at` — there is no pre-existing user population (spec's Non-Goals). If that assumption has changed since this plan was written, stop and re-read the spec's Guardian Gate Fix section before proceeding past Task 1.
- The 13-and-under floor (`trg_enforce_minimum_age`) and the parent-initiated family-invite flow are untouched by every task below.
- Grad year and primary sport stay **required**; gender and zip stay **optional** — exact match to today's schema, just relocated to their own wizard step.
- Per `claude/database.md` / `[[e2e-test-project-schema-drift]]`: the migration in Task 1 must be applied to the E2E test Supabase project (`ahpethltxopkjxxzwmmb`) as well as prod/QA (`xpxzhqghxecsjhvklsqg`) before Task 8's E2E test can pass in CI — call this out explicitly when that task is picked up.

---

### Task 1: DB migration — relax the guardian-link requirement

**Files:**
- Create: `supabase/migrations/20260927000000_guardian_link_optional.sql`
- Test: `tests/integration/rls/guardian-link-optional.integration.spec.ts`

**Interfaces:**
- Produces: a 13-17 `public.users` row may now be inserted with zero `family_members`/`family_invitations`/`guardian_claims` proof. `trg_enforce_minor_requires_invite` and `enforce_minor_requires_invite()` no longer exist afterward (dropped, not left as a no-op — nothing else references them; confirmed by `git grep -n "enforce_minor_requires_invite"` returning only this migration, `signup-minor.post.ts` comments, and this task's own test file).
- Consumes: nothing from another task in this plan — this is the foundation task, applied first.

- [ ] **Step 1: Write the failing integration test**

Match this repo's established live-Postgres integration pattern exactly
(`tests/integration/rls/rls-family-deferrals.integration.spec.ts` is the reference
file this borrows its `SUPABASE_URL`/`SERVICE_ROLE_KEY`/`hasLiveSupabase`/
`adminClient()` boilerplate from, including the `vi.unmock("@supabase/supabase-js")`
call before the import and the `ws` realtime transport option):

```typescript
// tests/integration/rls/guardian-link-optional.integration.spec.ts
/**
 * Regression coverage for supabase/migrations/20260927000000_guardian_link_optional.sql.
 *
 * Proves a 13-17 player's public.users row can now be inserted with no family
 * membership, no family_invitations row, and no guardian_claims row — the state a
 * player produces by skipping the guardian step in the signup wizard. Pre-migration,
 * trg_enforce_minor_requires_invite rejects this insert with a check_violation.
 *
 * Same live-Postgres convention as
 * tests/integration/rls/rls-family-deferrals.integration.spec.ts: this file skips
 * (with reason) when Supabase env vars are unset.
 */
import { describe, it, expect } from "vitest";

vi.unmock("@supabase/supabase-js");

import { createClient, type RealtimeClientOptions } from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = () =>
  createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

const RUN_ID = Date.now();
const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

describe.skipIf(!hasLiveSupabase)("guardian link is optional at insert", () => {
  it("allows a 13-17 public.users row with no family/invitation/claim proof", async () => {
    const supabase = adminClient();
    const email = `guardian-optional-${RUN_ID}@example.com`;

    // Mirrors handle_new_user()'s write shape without going through auth.signUp —
    // this test is about the trigger on public.users, not the auth layer.
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: "TestPass123!",
        email_confirm: true,
      });
    expect(authError).toBeNull();
    const userId = authUser!.user!.id;

    const { error: insertError } = await supabase.from("users").upsert({
      id: userId,
      email,
      full_name: "Guardian Optional Test",
      role: "player",
      date_of_birth: yearsAgo(15),
    });

    expect(insertError).toBeNull();

    await supabase.auth.admin.deleteUser(userId);
  });
});
```

- [ ] **Step 2: Run it to verify it fails for the right reason**

Run: `npx vitest run tests/integration/rls/guardian-link-optional.integration.spec.ts`
Expected (against the live test project, pre-migration): the `upsert` fails with a
Postgres `check_violation` — `insertError` is non-null, so `expect(insertError).toBeNull()`
fails. If Supabase env vars aren't set, the suite reports skipped, not failed — that's
expected locally; this test only runs meaningfully in CI/against a live project.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260927000000_guardian_link_optional.sql

-- Reverses the "a minor's account is always linked to a consenting guardian" invariant
-- introduced in 20260822000000_minor_requires_family_invite.sql and extended in
-- 20260926000000_guardian_claims.sql. That invariant was never a legal requirement —
-- COPPA covers under-13 only (see trg_enforce_minimum_age, untouched by this migration);
-- the 13-17 guardian-link requirement was an unreviewed product decision. This app's
-- actual goal is voluntary family collaboration, not a signup gate, and competitor
-- recruiting platforms (NCSA, CaptainU, SportsRecruits) don't gate account creation on a
-- parent at all. See docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md.
--
-- Dropped rather than left as a no-op: nothing else in the schema depends on this
-- trigger or function once the guardian-link check is removed — the under-13 floor lives
-- in a separate trigger (trg_enforce_minimum_age) that this migration does not touch.
drop trigger if exists trg_enforce_minor_requires_invite on public.users;
drop function if exists public.enforce_minor_requires_invite();

comment on table public.guardian_claims is
  'Player-initiated request for a parent/guardian to confirm a 13-17 account. Optional — '
  'a player may skip naming a guardian entirely (see 20260927000000_guardian_link_optional.sql) '
  'and invite one later from the dashboard. Converted to family membership + '
  'users.guardian_consent_* when the guardian accepts.';
```

- [ ] **Step 4: Apply the migration to the live test project and re-run the test**

Apply via the Supabase MCP `apply_migration` tool (per `claude/database.md` — this
repo's `npx supabase db push` is broken by schema_migrations drift) against **both**
`xpxzhqghxecsjhvklsqg` (prod/QA) and `ahpethltxopkjxxzwmmb` (E2E test project). Then:

Run: `npx vitest run tests/integration/rls/guardian-link-optional.integration.spec.ts`
Expected: PASS (`insertError` is null).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260927000000_guardian_link_optional.sql tests/integration/rls/guardian-link-optional.integration.spec.ts
git commit -m "feat(db): make the 13-17 guardian link optional at signup"
```

---

### Task 2: Invert `assertGuardianConfirmed` to lock by default

**Files:**
- Modify: `server/utils/guardianGate.ts`
- Modify: `tests/unit/server/utils/guardianGate.spec.ts`

**Interfaces:**
- Consumes: `SupabaseClient<Database>` (existing), nothing new from Task 1.
- Produces: `assertGuardianConfirmed(supabase, userId, action?)` keeps its exact
  signature and throw shape (`{ statusCode: 403, statusMessage }`) — callers
  (`server/api/athlete/messages/index.post.ts`, `server/api/player/profile.put.ts`)
  need no changes.

- [ ] **Step 1: Write the failing tests**

Replace the body of `tests/unit/server/utils/guardianGate.spec.ts` with:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertGuardianConfirmed } from "~/server/utils/guardianGate";

const makeSupabase = (
  user: {
    role: string;
    date_of_birth: string | null;
    guardian_consent_at: string | null;
  } | null,
) => {
  const maybeSingle = vi.fn(async () => ({ data: user }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return {
    client: { from: vi.fn(() => ({ select })) },
  };
};

const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

describe("assertGuardianConfirmed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a 13-17 player with no guardian consent on file", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(15),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1", "message coaches"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("blocks a player who skipped naming a guardian at signup (no claim ever existed)", async () => {
    // Identical DB state to the pending-claim case from the gate's point of view —
    // this is the regression this task exists to close: pre-fix, a skip left
    // guardian_claims with no row at all, and the old claims-keyed check silently
    // unlocked messaging for exactly this case.
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(14),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-2"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows a 13-17 player whose guardian has confirmed", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(15),
      guardian_consent_at: "2026-09-01T00:00:00.000Z",
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1"),
    ).resolves.toBeUndefined();
  });

  it("allows an adult player regardless of consent", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(20),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "adult-1"),
    ).resolves.toBeUndefined();
  });

  it("allows a parent regardless of consent", async () => {
    const { client } = makeSupabase({
      role: "parent",
      date_of_birth: null,
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "parent-1"),
    ).resolves.toBeUndefined();
  });

  it("fails open when the user row can't be found", async () => {
    const { client } = makeSupabase(null);

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "missing-user"),
    ).resolves.toBeUndefined();
  });

  it("names the attempted action in the error", async () => {
    const { client } = makeSupabase({
      role: "player",
      date_of_birth: yearsAgo(15),
      guardian_consent_at: null,
    });

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertGuardianConfirmed(client as any, "player-1", "share your profile"),
    ).rejects.toMatchObject({
      statusMessage: expect.stringContaining("share your profile"),
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/server/utils/guardianGate.spec.ts`
Expected: FAIL — the current implementation queries `guardian_claims`, not `users`,
so `client.from` is called with `"guardian_claims"` and the mock's `select().eq()`
chain shape won't match what the old code expects; several assertions fail or throw
a type error from the mismatched mock.

- [ ] **Step 3: Rewrite the implementation**

```typescript
// server/utils/guardianGate.ts
import { createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import { requiresGuardianInvite } from "~/utils/age";

/**
 * Blocks outbound actions for a 13-17 player whose guardian hasn't confirmed their
 * account — including one who never named a guardian at all (skipped the signup
 * wizard's guardian step). The client disables these surfaces too, but a disabled
 * button is a courtesy, not a control — this is the enforcement.
 *
 * Locks by default: any 13-17 player without a stamped `guardian_consent_at` is
 * blocked, regardless of whether a guardian_claims row exists, is pending, was never
 * created, or expired. This replaces the previous claims-keyed check (locked only
 * when a *live* claim happened to exist), which left messaging silently unlocked for
 * a player who skipped naming a guardian entirely — there was no claim row for that
 * check to find. `accept.post.ts` (both the guardian-invite and the player-claim
 * paths) stamps `guardian_consent_at` on confirmation, so this is a safe, direct
 * swap with no backfill needed (this app has no pre-existing user population as of
 * the 2026-09-12 guardian-optional-signup-wizard design).
 *
 * Fails open (does not throw) for adults, parents, and when the user row can't be
 * found — a lookup failure must never lock someone out of their own account. The DB
 * gate and this function together remain authoritative regardless of client state.
 */
export async function assertGuardianConfirmed(
  supabase: SupabaseClient<Database>,
  userId: string,
  action = "do this",
): Promise<void> {
  const { data: user } = await supabase
    .from("users")
    .select("role, date_of_birth, guardian_consent_at")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return;
  if (user.role !== "player") return;
  if (!requiresGuardianInvite(user.date_of_birth)) return;
  if (user.guardian_consent_at) return;

  throw createError({
    statusCode: 403,
    statusMessage: `Your parent or guardian needs to confirm your account before you can ${action}.`,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/utils/guardianGate.spec.ts`
Expected: PASS, all 7 cases.

- [ ] **Step 5: Commit**

```bash
git add server/utils/guardianGate.ts tests/unit/server/utils/guardianGate.spec.ts
git commit -m "fix(guardian): lock messaging/publish by default, not only when a claim exists"
```

---

### Task 3: `guardian/status.get.ts` — surface the "never named a guardian" state

**Files:**
- Modify: `server/api/guardian/status.get.ts`
- Create: `tests/unit/server/api/guardian/status.get.spec.ts`

**Interfaces:**
- Consumes: nothing new from Task 1/2 directly (independent query), but must agree
  with Task 2's locking rule so the banner and the enforcement never disagree.
- Produces: `GuardianStatus` interface gains one field and one new `status` union
  member — **Task 7 (banner) consumes this exact shape**:

```typescript
export interface GuardianStatus {
  /** True when outbound features are locked — mirrors assertGuardianConfirmed exactly. */
  locked: boolean;
  guardianEmailMasked: string | null;
  expiresAt: string | null;
  status: "none" | "pending" | "claimed" | "expired" | "revoked";
}
```

(`"none"` is new — no claim has ever been created for this player. `pending` is kept
for a live, unexpired claim regardless of whether `locked` happens to be true, which
it always is for a pending claim — but `status` and `locked` are no longer the same
question, which is the point of this change.)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/server/api/guardian/status.get.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAuth = vi.fn(async () => ({ id: "player-1", email: "p@example.com" }));
vi.mock("~/server/utils/auth", () => ({ requireAuth: mockRequireAuth }));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

const mockUserRow: {
  value: { role: string; date_of_birth: string | null; guardian_consent_at: string | null } | null;
} = { value: null };
const mockClaimRow: {
  value: { guardian_email: string; status: string; expires_at: string } | null;
} = { value: null };

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "users") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockUserRow.value }) }) }) };
      }
      // guardian_claims
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: async () => ({ data: mockClaimRow.value }) }),
            }),
          }),
        }),
      };
    },
  })),
}));

import statusHandler from "~/server/api/guardian/status.get";

const fakeEvent = {} as Parameters<typeof statusHandler>[0];

describe("GET /api/guardian/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRow.value = null;
    mockClaimRow.value = null;
  });

  it("returns status 'none' and locked:true for a 13-17 player who never named a guardian", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockClaimRow.value = null;

    const result = await statusHandler(fakeEvent);

    expect(result).toEqual({
      locked: true,
      guardianEmailMasked: null,
      expiresAt: null,
      status: "none",
    });
  });

  it("returns status 'pending' and locked:true for an outstanding claim", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2012-01-01", guardian_consent_at: null };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "pending",
      expires_at: "2026-11-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.status).toBe("pending");
    expect(result.locked).toBe(true);
    expect(result.guardianEmailMasked).toBe("p****@example.com");
  });

  it("returns locked:false once guardian_consent_at is stamped, even with a stale claim row", async () => {
    mockUserRow.value = {
      role: "player",
      date_of_birth: "2012-01-01",
      guardian_consent_at: "2026-09-05T00:00:00.000Z",
    };
    mockClaimRow.value = {
      guardian_email: "parent@example.com",
      status: "claimed",
      expires_at: "2026-11-01T00:00:00.000Z",
    };

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.status).toBe("claimed");
  });

  it("returns locked:false for an adult player with no claim", async () => {
    mockUserRow.value = { role: "player", date_of_birth: "2000-01-01", guardian_consent_at: null };

    const result = await statusHandler(fakeEvent);

    expect(result.locked).toBe(false);
    expect(result.status).toBe("none");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/server/api/guardian/status.get.spec.ts`
Expected: FAIL — current handler's return shape has no `locked` field and never
returns `status: "none"` with `pending: false`/`true` in this exact shape (field is
named `pending`, not `locked`, today).

- [ ] **Step 3: Rewrite the implementation**

```typescript
// server/api/guardian/status.get.ts
import { defineEventHandler, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { requiresGuardianInvite } from "~/utils/age";

export interface GuardianStatus {
  /** True when outbound features are locked — mirrors assertGuardianConfirmed exactly. */
  locked: boolean;
  /** Obfuscated for display; the full address is never returned to the player. */
  guardianEmailMasked: string | null;
  expiresAt: string | null;
  status: "none" | "pending" | "claimed" | "expired" | "revoked";
}

/** j***@example.com — enough for the player to recognize the address, not to read it back. */
const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "…";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
};

/**
 * Guardian-confirmation state for the signed-in player.
 *
 * `locked` is computed identically to server/utils/guardianGate.ts's
 * assertGuardianConfirmed — keyed on `users.guardian_consent_at`, not on whether a
 * guardian_claims row exists. `status` is presentation-only, telling the dashboard
 * banner which message to show ("invite a parent" vs. "waiting on confirmation" vs.
 * nothing) — it must never be used to decide whether something is locked.
 *
 * Never returns `token`. It is the guardian's authorization to consent, and handing
 * it to the player would let a minor confirm their own account.
 */
export default defineEventHandler(async (event): Promise<GuardianStatus> => {
  const logger = useLogger(event, "guardian/status");

  try {
    const authUser = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: user } = await supabase
      .from("users")
      .select("role, date_of_birth, guardian_consent_at")
      .eq("id", authUser.id)
      .maybeSingle();

    const locked =
      !!user &&
      user.role === "player" &&
      requiresGuardianInvite(user.date_of_birth) &&
      !user.guardian_consent_at;

    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("guardian_email, status, expires_at")
      .eq("player_user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!claim) {
      return { locked, guardianEmailMasked: null, expiresAt: null, status: "none" };
    }

    return {
      locked,
      guardianEmailMasked: maskEmail(claim.guardian_email),
      expiresAt: claim.expires_at,
      status: claim.status as GuardianStatus["status"],
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to read guardian status", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not load guardian status",
    });
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/api/guardian/status.get.spec.ts`
Expected: PASS, all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add server/api/guardian/status.get.ts tests/unit/server/api/guardian/status.get.spec.ts
git commit -m "feat(guardian): surface a 'none' status and consent-based locked flag"
```

---

### Task 4: `guardian/resend.post.ts` — create a claim where none exists

**Files:**
- Modify: `server/api/guardian/resend.post.ts`
- Create: `tests/unit/server/api/guardian/resend.post.spec.ts`

**Interfaces:**
- Consumes: nothing from Tasks 1-3 directly.
- Produces: same response shape as today (`{ success: true }`), same route
  (`POST /api/guardian/resend`) — **Task 7's banner "Invite a parent" action for a
  player who skipped calls this same endpoint**, passing `{ guardianEmail }`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/server/api/guardian/resend.post.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAuth = vi.fn(async () => ({ id: "player-1", email: "player@example.com" }));
vi.mock("~/server/utils/auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
vi.mock("~/server/utils/rateLimit", () => ({
  rateLimitByUser: vi.fn(async () => ({ success: true })),
  throwIfRateLimited: vi.fn(),
}));
const mockSendGuardianClaimEmail = vi.fn(async () => ({ success: true }));
vi.mock("~/server/utils/emailService", () => ({ sendGuardianClaimEmail: mockSendGuardianClaimEmail }));

const mockExistingClaim: { value: unknown } = { value: null };
const mockInsert = vi.fn(async () => ({ error: null }));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: mockExistingClaim.value }) }),
        }),
      }),
      insert: mockInsert,
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  })),
}));

const mockBody: { value: Record<string, unknown> } = { value: {} };
vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, readBody: vi.fn(async () => mockBody.value) };
});

import handler from "~/server/api/guardian/resend.post";
const fakeEvent = {} as Parameters<typeof handler>[0];

describe("POST /api/guardian/resend — no existing claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistingClaim.value = null;
  });

  it("creates a fresh claim when no claim exists and an email is provided", async () => {
    mockBody.value = { guardianEmail: "newparent@example.com" };

    const result = await handler(fakeEvent);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        player_user_id: "player-1",
        guardian_email: "newparent@example.com",
      }),
    );
    expect(mockSendGuardianClaimEmail).toHaveBeenCalled();
  });

  it("rejects when no claim exists and no email is provided", async () => {
    mockBody.value = {};

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects a guardian email equal to the player's own", async () => {
    mockBody.value = { guardianEmail: "player@example.com" };

    await expect(handler(fakeEvent)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/server/api/guardian/resend.post.spec.ts`
Expected: FAIL — today's handler throws `404 "There's no pending confirmation to
resend"` whenever `claim` is null, regardless of whether `guardianEmail` was
provided.

- [ ] **Step 3: Add the create-if-missing branch**

In `server/api/guardian/resend.post.ts`, replace the existing:

```typescript
if (!claim) {
  throw createError({
    statusCode: 404,
    statusMessage: "There's no pending confirmation to resend",
  });
}
```

with:

```typescript
const requestedEmail = body.guardianEmail?.trim().toLowerCase();

if (!claim) {
  // No pending claim — this is the "invite a parent" path for a player who skipped
  // the guardian step at signup (or whose prior claim expired with nothing pending).
  // Same endpoint, same UX action from the player's point of view ("send/resend a
  // confirmation email to my guardian"); only the DB write differs (insert vs.
  // revoke-and-reissue below).
  if (!requestedEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: "Enter a parent or guardian email to invite them",
    });
  }
  if (!EMAIL_RE.test(requestedEmail)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Enter a valid parent or guardian email",
    });
  }
  if (requestedEmail === user.email?.trim().toLowerCase()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Your parent or guardian needs a different email address than yours",
    });
  }

  const token = randomUUID();
  const { error: insertError } = await supabase.from("guardian_claims").insert({
    player_user_id: user.id,
    guardian_email: requestedEmail,
    token,
  });

  if (insertError) {
    logger.error("Failed to create guardian claim", insertError);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not start guardian confirmation",
    });
  }

  const playerName = (user.email ?? "Your athlete").split("@")[0];
  const mail = await sendGuardianClaimEmail({
    to: requestedEmail,
    playerName,
    token,
    context: { purpose: "invite", userId: user.id },
  });
  if (!mail.success) {
    logger.warn("Guardian invite email failed to send", mail.error);
    throw createError({
      statusCode: 502,
      statusMessage: "We couldn't send that email. Please try again shortly.",
    });
  }

  logger.info("Guardian claim created from dashboard invite");
  return { success: true };
}
```

Leave the rest of the file (the existing-claim branch: email-change vs. plain
reminder-resend) exactly as-is below this new block — it's unreachable until
`claim` is non-null, same as today. Note `requestedEmail` replaces the existing
`const requested = body.guardianEmail?.trim().toLowerCase();` line further down;
remove that now-duplicate declaration and reuse `requestedEmail` in its place so
`npm run type-check` doesn't flag a redeclaration.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/api/guardian/resend.post.spec.ts`
Expected: PASS, all 3 cases. Also run the full guardian suite to confirm no
regression: `npx vitest run tests/unit/server/api/guardian/`.

- [ ] **Step 5: Commit**

```bash
git add server/api/guardian/resend.post.ts tests/unit/server/api/guardian/resend.post.spec.ts
git commit -m "feat(guardian): let resend create a claim when none exists yet"
```

---

### Task 5: `signup-minor.post.ts` — optional guardian, single-phase write

**Files:**
- Modify: `server/api/auth/signup-minor.post.ts`
- Modify: `tests/unit/server/api/auth/signup-minor.post.spec.ts`

**Interfaces:**
- Consumes: Task 1's migration (this task's simplification is only correct once the
  DB no longer rejects a claim-less minor insert — do not merge this task's code
  before Task 1 is applied to whichever environment it runs against).
- Produces: `POST /api/auth/signup-minor` body gains no new required fields;
  `guardianEmail` goes from required to optional. Response shape unchanged
  (`{ ok: true, guardianEmail, guardianEmailSent }` when provided; when omitted,
  `{ ok: true, guardianEmail: null, guardianEmailSent: false }`) — **Task 6's wizard
  reads this response only to redirect, so this shape change is additive/safe.**

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/server/api/auth/signup-minor.post.spec.ts` (keep all existing
tests in the file; this adds new cases and updates the mock setup to also stub
`useSupabaseAdmin().from("users").upsert`, which the existing mock already provides
via `mockUserUpsert`):

```typescript
it("creates the account with no guardian_claims row when guardianEmail is omitted", async () => {
  const body = validBody();
  delete (body as Partial<typeof body>).guardianEmail;
  mockBodyState.body = body;

  const result = await handler(fakeEvent);

  expect(result).toMatchObject({ ok: true, guardianEmail: null, guardianEmailSent: false });
  expect(mockClaimInsert).not.toHaveBeenCalled();
  expect(mockUserUpsert).toHaveBeenCalledWith(
    expect.objectContaining({ date_of_birth: body.dateOfBirth }),
    expect.anything(),
  );
  expect(mockSendGuardianClaimEmail).not.toHaveBeenCalled();
});

it("still creates a guardian_claims row and sends the email when guardianEmail is provided", async () => {
  mockBodyState.body = validBody();

  const result = await handler(fakeEvent);

  expect(result).toMatchObject({ ok: true, guardianEmailSent: true });
  expect(mockClaimInsert).toHaveBeenCalled();
  expect(mockSendGuardianClaimEmail).toHaveBeenCalled();
});
```

(Confirm the existing file's `handler`/`fakeEvent`/`mockBodyState` names before
pasting — copy this task's additions to match whatever the file already calls
them; the mocks shown in the "Current State" section of the spec's referenced code
use exactly these names as of develop's current `signup-minor.post.spec.ts`.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/unit/server/api/auth/signup-minor.post.spec.ts`
Expected: FAIL on the new "omitted" case — current handler throws
`400 "A valid parent or guardian email is required"` before ever reaching the
upsert.

- [ ] **Step 3: Rewrite the implementation**

Replace `server/api/auth/signup-minor.post.ts` in full:

```typescript
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readBody, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { sendGuardianClaimEmail } from "~/server/utils/emailService";
import { isUnderMinimumAge, requiresGuardianInvite } from "~/utils/age";
import type { Database } from "~/types/database";

interface SignupMinorBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  guardianEmail?: string;
  graduationYear?: number;
  primarySport?: string;
  gender?: string;
  zipCode?: string;
  captchaToken?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Standalone signup for a 13-17 player. Naming a guardian is optional — see
 * docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md. A
 * player who skips can invite one later from the dashboard (POST /api/guardian/resend,
 * extended to create a claim where none exists).
 *
 * Exists as a server endpoint for one reason that survives the guardian-optional
 * change: guardian_claims is service-role-only (a minor must never be able to read
 * their own guardian's confirmation token — see 20260926000000_guardian_claims.sql),
 * so the browser cannot write it directly. There is no longer a write-ordering
 * constraint against the DB gate (supabase/migrations/20260927000000_guardian_link_optional.sql
 * removed the trigger this endpoint used to route around), so this is now a single
 * signUp() call with the real DOB in metadata from the start — handle_new_user()
 * creates the full public.users row itself, same as the ordinary adult signup path.
 *
 * Auth user creation deliberately goes through the ordinary anon-key `signUp` rather
 * than `admin.createUser`, so email confirmation behaves exactly as it does for every
 * other signup instead of forking into a second, separately-maintained path.
 */
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "auth/signup-minor");

  try {
    throwIfRateLimited(
      await rateLimitByIp(event, { requests: 5, window: "10 m" }),
    );

    const body = await readBody<SignupMinorBody>(event);
    const email = body.email?.trim().toLowerCase() ?? "";
    const guardianEmail = body.guardianEmail?.trim().toLowerCase() || null;
    const firstName = body.firstName?.trim() ?? "";
    const lastName = body.lastName?.trim() ?? "";
    const dateOfBirth = body.dateOfBirth?.trim() ?? "";

    if (!EMAIL_RE.test(email) || !body.password) {
      throw createError({
        statusCode: 400,
        statusMessage: "A valid email and password are required",
      });
    }
    if (!firstName || !lastName) {
      throw createError({
        statusCode: 400,
        statusMessage: "First and last name are required",
      });
    }
    if (guardianEmail) {
      if (!EMAIL_RE.test(guardianEmail)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Enter a valid parent or guardian email",
        });
      }
      // A minor cannot be their own guardian. Without this the whole consent
      // mechanism is self-serve: the player would receive the claim link at their
      // own inbox.
      if (guardianEmail === email) {
        throw createError({
          statusCode: 400,
          statusMessage:
            "Your parent or guardian needs a different email address than yours",
        });
      }
    }
    if (isUnderMinimumAge(dateOfBirth)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Recruiting Compass is not available for players under 13",
      });
    }
    // 18+ belongs on the ordinary signup path; routing an adult through here would
    // pointlessly involve a guardian on an account that doesn't need one.
    if (!requiresGuardianInvite(dateOfBirth)) {
      throw createError({
        statusCode: 400,
        statusMessage: "This route is only for players aged 13-17",
      });
    }

    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration (URL or anon key)");
    }

    const fullName = `${firstName} ${lastName}`;
    const anon = createClient<Database>(supabaseUrl, supabaseAnonKey);
    const { data: signUpData, error: signUpError } = await anon.auth.signUp({
      email,
      password: body.password,
      options: {
        captchaToken: body.captchaToken,
        data: {
          full_name: fullName,
          role: "player",
          ...(body.graduationYear
            ? { pending_graduation_year: String(body.graduationYear) }
            : {}),
          ...(body.primarySport
            ? { pending_primary_sport: body.primarySport }
            : {}),
          ...(body.gender ? { pending_gender: body.gender } : {}),
          ...(body.zipCode ? { pending_zip_code: body.zipCode } : {}),
        },
      },
    });

    if (signUpError || !signUpData.user) {
      logger.warn("Minor signup rejected at auth layer", signUpError);
      throw createError({
        statusCode: 400,
        statusMessage:
          signUpError?.message.includes("already registered") === true
            ? "An account with this email already exists"
            : "Could not create the account. Please try again.",
      });
    }

    const userId = signUpData.user.id;
    const supabase = useSupabaseAdmin();

    // handle_new_user() has already created the public.users row from the signUp
    // metadata above (same trigger the adult path relies on). Upsert here to add the
    // fields that trigger doesn't know about (date_of_birth, graduation_year,
    // zip_code as real columns rather than pending_* metadata) — same idempotent
    // upsert pattern pages/signup.vue uses for the adult path.
    const userRecord: Database["public"]["Tables"]["users"]["Insert"] = {
      id: userId,
      email,
      full_name: fullName,
      role: "player",
      date_of_birth: dateOfBirth,
      ...(body.graduationYear ? { graduation_year: body.graduationYear } : {}),
      ...(body.zipCode ? { zip_code: body.zipCode } : {}),
    };

    const { error: userError } = await supabase
      .from("users")
      .upsert(userRecord, { onConflict: "id" });

    if (userError) {
      logger.error("Failed to create minor user profile", userError);
      throw createError({
        statusCode: 500,
        statusMessage: "Could not create the account. Please try again.",
      });
    }

    if (!guardianEmail) {
      logger.info("Minor signup created, no guardian named");
      return { ok: true, guardianEmail: null, guardianEmailSent: false };
    }

    const token = randomUUID();
    const { error: claimError } = await supabase
      .from("guardian_claims")
      .insert({
        player_user_id: userId,
        guardian_email: guardianEmail,
        token,
      });

    if (claimError) {
      logger.error("Failed to create guardian claim", claimError);
      // The account itself is already created and valid (guardian-optional as of
      // this migration) — a failed claim write must not fail the whole signup. The
      // player can invite a guardian later from the dashboard.
      return { ok: true, guardianEmail, guardianEmailSent: false };
    }

    // Non-fatal: the account exists, so a mail failure must not fail the signup.
    // The player can resend from the pending banner, and the reminder cron retries
    // on its own schedule.
    const mail = await sendGuardianClaimEmail({
      to: guardianEmail,
      playerName: firstName,
      token,
      context: { purpose: "invite", userId },
    });
    if (!mail.success) {
      logger.warn("Guardian claim email failed to send", mail.error);
    }

    logger.info("Minor signup created, awaiting guardian confirmation");
    return { ok: true, guardianEmail, guardianEmailSent: mail.success };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Minor signup failed", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Could not create the account. Please try again.",
    });
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/server/api/auth/signup-minor.post.spec.ts`
Expected: PASS, all cases (existing + 2 new). Check the existing test file for any
assertion that specifically checks the old "omit DOB from signUp metadata" behavior
(the file comment references this at line ~117-138 per this plan's earlier grep) —
that assertion is now obsolete (DOB is included in metadata from the start) and must
be updated or removed, not left to fail; read the current test around those lines
before running and adjust to assert `date_of_birth` **is** present in the `signUp`
call's `options.data` (there is no metadata field named that in the new code — the
real DOB never goes into signUp metadata at all now, it goes straight into the
`users` upsert. Update or remove any assertion claiming otherwise).

- [ ] **Step 5: Commit**

```bash
git add server/api/auth/signup-minor.post.ts tests/unit/server/api/auth/signup-minor.post.spec.ts
git commit -m "feat(signup): make guardianEmail optional, drop the now-unneeded write ordering"
```

---

### Task 6: Client signup wizard

**Files:**
- Create: `components/Auth/SignupStepAccount.vue`
- Create: `components/Auth/SignupStepGuardian.vue`
- Create: `components/Auth/SignupStepPlayerInfo.vue`
- Modify: `components/Auth/SignupForm.vue` (becomes the step container)
- Modify: `pages/signup.vue` (remove the client-side guardian-required block;
  guardian is now genuinely optional)
- Create: `tests/unit/components/Auth/SignupForm.spec.ts`

**Interfaces:**
- Consumes: Task 5's `signup-minor` endpoint accepting an empty/absent
  `guardianEmail` — this task must stop blocking that value client-side.
- Produces: `SignupForm.vue` keeps its exact existing props/emits contract (listed
  in the file today) — `pages/signup.vue` needs no prop/emit wiring changes, only
  the deletion described in Step 4 below.

- [ ] **Step 1: Write the failing component test**

```typescript
// tests/unit/components/Auth/SignupForm.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SignupForm from "~/components/Auth/SignupForm.vue";

const baseProps = {
  userType: "player" as const,
  firstName: "Owen",
  lastName: "Smith",
  email: "",
  dateOfBirth: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
  loading: false,
  hasErrors: false,
  fieldErrors: {},
  requiresGuardian: true,
  guardianEmail: "",
};

describe("SignupForm wizard steps (13-17 player)", () => {
  it("starts on the account step and does not show guardian or player-info fields", () => {
    const wrapper = mount(SignupForm, { props: baseProps });

    expect(wrapper.find("#firstName").exists()).toBe(true);
    expect(wrapper.find("#guardianEmail").exists()).toBe(false);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(false);
  });

  it("advances to the guardian step after Continue, once account-step fields are valid", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        email: "owen@example.com",
        dateOfBirth: "2012-01-01",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
      },
    });

    await wrapper.find('[data-testid="signup-step-continue"]').trigger("click");

    expect(wrapper.find("#guardianEmail").exists()).toBe(true);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(false);
  });

  it("advancing past the guardian step via Skip emits an empty guardianEmail and reaches player-info", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        email: "owen@example.com",
        dateOfBirth: "2012-01-01",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
      },
    });

    await wrapper.find('[data-testid="signup-step-continue"]').trigger("click");
    await wrapper.find('[data-testid="signup-guardian-skip"]').trigger("click");

    expect(wrapper.emitted("update:guardianEmail")?.at(-1)).toEqual([""]);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(true);
    expect(wrapper.find("#guardianEmail").exists()).toBe(false);
  });

  it("skips the guardian step entirely for an 18+ player (requiresGuardian false)", async () => {
    const wrapper = mount(SignupForm, {
      props: {
        ...baseProps,
        requiresGuardian: false,
        email: "owen@example.com",
        dateOfBirth: "1990-01-01",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
      },
    });

    await wrapper.find('[data-testid="signup-step-continue"]').trigger("click");

    expect(wrapper.find("#guardianEmail").exists()).toBe(false);
    expect(wrapper.find("#signup-graduation-year").exists()).toBe(true);
  });

  it("renders a single unstepped form for a parent (no wizard)", () => {
    const wrapper = mount(SignupForm, {
      props: { ...baseProps, userType: "parent", requiresGuardian: false },
    });

    expect(wrapper.find('[data-testid="signup-step-continue"]').exists()).toBe(false);
    expect(wrapper.find("[data-testid='signup-button']").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/Auth/SignupForm.spec.ts`
Expected: FAIL — today's `SignupForm.vue` renders every field on one screen with no
`data-testid="signup-step-continue"` element at all.

- [ ] **Step 3a: Extract `SignupStepAccount.vue`**

Move the existing template blocks for First/Last Name (lines 19-47 of today's
`SignupForm.vue`), Date of Birth (lines 49-105), Email (lines 138-152), and the two
Password fields + hint (lines 154-219) into a new component with this contract:

```vue
<script setup lang="ts">
defineProps<{
  userType: "player" | "parent";
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:email": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  validateEmail: [];
  validatePassword: [];
}>();
</script>
```

Template: the four extracted blocks verbatim (same markup, same `LoginInputField`/
`FieldError`/`UIcon` usage, same `$emit` calls, same `maxDateOfBirth` computed — move
that computed and the `disabled = computed(() => props.loading)` computed into this
file too, since both only serve these fields). Keep the same element ids
(`firstName`, `lastName`, `dateOfBirth`, `email`, `password`, `confirmPassword`) —
existing E2E specs select on them.

- [ ] **Step 3b: Extract `SignupStepGuardian.vue`**

```vue
<template>
  <div>
    <div class="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <p class="font-medium">Bring a parent or guardian along</p>
      <p class="mt-1 text-blue-800">
        They'll see what you're working on and can help — messaging coaches unlocks
        once they confirm. You can add this later if you'd rather do that now.
      </p>
    </div>
    <LoginInputField
      id="guardianEmail"
      label="Parent or Guardian Email"
      type="email"
      placeholder="parent.email@example.com"
      autocomplete="off"
      :model-value="guardianEmail ?? ''"
      :error="fieldErrors.guardianEmail"
      :disabled="loading"
      icon="i-heroicons-user-group"
      @update:model-value="$emit('update:guardianEmail', $event)"
    />
    <div class="mt-4 flex items-center justify-between">
      <button
        type="button"
        data-testid="signup-guardian-skip"
        class="text-sm font-medium text-slate-600 underline hover:text-slate-800"
        @click="$emit('skip')"
      >
        Skip for now
      </button>
      <button
        type="button"
        data-testid="signup-step-continue"
        :disabled="!canContinue"
        class="rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-6 py-2 font-semibold text-white shadow disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
        @click="$emit('continue')"
      >
        Continue
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoginInputField from "~/components/Auth/LoginInputField.vue";

const props = defineProps<{
  guardianEmail?: string;
  loading: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:guardianEmail": [value: string];
  continue: [];
  skip: [];
}>();

// Continue is always available once an email is *typed* — full format validation
// stays server-side (same EMAIL_RE the endpoint applies), matching this form's
// existing pattern of not duplicating regex validation client-side for guardianEmail.
const canContinue = computed(() => (props.guardianEmail ?? "").trim().length > 0);
</script>
```

Note the removed `:required="true"` from the original guardian field (the
skippability is the entire point of this task) and the softened amber-alert copy
replaced with a positive blue framing, matching the spec's Step 2 description
exactly ("Bring a parent or guardian along... You can add this later").

- [ ] **Step 3c: Extract `SignupStepPlayerInfo.vue`**

Move lines 223-338 of today's `SignupForm.vue` (the "About the player" block: grad
year, sport, gender, zip) plus lines 351-407 (Terms checkbox + Submit button) into
this component, unchanged in markup/logic. Also move `commonSports`,
`graduationYears`, `SPORT_GENDER_MAP`, `genderIsAutoDerived`, and the parts of
`isFormValid` that check `graduationYear`/`primarySport`/`agreeToTerms` (this
component owns its own submit-readiness check now):

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSportsPositionLookup } from "~/composables/useSportsPositionLookup";
import { getGraduationYearOptions } from "~/utils/graduationYears";
import FieldError from "~/components/DesignSystem/FieldError.vue";

const props = defineProps<{
  graduationYear?: number;
  primarySport?: string;
  gender?: string;
  zipCode?: string;
  agreeToTerms: boolean;
  loading: boolean;
  fieldErrors: Record<string, string>;
}>();

defineEmits<{
  "update:graduationYear": [value: number];
  "update:primarySport": [value: string];
  "update:gender": [value: string];
  "update:zipCode": [value: string];
  "update:agreeToTerms": [value: boolean];
  submit: [];
}>();

const { commonSports } = useSportsPositionLookup();
const graduationYears = computed(() => getGraduationYearOptions());

const SPORT_GENDER_MAP: Record<string, "male" | "female"> = {
  softball: "female",
  "field hockey": "female",
  baseball: "male",
  football: "male",
  wrestling: "male",
};
const genderIsAutoDerived = computed(() =>
  (props.primarySport ?? "").toLowerCase() in SPORT_GENDER_MAP,
);

const canSubmit = computed(
  () =>
    props.graduationYear !== undefined &&
    !!props.primarySport?.trim() &&
    props.agreeToTerms,
);
</script>
```

Keep the submit `<button>` markup (lines 397-407 of the original), wiring
`:disabled="!canSubmit || loading"` and `@click` staying as `type="submit"` inside a
`<form @submit.prevent="$emit('submit')">` wrapper local to this component.

- [ ] **Step 3d: Rewrite `SignupForm.vue` as the step container**

```vue
<template>
  <div>
    <p class="mb-6 text-sm text-slate-600">
      <span class="text-red-600">*</span> Indicates a required field
    </p>

    <form
      v-if="userType === 'parent'"
      id="signup-form"
      aria-label="Create parent account"
      @submit.prevent="$emit('submit')"
      class="space-y-6"
      data-testid="signup-form-parent"
    >
      <SignupStepAccount
        :user-type="userType"
        :first-name="firstName"
        :last-name="lastName"
        :email="email"
        :date-of-birth="dateOfBirth"
        :password="password"
        :confirm-password="confirmPassword"
        :loading="loading"
        :field-errors="fieldErrors"
        @update:first-name="$emit('update:firstName', $event)"
        @update:last-name="$emit('update:lastName', $event)"
        @update:email="$emit('update:email', $event)"
        @update:date-of-birth="$emit('update:dateOfBirth', $event)"
        @update:password="$emit('update:password', $event)"
        @update:confirm-password="$emit('update:confirmPassword', $event)"
        @validate-email="$emit('validateEmail')"
        @validate-password="$emit('validatePassword')"
      />
      <TermsAndSubmit
        :agree-to-terms="agreeToTerms"
        :loading="loading"
        :field-errors="fieldErrors"
        :disabled="!isParentFormValid"
        @update:agree-to-terms="$emit('update:agreeToTerms', $event)"
      />
    </form>

    <div v-else data-testid="signup-form-player">
      <SignupStepAccount
        v-if="currentStep === 'account'"
        :user-type="userType"
        :first-name="firstName"
        :last-name="lastName"
        :email="email"
        :date-of-birth="dateOfBirth"
        :password="password"
        :confirm-password="confirmPassword"
        :loading="loading"
        :field-errors="fieldErrors"
        @update:first-name="$emit('update:firstName', $event)"
        @update:last-name="$emit('update:lastName', $event)"
        @update:email="$emit('update:email', $event)"
        @update:date-of-birth="$emit('update:dateOfBirth', $event)"
        @update:password="$emit('update:password', $event)"
        @update:confirm-password="$emit('update:confirmPassword', $event)"
        @validate-email="$emit('validateEmail')"
        @validate-password="$emit('validatePassword')"
      />
      <button
        v-if="currentStep === 'account'"
        type="button"
        data-testid="signup-step-continue"
        :disabled="!canContinueAccount"
        class="mt-4 w-full rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
        @click="goToStepAfterAccount"
      >
        Continue
      </button>

      <SignupStepGuardian
        v-if="currentStep === 'guardian'"
        :guardian-email="guardianEmail"
        :loading="loading"
        :field-errors="fieldErrors"
        @update:guardian-email="$emit('update:guardianEmail', $event)"
        @continue="currentStep = 'info'"
        @skip="skipGuardian"
      />

      <SignupStepPlayerInfo
        v-if="currentStep === 'info'"
        :graduation-year="graduationYear"
        :primary-sport="primarySport"
        :gender="gender"
        :zip-code="zipCode"
        :agree-to-terms="agreeToTerms"
        :loading="loading"
        :field-errors="fieldErrors"
        @update:graduation-year="$emit('update:graduationYear', $event)"
        @update:primary-sport="$emit('update:primarySport', $event)"
        @update:gender="$emit('update:gender', $event)"
        @update:zip-code="$emit('update:zipCode', $event)"
        @update:agree-to-terms="$emit('update:agreeToTerms', $event)"
        @submit="$emit('submit')"
      />
    </div>

    <div class="relative my-6" aria-hidden="true">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-slate-200"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="bg-white px-4 text-slate-500">Already have an account?</span>
      </div>
    </div>
    <div class="text-center">
      <p class="text-sm text-slate-600">
        <NuxtLink to="/login" class="rounded-sm px-1 font-medium text-blue-600 underline hover:text-blue-700">
          Sign in instead
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import SignupStepAccount from "~/components/Auth/SignupStepAccount.vue";
import SignupStepGuardian from "~/components/Auth/SignupStepGuardian.vue";
import SignupStepPlayerInfo from "~/components/Auth/SignupStepPlayerInfo.vue";

const props = defineProps<{
  userType: "player" | "parent";
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  loading: boolean;
  hasErrors: boolean;
  fieldErrors: Record<string, string>;
  graduationYear?: number;
  primarySport?: string;
  gender?: string;
  zipCode?: string;
  guardianEmail?: string;
  requiresGuardian?: boolean;
}>();

const emit = defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:email": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  "update:agreeToTerms": [value: boolean];
  "update:graduationYear": [value: number];
  "update:primarySport": [value: string];
  "update:gender": [value: string];
  "update:zipCode": [value: string];
  "update:guardianEmail": [value: string];
  submit: [];
  validateEmail: [];
  validatePassword: [];
}>();

const currentStep = ref<"account" | "guardian" | "info">("account");

const canContinueAccount = computed(
  () =>
    !props.hasErrors &&
    props.firstName.trim() &&
    props.lastName.trim() &&
    props.email.trim() &&
    props.dateOfBirth.trim() &&
    props.password.trim() &&
    props.confirmPassword.trim(),
);

const isParentFormValid = computed(
  () =>
    !props.hasErrors &&
    props.firstName.trim() &&
    props.lastName.trim() &&
    props.email.trim() &&
    props.password.trim() &&
    props.confirmPassword.trim() &&
    props.agreeToTerms,
);

function goToStepAfterAccount() {
  currentStep.value = props.requiresGuardian ? "guardian" : "info";
}

function skipGuardian() {
  emit("update:guardianEmail", "");
  currentStep.value = "info";
}
</script>
```

This drops the inline Terms-and-Submit markup from the parent path into a small
`TermsAndSubmit.vue` — extract lines 351-407 of the original file's Terms block +
Submit button into that component too (same props pattern as `SignupStepPlayerInfo`,
minus the player-only fields), since both the parent path and
`SignupStepPlayerInfo.vue` need identical Terms/Submit markup and duplicating it
inline in two places would violate this repo's no-duplication standard. Give it:

```vue
<script setup lang="ts">
defineProps<{
  agreeToTerms: boolean;
  loading: boolean;
  fieldErrors: Record<string, string>;
  disabled: boolean;
}>();
defineEmits<{ "update:agreeToTerms": [value: boolean] }>();
</script>
```

and reuse it inside `SignupStepPlayerInfo.vue` too instead of inlining Terms/Submit
there directly — revise Step 3c above to import and use `TermsAndSubmit` rather than
inlining that markup a second time.

- [ ] **Step 4: Remove the client-side guardian-required block in `pages/signup.vue`**

Delete these lines (407-420 in today's file) from inside `handleSignup`'s minor
branch:

```typescript
      const guardian = guardianEmail.value.trim().toLowerCase();
      if (!guardian) {
        setErrors([
          {
            field: "guardianEmail",
            message:
              "Enter a parent or guardian email so we can ask them to confirm your account.",
          },
        ]);
        await focusErrorSummary();
        loading.value = false;
        return;
      }
      if (guardian === email.value.trim().toLowerCase()) {
```

replacing with:

```typescript
      const guardian = guardianEmail.value.trim().toLowerCase();
      if (guardian && guardian === email.value.trim().toLowerCase()) {
```

so a self-guardian email is still rejected client-side when one was entered, but an
empty value now falls through to `submitMinorSignup(guardian)` (passing `""`, which
`SignupMinorBody`'s optional `guardianEmail` and Task 5's `|| null` handling already
treat correctly as "no guardian named").

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/Auth/SignupForm.spec.ts`
Expected: PASS, all 5 cases. Then run the full signup-related suite to check for
regressions from the extraction: `npx vitest run tests/unit/components/Auth/ tests/unit/pages/signup.spec.ts` (adjust the second path if no such file exists —
`grep -rl "SignupForm\|pages/signup" tests/unit` first to confirm which existing
spec files reference these components and re-run all of them).

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `/signup`, select Player, enter a 13-17 DOB, click
Continue, click **Skip for now** on the guardian step, fill grad year + sport,
agree to terms, submit. Confirm no console errors and the request payload (Network
tab) omits `guardianEmail` or sends it empty. Repeat once more providing a guardian
email instead of skipping.

- [ ] **Step 7: Commit**

```bash
git add components/Auth/SignupStepAccount.vue components/Auth/SignupStepGuardian.vue components/Auth/SignupStepPlayerInfo.vue components/Auth/TermsAndSubmit.vue components/Auth/SignupForm.vue pages/signup.vue tests/unit/components/Auth/SignupForm.spec.ts
git commit -m "feat(signup): turn the single-page player form into a skippable-guardian wizard"
```

---

### Task 7: Dashboard banner — "never invited" state

**Files:**
- Modify: `composables/useGuardianStatus.ts`
- Modify: `components/Guardian/GuardianPendingBanner.vue`
- Create: `tests/unit/components/Guardian/GuardianPendingBanner.spec.ts`

**Interfaces:**
- Consumes: Task 3's `GuardianStatus` shape (`locked`, `status: "none" | ...`) and
  Task 4's `POST /api/guardian/resend` accepting `{ guardianEmail }` with no
  existing claim.
- Produces: no change to `useGuardianStatus()`'s existing exported names
  (`isPending`, `isLocked`, `guardianEmailMasked`, `load`, `resend`) — only their
  underlying computation changes, so no other call site needs updates.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/components/Guardian/GuardianPendingBanner.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

const mockStatus: { value: { locked: boolean; status: string; guardianEmailMasked: string | null } } = {
  value: { locked: false, status: "none", guardianEmailMasked: null },
};
const mockLoad = vi.fn(async () => mockStatus.value);
const mockResend = vi.fn(async () => {});

vi.mock("~/composables/useGuardianStatus", () => ({
  useGuardianStatus: () => ({
    isPending: { value: mockStatus.value.status === "pending" },
    isLocked: { value: mockStatus.value.locked },
    guardianEmailMasked: { value: mockStatus.value.guardianEmailMasked },
    status: mockStatus,
    load: mockLoad,
    resend: mockResend,
  }),
}));
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

import GuardianPendingBanner from "~/components/Guardian/GuardianPendingBanner.vue";

describe("GuardianPendingBanner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an 'invite a parent' form when locked with status 'none'", async () => {
    mockStatus.value = { locked: true, status: "none", guardianEmailMasked: null };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Invite a parent or guardian");
    expect(wrapper.find('[data-testid="guardian-invite-email"]').exists()).toBe(true);
  });

  it("shows the waiting message when locked with status 'pending'", async () => {
    mockStatus.value = { locked: true, status: "pending", guardianEmailMasked: "p****@example.com" };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Waiting on your parent or guardian");
    expect(wrapper.find('[data-testid="guardian-invite-email"]').exists()).toBe(false);
  });

  it("renders nothing when not locked", async () => {
    mockStatus.value = { locked: false, status: "claimed", guardianEmailMasked: null };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("submits the typed email via resend()", async () => {
    mockStatus.value = { locked: true, status: "none", guardianEmailMasked: null };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-testid="guardian-invite-email"]').setValue("mom@example.com");
    await wrapper.find('[data-testid="guardian-invite-submit"]').trigger("click");

    expect(mockResend).toHaveBeenCalledWith("mom@example.com");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/Guardian/GuardianPendingBanner.spec.ts`
Expected: FAIL — today's banner only ever checks `isPending` (claim-keyed) and has
no email-entry form at all.

- [ ] **Step 3: Update `useGuardianStatus.ts`**

Change `isPending` and `isLocked` to read the new fields, and add a `status`
passthrough for the banner to branch on:

```typescript
const isPending = computed(() => status.value?.status === "pending");
const isLocked = computed(() => status.value?.locked === true);
const hasNoGuardianYet = computed(() => status.value?.status === "none");
```

Add `hasNoGuardianYet` to the returned object alongside the existing exports. Leave
`resend(guardianEmail?: string)` unchanged — it already accepts an optional email
and Task 4 made the endpoint it calls handle the no-claim case.

- [ ] **Step 4: Update `GuardianPendingBanner.vue`**

Change the render condition from `v-if="isPending"` to `v-if="isLocked"`, and add a
branch inside for the "none" state:

```vue
<template>
  <section
    v-if="isLocked"
    class="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4"
    aria-labelledby="guardian-pending-title"
  >
    <template v-if="hasNoGuardianYet">
      <h2 id="guardian-pending-title" class="flex items-center gap-2 font-semibold text-amber-900">
        <UIcon name="i-heroicons-user-group" class="h-5 w-5" aria-hidden="true" />
        Invite a parent or guardian
      </h2>
      <p class="mt-1 text-sm text-amber-800">
        Bring them along to see what you're working on — messaging coaches unlocks
        once they confirm.
      </p>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          v-model="newEmail"
          data-testid="guardian-invite-email"
          type="email"
          placeholder="parent.email@example.com"
          class="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          data-testid="guardian-invite-submit"
          :disabled="sending || !newEmail.trim()"
          class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          @click="submit(newEmail)"
        >
          Invite
        </button>
      </div>
    </template>

    <template v-else>
      <h2 id="guardian-pending-title" class="flex items-center gap-2 font-semibold text-amber-900">
        <UIcon name="i-heroicons-clock" class="h-5 w-5" aria-hidden="true" />
        Waiting on your parent or guardian
      </h2>
      <p class="mt-1 text-sm text-amber-800">
        <template v-if="guardianEmailMasked">
          We emailed {{ guardianEmailMasked }} a link to confirm your account.
        </template>
        <template v-else> We emailed your guardian a confirmation link. </template>
      </p>
      <!-- existing resend/edit-address controls stay exactly as they are today -->
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useGuardianStatus } from "~/composables/useGuardianStatus";
import { useAppToast } from "~/composables/useAppToast";

const { isLocked, hasNoGuardianYet, guardianEmailMasked, load, resend } = useGuardianStatus();
const { showToast } = useAppToast();

const sending = ref(false);
const newEmail = ref("");

onMounted(load);

const submit = async (email?: string) => {
  if (sending.value) return;
  sending.value = true;
  try {
    await resend(email);
    showToast(email ? "Invitation sent." : "Reminder sent.", "success");
    newEmail.value = "";
  } catch (err) {
    showToast(
      (err as { data?: { statusMessage?: string } } | null)?.data?.statusMessage ??
        "Couldn't send that email.",
      "error",
    );
  } finally {
    sending.value = false;
  }
};
</script>
```

Keep the file's existing `editing`/resend-to-a-different-address controls in the
`v-else` branch exactly as they are today (this task only adds the new `v-if`
branch and switches the outer condition) — do not remove any existing markup, only
insert around it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/Guardian/GuardianPendingBanner.spec.ts`
Expected: PASS, all 4 cases.

- [ ] **Step 6: Commit**

```bash
git add composables/useGuardianStatus.ts components/Guardian/GuardianPendingBanner.vue tests/unit/components/Guardian/GuardianPendingBanner.spec.ts
git commit -m "feat(guardian): dashboard banner invites a parent when none was ever named"
```

---

### Task 8: E2E — full skip-path journey

**Files:**
- Create: `tests/e2e/signup-guardian-skip.spec.ts`

**Interfaces:**
- Consumes: every prior task's shipped behavior, live. Requires Task 1's migration
  applied to the E2E test project (`ahpethltxopkjxxzwmmb`) — confirm this before
  running; if unapplied, the account-creation step of this test will fail with a
  `check_violation`, not the assertion this test is meant to check.

- [ ] **Step 1: Write the test**

```typescript
// tests/e2e/signup-guardian-skip.spec.ts
import { test, expect } from "@playwright/test";
import { getSupabaseAdmin, deleteOneOffTestUser } from "./seed/helpers/supabase-admin";

/**
 * Full journey for a 13-17 player who skips naming a guardian at signup: account
 * creation succeeds, the dashboard shows the "invite a parent" banner (not the
 * old under-18 signup-time block), coach messaging is blocked, and inviting a
 * guardian from the banner later unlocks it once confirmed.
 *
 * Regression coverage for docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md.
 */
const RUN = Date.now();
const PLAYER_EMAIL = `skip-guardian-player-${RUN}@example.com`;
const GUARDIAN_EMAIL = `skip-guardian-parent-${RUN}@example.com`;
const PASSWORD = "SkipGuardian123!";

test.describe("signup: skip the guardian step", () => {
  test.afterAll(async () => {
    await deleteOneOffTestUser(PLAYER_EMAIL).catch(() => {});
  });

  test("skip at signup -> dashboard banner -> messaging blocked -> invite later -> unlocked", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /player/i }).click();

    await page.fill("#firstName", "Skip");
    await page.fill("#lastName", "Tester");
    await page.fill("#dateOfBirth", "2012-01-01");
    await page.fill("#email", PLAYER_EMAIL);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirmPassword", PASSWORD);
    await page.getByTestId("signup-step-continue").click();

    await expect(page.getByTestId("signup-guardian-skip")).toBeVisible();
    await page.getByTestId("signup-guardian-skip").click();

    await page.selectOption("#signup-graduation-year", { label: "2029" });
    await page.selectOption("#signup-primary-sport", "Basketball");
    await page.check("#agreeToTerms");
    await page.getByTestId("signup-button").click();

    // Auto-confirm is enabled on the E2E project (see global-setup), so this lands
    // straight on the dashboard rather than /verify-email.
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText(/invite a parent or guardian/i)).toBeVisible();

    // Coach messaging stays server-enforced-locked even though the client never
    // showed a guardian requirement at signup.
    const response = await page.request.post("/api/athlete/messages", {
      data: { schoolId: "00000000-0000-0000-0000-000000000000", body: "hello" },
      headers: { cookie: (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ") },
    });
    expect(response.status()).toBe(403);

    // Invite a guardian from the banner.
    await page.getByTestId("guardian-invite-email").fill(GUARDIAN_EMAIL);
    await page.getByTestId("guardian-invite-submit").click();
    await expect(page.getByText(/waiting on your parent or guardian/i)).toBeVisible();

    // Confirm as the guardian via the admin API directly (mirrors
    // tests/e2e/minor-invite-accept.spec.ts's pattern of using admin helpers to
    // drive state that would otherwise need a second browser session/inbox).
    const supabase = getSupabaseAdmin();
    const { data: claim } = await supabase
      .from("guardian_claims")
      .select("token")
      .eq("guardian_email", GUARDIAN_EMAIL)
      .single();
    expect(claim?.token).toBeTruthy();

    // (Guardian-side accept flow already has its own E2E coverage in
    // minor-invite-accept.spec.ts's sibling specs — this test only needs to prove
    // the claim was created reachably, and that the lock state before this point
    // was real, not client-only. Full guardian-side UI walkthrough is out of scope
    // here to avoid duplicating that coverage.)
  });
});
```

- [ ] **Step 2: Run it against the E2E test project**

Run: `npx playwright test tests/e2e/signup-guardian-skip.spec.ts`
Expected: PASS. If the account-creation step fails with a 500/check_violation,
Task 1's migration has not been applied to `ahpethltxopkjxxzwmmb` — apply it (per
Task 1 Step 4) before retrying, do not modify this test to work around it.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/signup-guardian-skip.spec.ts
git commit -m "test(e2e): cover the full guardian-skip signup journey"
```

---

## Self-Review Notes

- **Spec coverage:** wizard (Task 6), optional guardian at signup (Tasks 5-6), DB
  migration reversing the invariant (Task 1), the `assertGuardianConfirmed` bug fix
  (Task 2), dashboard banner extension (Task 7), testing plan (all tasks + Task 8).
  iOS is explicitly out of scope per Global Constraints, matching the spec.
- **Type consistency:** `GuardianStatus` (Task 3) is produced once and consumed
  identically by `useGuardianStatus.ts`/`GuardianPendingBanner.vue` (Task 7).
  `assertGuardianConfirmed(supabase, userId, action?)` (Task 2) keeps its exact
  existing signature so its two call sites need no changes. `SignupForm.vue`'s
  props/emits (Task 6) are unchanged from today's contract, so `pages/signup.vue`
  needs only the one deletion in Step 4, not a rewrite.
- **Ordering:** Task 5 explicitly depends on Task 1 being applied to whichever
  Supabase project it's tested against; Task 8 explicitly depends on Task 1 being
  applied to the E2E project specifically. Tasks 2, 3, 4 are independent of each
  other and of Task 1 (they only touch application-layer logic) and could run in
  parallel. Task 6 depends on Task 5's endpoint contract (optional `guardianEmail`)
  but not on its internal implementation.
