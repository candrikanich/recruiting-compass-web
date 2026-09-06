# Inbound Email Draft Review (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a family review, confirm, or discard the `pending` `inbound_email_drafts` rows Phase 1 already creates — turning a confirmed draft into a real `interactions` row — and see their family's inbound forwarding address in Settings.

**Architecture:** No new tables and no DB migration. Phase 1's schema already carries everything Phase 2 needs (`inbound_email_drafts.status`, `.confirmed_interaction_id`). New work is three Nitro endpoints (list/confirm/discard) following this repo's existing `server/api/player/profile/contacts/[id]/resolve.post.ts` pattern — admin Supabase client + manual `family_members` ownership check in code, not a new RLS policy (the table stays service-role-only, matching how `profile_contacts` already handles this exact "family reviews an auto-generated draft" shape) — plus a notification fan-out added to the existing webhook handler, a review page, and a Settings addition.

**Tech Stack:** Nuxt 3 / Vue 3 Composition API, Nitro API routes, Supabase (service-role admin client + `family_members` table for authorization), Zod validation, Vitest.

**Spec:** GitHub issue #586, "Phase 2: Draft Interaction UX" section. Phase 1's plan/implementation: `docs/superpowers/plans/2026-09-05-inbound-email-ingestion-phase1.md` (already shipped — see its `.superpowers/sdd/2026-09-05-inbound-email-ingestion-phase1/progress.md` for what's live and the two live bugs found post-ship).

## Global Constraints

- **No DB migration in this plan.** `inbound_email_drafts` already has `status` (text, default unenforced — values used so far: `"pending"`) and `confirmed_interaction_id` (nullable FK → `interactions.id`). If a task below discovers a real schema gap, stop and flag it rather than improvising a migration inline.
- **Prod is now a separate Supabase project (`lrzsenidegcqhwzwncve`)** since the Supabase split (issue #118, landed the same day as Phase 1). QA/dev is `xpxzhqghxecsjhvklsqg`. If any task in this plan turns out to need a migration after all, it must go through the gated `.github/workflows/migrate-prod.yml` (manual approval) for prod — **not** a direct `apply_migration` MCP call like Phase 1 used, because that call target was prod at the time and no longer is.
- `interactions.school_id` is **NOT NULL**. A draft's `matched_school_id` can be `null` (no coach/school match). The confirm endpoint must require a `schoolId` in the request body whenever `matched_school_id` is null — the review UI supplies a school picker for exactly this case.
- `interactions.coach_id` is nullable — an unmatched coach is fine, the interaction just isn't linked to one.
- Follow `server/api/player/profile/contacts/[id]/resolve.post.ts` line for line for the ownership-check and idempotency-guard shape; don't invent a new authorization style for this feature.
- Zod for all request-body validation (repo convention).
- `useLogger(event, "context")` as the first line in every new handler; never leak raw `error.message` in `statusMessage`.

---

### Task 1: `GET /api/inbound-drafts` — list the family's drafts

**Files:**
- Create: `server/api/inbound-drafts/index.get.ts`
- Test: `tests/unit/server/api/inbound-drafts/index.spec.ts`

**Interfaces:**
- Consumes: `requireAuth(event)` (pre-existing, `~/server/utils/auth`) → `{ id: string }`.
- Produces: `GET /api/inbound-drafts?status=pending` (status defaults to `pending`; pass `all` for every status) → `{ drafts: InboundDraftRow[] }` where `InboundDraftRow` is the full `inbound_email_drafts` row shape from `types/database.ts`. Task 4 (UI) consumes this exact response shape.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/inbound-drafts/index.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn, getQuery: vi.fn() };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = { membership: undefined as { family_unit_id: string } | null | undefined };

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: mockState.membership, error: mockState.membership ? null : { code: "PGRST116" } }),
            }),
          }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: [{ id: "draft-1", status: "pending" }], error: null }),
              }),
              order: async () => ({ data: [{ id: "draft-1", status: "pending" }], error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { getQuery } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("GET /api/inbound-drafts", () => {
  beforeEach(() => {
    vi.mocked(getQuery).mockReturnValue({});
    mockState.membership = { family_unit_id: "family-1" };
  });

  it("returns 403 when the caller has no family membership", async () => {
    mockState.membership = null;
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } = await import("~/server/api/inbound-drafts/index.get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns the family's pending drafts by default", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    const { default: handler } = await import("~/server/api/inbound-drafts/index.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ drafts: [{ id: "draft-1", status: "pending" }] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/inbound-drafts/index.spec.ts`
Expected: FAIL — `server/api/inbound-drafts/index.get.ts` does not exist.

- [ ] **Step 3: Write the implementation**

```ts
// server/api/inbound-drafts/index.get.ts
/**
 * GET /api/inbound-drafts
 * Lists the caller's family's inbound-email drafts. Defaults to `pending`
 * only; pass `?status=all` for the full history (confirmed + discarded too).
 */
import { defineEventHandler, getQuery, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/list");
  try {
    const { id: userId } = await requireAuth(event);
    const admin = useSupabaseAdmin();

    const { data: membership, error: membershipError } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (membershipError && membershipError.code !== "PGRST116") {
      logger.error("Failed to resolve family membership", membershipError);
      throw createError({ statusCode: 500, statusMessage: "Failed to load drafts" });
    }
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const status = getQuery(event).status as string | undefined;
    let query = admin
      .from("inbound_email_drafts")
      .select("*")
      .eq("family_unit_id", membership.family_unit_id);
    if (status !== "all") {
      query = query.eq("status", status ?? "pending");
    }
    const { data: drafts, error: draftsError } = await query.order("created_at", {
      ascending: false,
    });
    if (draftsError) {
      logger.error("Failed to list inbound drafts", draftsError);
      throw createError({ statusCode: 500, statusMessage: "Failed to load drafts" });
    }

    return { drafts: drafts ?? [] };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to list inbound drafts", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to load drafts" });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/inbound-drafts/index.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Lint + type-check**

Run: `npx eslint server/api/inbound-drafts/index.get.ts tests/unit/server/api/inbound-drafts/index.spec.ts && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 6: Commit**

```bash
git add server/api/inbound-drafts/index.get.ts tests/unit/server/api/inbound-drafts/index.spec.ts
git commit -m "feat: list endpoint for inbound email drafts"
```

---

### Task 2: `POST /api/inbound-drafts/:id/confirm` — turn a draft into a real interaction

**Files:**
- Create: `server/api/inbound-drafts/[id]/confirm.post.ts`
- Test: `tests/unit/server/api/inbound-drafts/confirm.spec.ts`

**Interfaces:**
- Consumes: `requireAuth`, the `inbound_email_drafts` row shape (Task 1), `interactions` table Insert shape (`family_unit_id`, `school_id` NOT NULL, `coach_id`, `type`, `direction`, `subject`, `content`, `occurred_at`, `logged_by` — all from `types/database.ts`).
- Produces: `POST /api/inbound-drafts/:id/confirm` body `{ schoolId?: string }` (required only when the draft's `matched_school_id` is null) → `{ ok: true, interactionId: string }`. Idempotent: re-confirming an already-confirmed draft returns its existing `confirmed_interaction_id` without creating a duplicate interaction.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/inbound-drafts/confirm.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getRouterParam: vi.fn(),
    readBody: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), { statusCode: opts.statusCode }),
  };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  membership: { family_unit_id: "family-1" } as { family_unit_id: string } | null,
  draft: undefined as Record<string, unknown> | null | undefined,
  insertedInteraction: undefined as Record<string, unknown> | undefined,
  updatedDraft: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: mockState.membership, error: null }) }) }),
        };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: mockState.draft, error: null }) }),
          }),
          update: (row: Record<string, unknown>) => {
            mockState.updatedDraft = row;
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === "interactions") {
        return {
          insert: (row: Record<string, unknown>) => {
            mockState.insertedInteraction = row;
            return {
              select: () => ({ single: async () => ({ data: { id: "interaction-1" }, error: null }) }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { getRouterParam, readBody } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("POST /api/inbound-drafts/:id/confirm", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getRouterParam).mockReturnValue("draft-1");
    vi.mocked(readBody).mockResolvedValue({});
    mockState.membership = { family_unit_id: "family-1" };
    mockState.insertedInteraction = undefined;
    mockState.updatedDraft = undefined;
  });

  it("404s when the draft isn't found or belongs to another family", async () => {
    mockState.draft = null;
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 404 });
  });

  it("422s when unmatched and no schoolId is provided", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "pending",
      matched_school_id: null,
      matched_coach_id: null,
      sender_name: "Coach Smith",
      subject: "Fwd: Camp",
      body_text: "hi",
      occurred_at: "2026-09-02T15:15:00.000Z",
    };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 422 });
  });

  it("creates the interaction and marks the draft confirmed", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "pending",
      matched_school_id: "school-1",
      matched_coach_id: "coach-1",
      subject: "Fwd: Camp",
      body_text: "hi",
      occurred_at: "2026-09-02T15:15:00.000Z",
      confirmed_interaction_id: null,
    };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);

    expect(mockState.insertedInteraction).toMatchObject({
      family_unit_id: "family-1",
      school_id: "school-1",
      coach_id: "coach-1",
      direction: "inbound",
      type: "email",
      logged_by: "user-1",
    });
    expect(mockState.updatedDraft).toMatchObject({
      status: "confirmed",
      confirmed_interaction_id: "interaction-1",
    });
    expect(result).toEqual({ ok: true, interactionId: "interaction-1" });
  });

  it("is idempotent: re-confirming returns the existing interactionId without a new insert", async () => {
    mockState.draft = {
      id: "draft-1",
      family_unit_id: "family-1",
      status: "confirmed",
      confirmed_interaction_id: "interaction-existing",
    };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/confirm.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ ok: true, interactionId: "interaction-existing" });
    expect(mockState.insertedInteraction).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/inbound-drafts/confirm.spec.ts`
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// server/api/inbound-drafts/[id]/confirm.post.ts
/**
 * POST /api/inbound-drafts/:id/confirm
 * Turns a pending inbound-email draft into a real `interactions` row.
 * Requires `schoolId` in the body only when the draft has no matched school
 * (interactions.school_id is NOT NULL). Idempotent — re-confirming an
 * already-confirmed draft returns its existing interaction without
 * duplicating it.
 */
import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const confirmBodySchema = z.object({
  schoolId: z.string().regex(UUID_SHAPE, "Invalid UUID").optional(),
});

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/confirm");
  try {
    const { id: userId } = await requireAuth(event);
    const draftId = getRouterParam(event, "id")!;
    if (!UUID_SHAPE.test(draftId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid draft id" });
    }
    const parsed = confirmBodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }

    const admin = useSupabaseAdmin();

    const { data: membership } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: draft } = await admin
      .from("inbound_email_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    if (!draft || draft.family_unit_id !== membership.family_unit_id) {
      throw createError({ statusCode: 404, statusMessage: "Draft not found" });
    }

    if (draft.status === "confirmed") {
      return { ok: true, interactionId: draft.confirmed_interaction_id };
    }

    const schoolId = draft.matched_school_id ?? parsed.data.schoolId;
    if (!schoolId) {
      throw createError({
        statusCode: 422,
        statusMessage: "schoolId is required — this draft has no matched school",
      });
    }

    const { data: interaction, error: insertError } = await admin
      .from("interactions")
      .insert({
        family_unit_id: draft.family_unit_id,
        school_id: schoolId,
        coach_id: draft.matched_coach_id,
        type: "email",
        direction: "inbound",
        subject: draft.subject,
        content: draft.body_text,
        occurred_at: draft.occurred_at,
        logged_by: userId,
      })
      .select("id")
      .single();
    if (insertError || !interaction) {
      logger.error("Failed to create interaction from draft", insertError);
      throw createError({ statusCode: 500, statusMessage: "Failed to confirm draft" });
    }

    const { error: updateError } = await admin
      .from("inbound_email_drafts")
      .update({ status: "confirmed", confirmed_interaction_id: interaction.id })
      .eq("id", draftId);
    if (updateError) {
      logger.error("Failed to mark draft confirmed", updateError);
      throw createError({ statusCode: 500, statusMessage: "Failed to confirm draft" });
    }

    return { ok: true, interactionId: interaction.id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to confirm inbound draft", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to confirm draft" });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/inbound-drafts/confirm.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Lint + type-check**

Run: `npx eslint server/api/inbound-drafts/[id]/confirm.post.ts tests/unit/server/api/inbound-drafts/confirm.spec.ts && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 6: Commit**

```bash
git add server/api/inbound-drafts/\[id\]/confirm.post.ts tests/unit/server/api/inbound-drafts/confirm.spec.ts
git commit -m "feat: confirm endpoint turns an inbound draft into a real interaction"
```

---

### Task 3: `POST /api/inbound-drafts/:id/discard`

**Files:**
- Create: `server/api/inbound-drafts/[id]/discard.post.ts`
- Test: `tests/unit/server/api/inbound-drafts/discard.spec.ts`

**Interfaces:**
- Consumes: same ownership-check shape as Task 2.
- Produces: `POST /api/inbound-drafts/:id/discard` (no body) → `{ ok: true }`. Idempotent — discarding an already-discarded or already-confirmed draft is a no-op success, never an error (a family shouldn't get a 4xx for double-tapping a button).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/inbound-drafts/discard.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    getRouterParam: vi.fn(),
    createError: (opts: { statusCode: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage ?? "error"), { statusCode: opts.statusCode }),
  };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  membership: { family_unit_id: "family-1" } as { family_unit_id: string } | null,
  draft: undefined as Record<string, unknown> | null | undefined,
  updatedDraft: undefined as Record<string, unknown> | undefined,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: mockState.membership, error: null }) }) }) };
      }
      if (table === "inbound_email_drafts") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockState.draft, error: null }) }) }),
          update: (row: Record<string, unknown>) => {
            mockState.updatedDraft = row;
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { getRouterParam } from "h3";
import { requireAuth } from "~/server/utils/auth";

describe("POST /api/inbound-drafts/:id/discard", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getRouterParam).mockReturnValue("draft-1");
    mockState.membership = { family_unit_id: "family-1" };
    mockState.updatedDraft = undefined;
  });

  it("404s for a draft belonging to another family", async () => {
    mockState.draft = { id: "draft-1", family_unit_id: "family-OTHER", status: "pending" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 404 });
  });

  it("marks a pending draft discarded", async () => {
    mockState.draft = { id: "draft-1", family_unit_id: "family-1", status: "pending" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.updatedDraft).toMatchObject({ status: "discarded" });
    expect(result).toEqual({ ok: true });
  });

  it("is a no-op success for an already-confirmed draft (never overwrites a real interaction link)", async () => {
    mockState.draft = { id: "draft-1", family_unit_id: "family-1", status: "confirmed" };
    const { default: handler } = await import("~/server/api/inbound-drafts/[id]/discard.post");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(mockState.updatedDraft).toBeUndefined();
    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/inbound-drafts/discard.spec.ts`
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
// server/api/inbound-drafts/[id]/discard.post.ts
/**
 * POST /api/inbound-drafts/:id/discard
 * Marks a pending inbound-email draft discarded. Idempotent and never
 * touches a draft that's already `confirmed` — discarding is a no-op
 * success there, since that draft is already linked to a real interaction.
 */
import { defineEventHandler, getRouterParam, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "inbound-drafts/discard");
  try {
    const { id: userId } = await requireAuth(event);
    const draftId = getRouterParam(event, "id")!;
    if (!UUID_SHAPE.test(draftId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid draft id" });
    }

    const admin = useSupabaseAdmin();

    const { data: membership } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: draft } = await admin
      .from("inbound_email_drafts")
      .select("id, family_unit_id, status")
      .eq("id", draftId)
      .maybeSingle();
    if (!draft || draft.family_unit_id !== membership.family_unit_id) {
      throw createError({ statusCode: 404, statusMessage: "Draft not found" });
    }

    if (draft.status !== "pending") {
      return { ok: true };
    }

    const { error: updateError } = await admin
      .from("inbound_email_drafts")
      .update({ status: "discarded" })
      .eq("id", draftId);
    if (updateError) {
      logger.error("Failed to discard draft", updateError);
      throw createError({ statusCode: 500, statusMessage: "Failed to discard draft" });
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to discard inbound draft", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to discard draft" });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/inbound-drafts/discard.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Lint + type-check**

Run: `npx eslint server/api/inbound-drafts/[id]/discard.post.ts tests/unit/server/api/inbound-drafts/discard.spec.ts && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 6: Commit**

```bash
git add server/api/inbound-drafts/\[id\]/discard.post.ts tests/unit/server/api/inbound-drafts/discard.spec.ts
git commit -m "feat: discard endpoint for inbound email drafts"
```

---

### Task 4: Notification fan-out when a draft is created

**Files:**
- Modify: `server/api/webhooks/inbound-email.post.ts:115-123` (the block right after the draft insert succeeds)
- Test: `tests/unit/server/api/webhooks/inbound-email.spec.ts` (extend the existing "creates a matched draft" test + add one new case)

**Interfaces:**
- Consumes: `notifications` table Insert shape (`user_id`, `type`, `title`, `message`, `action_url`, `related_entity_id`, `related_entity_type` — from `types/database.ts`), `family_members` table (`family_unit_id`, `user_id`).
- Produces: nothing new for other tasks — this is a leaf addition to the existing handler.

- [ ] **Step 1: Extend the existing webhook test's mock for `family_members` and `notifications`, and assert the fan-out**

Add to `tests/unit/server/api/webhooks/inbound-email.spec.ts`'s `vi.mock("~/server/utils/supabase", ...)` factory (inside the existing `from` switch, alongside `raw_inbound_emails` and `inbound_email_drafts`):

```ts
      if (table === "family_members") {
        return {
          select: () => ({
            eq: async () => ({ data: [{ user_id: "parent-1" }, { user_id: "player-1" }], error: null }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: (rows: Record<string, unknown>[]) => {
            mockState.notificationRows = rows;
            return Promise.resolve({ error: null });
          },
        };
      }
```

Add `notificationRows: undefined as Record<string, unknown>[] | undefined,` to the existing `mockState` object, reset it in `beforeEach`, and add this assertion to the end of the existing `"creates a matched draft when the forwarded sender matches a coach"` test:

```ts
    expect(mockState.notificationRows).toEqual([
      expect.objectContaining({ user_id: "parent-1", type: "inbound_email_draft" }),
      expect.objectContaining({ user_id: "player-1", type: "inbound_email_draft" }),
    ]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/webhooks/inbound-email.spec.ts`
Expected: FAIL — `mockState.notificationRows` is `undefined`, handler doesn't insert notifications yet.

- [ ] **Step 3: Add the fan-out to the handler**

In `server/api/webhooks/inbound-email.post.ts`, immediately after the existing draft-insert success block (right after the `if (draftError) { ... }` check, before the final `logger.info(...)` / `return { ok: true }`):

```ts
  const { data: familyMembers } = await admin
    .from("family_members")
    .select("user_id")
    .eq("family_unit_id", familyUnitId);
  if (familyMembers && familyMembers.length > 0) {
    const { error: notifyError } = await admin.from("notifications").insert(
      familyMembers.map((member) => ({
        user_id: member.user_id,
        type: "inbound_email_draft",
        title: "New coach email detected",
        message: parsed?.senderName
          ? `A forwarded email from ${parsed.senderName} is ready to review.`
          : "A forwarded email is ready to review.",
        action_url: "/inbox/inbound-drafts",
        related_entity_id: draftInsert.family_unit_id,
        related_entity_type: "inbound_email_draft",
      })),
    );
    if (notifyError) {
      // Never fail the webhook over a notification — Resend already
      // delivered successfully and the draft already exists.
      logger.error("Failed to notify family of new inbound draft", notifyError);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/webhooks/inbound-email.spec.ts`
Expected: PASS (all existing + new assertions)

- [ ] **Step 5: Lint + type-check + full webhook test file**

Run: `npx eslint server/api/webhooks/inbound-email.post.ts tests/unit/server/api/webhooks/inbound-email.spec.ts && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 6: Commit**

```bash
git add server/api/webhooks/inbound-email.post.ts tests/unit/server/api/webhooks/inbound-email.spec.ts
git commit -m "feat: notify family members when an inbound email draft is created"
```

---

### Task 5: `GET /api/family/inbound-address` — expose the family's forwarding address

**Files:**
- Create: `server/api/family/inbound-address.get.ts`
- Create: `nuxt.config.ts` — add one line to `runtimeConfig.public` (see Step 3)
- Test: `tests/unit/server/api/family/inbound-address.spec.ts`

**Interfaces:**
- Consumes: `family_units.inbound_token` (already exists, Phase 1 Task 1 — never exposed to the client before this).
- Produces: `GET /api/family/inbound-address` → `{ address: string }` e.g. `{ "address": "family-5b011cb7@belauso.resend.app" }`. Task 6 (Settings UI) consumes this directly.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/server/api/family/inbound-address.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, defineEventHandler: (fn: unknown) => fn };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

const mockState = {
  membership: { family_unit_id: "family-1" } as { family_unit_id: string } | null,
  family: { inbound_token: "5b011cb7" } as { inbound_token: string } | null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "family_members") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: mockState.membership, error: null }) }) }) };
      }
      if (table === "family_units") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: mockState.family, error: null }) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => ({ public: { inboundEmailDomain: "belauso.resend.app" } }) }));

import { requireAuth } from "~/server/utils/auth";

describe("GET /api/family/inbound-address", () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({ id: "user-1" } as never);
    mockState.membership = { family_unit_id: "family-1" };
    mockState.family = { inbound_token: "5b011cb7" };
  });

  it("returns the full forwarding address", async () => {
    const { default: handler } = await import("~/server/api/family/inbound-address.get");
    const result = await handler({} as Parameters<typeof handler>[0]);
    expect(result).toEqual({ address: "family-5b011cb7@belauso.resend.app" });
  });

  it("403s when the caller has no family", async () => {
    mockState.membership = null;
    const { default: handler } = await import("~/server/api/family/inbound-address.get");
    await expect(handler({} as Parameters<typeof handler>[0])).rejects.toMatchObject({ statusCode: 403 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/family/inbound-address.spec.ts`
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Add the runtime config entry**

In `nuxt.config.ts`, inside `runtimeConfig.public` (alongside the other `NUXT_PUBLIC_*` entries — see `adminHost` for the exact pattern):

```ts
      inboundEmailDomain:
        process.env.NUXT_PUBLIC_INBOUND_EMAIL_DOMAIN || "belauso.resend.app",
```

Note in a comment above it: this is the free Resend subdomain from Phase 1's manual setup (Task 7); update it (and this env var) if/when a custom `inbound.myrecruitingcompass.com` domain replaces it — Phase 1's `parseInboundToken` never checks the domain, so that migration needs no code change beyond this one value.

- [ ] **Step 4: Write the implementation**

```ts
// server/api/family/inbound-address.get.ts
/**
 * GET /api/family/inbound-address
 * Returns the caller's family's full inbound-forwarding email address
 * (family-<token>@<domain>) for display in Settings.
 */
import { defineEventHandler, createError } from "h3";
import { useRuntimeConfig } from "#imports";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/inbound-address");
  try {
    const { id: userId } = await requireAuth(event);
    const admin = useSupabaseAdmin();

    const { data: membership } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: family, error: familyError } = await admin
      .from("family_units")
      .select("inbound_token")
      .eq("id", membership.family_unit_id)
      .single();
    if (familyError || !family) {
      logger.error("Failed to load family inbound token", familyError);
      throw createError({ statusCode: 500, statusMessage: "Failed to load inbound address" });
    }

    const domain = useRuntimeConfig().public.inboundEmailDomain;
    return { address: `family-${family.inbound_token}@${domain}` };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load inbound address", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to load inbound address" });
  }
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/family/inbound-address.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Lint + type-check**

Run: `npx eslint server/api/family/inbound-address.get.ts tests/unit/server/api/family/inbound-address.spec.ts nuxt.config.ts && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 7: Commit**

```bash
git add server/api/family/inbound-address.get.ts tests/unit/server/api/family/inbound-address.spec.ts nuxt.config.ts
git commit -m "feat: expose family inbound-forwarding address via API + runtime config"
```

---

### Task 6: Draft review page

**Files:**
- Create: `pages/inbox/inbound-drafts.vue`
- Create: `composables/useInboundDrafts.ts`
- Test: `tests/unit/composables/useInboundDrafts.spec.ts`

**Interfaces:**
- Consumes: `GET /api/inbound-drafts` (Task 1), `POST /api/inbound-drafts/:id/confirm` (Task 2), `POST /api/inbound-drafts/:id/discard` (Task 3). Client calls MUST use `useAuthFetch().$fetchAuth` (repo convention for authed endpoints — see `claude/logging.md` and `[[authed-composables-use-authfetch]]` project lesson; bare `$fetch` sends no auth cookie and 401s).
- Produces: nothing consumed elsewhere — this is the UI leaf.

- [ ] **Step 1: Write the failing composable test**

```ts
// tests/unit/composables/useInboundDrafts.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchAuthMock = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: fetchAuthMock }),
}));

import { useInboundDrafts } from "~/composables/useInboundDrafts";

describe("useInboundDrafts", () => {
  beforeEach(() => {
    fetchAuthMock.mockReset();
  });

  it("fetches pending drafts on load", async () => {
    fetchAuthMock.mockResolvedValue({ drafts: [{ id: "draft-1", status: "pending" }] });
    const { drafts, fetchDrafts, loading, error } = useInboundDrafts();
    await fetchDrafts();
    expect(fetchAuthMock).toHaveBeenCalledWith("/api/inbound-drafts");
    expect(drafts.value).toEqual([{ id: "draft-1", status: "pending" }]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("removes a draft from the list after confirming it", async () => {
    fetchAuthMock.mockResolvedValueOnce({ drafts: [{ id: "draft-1", status: "pending" }] });
    const { drafts, fetchDrafts, confirmDraft } = useInboundDrafts();
    await fetchDrafts();
    fetchAuthMock.mockResolvedValueOnce({ ok: true, interactionId: "interaction-1" });
    await confirmDraft("draft-1");
    expect(fetchAuthMock).toHaveBeenCalledWith("/api/inbound-drafts/draft-1/confirm", {
      method: "POST",
      body: {},
    });
    expect(drafts.value).toEqual([]);
  });

  it("removes a draft from the list after discarding it", async () => {
    fetchAuthMock.mockResolvedValueOnce({ drafts: [{ id: "draft-1", status: "pending" }] });
    const { drafts, fetchDrafts, discardDraft } = useInboundDrafts();
    await fetchDrafts();
    fetchAuthMock.mockResolvedValueOnce({ ok: true });
    await discardDraft("draft-1");
    expect(fetchAuthMock).toHaveBeenCalledWith("/api/inbound-drafts/draft-1/discard", { method: "POST" });
    expect(drafts.value).toEqual([]);
  });

  it("surfaces a fetch error without throwing", async () => {
    fetchAuthMock.mockRejectedValue(new Error("network down"));
    const { fetchDrafts, error, loading } = useInboundDrafts();
    await fetchDrafts();
    expect(error.value).toBe("Failed to load drafts");
    expect(loading.value).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useInboundDrafts.spec.ts`
Expected: FAIL — composable doesn't exist.

- [ ] **Step 3: Write the composable**

```ts
// composables/useInboundDrafts.ts
import { ref } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { Database } from "~/types/database";

type InboundDraft = Database["public"]["Tables"]["inbound_email_drafts"]["Row"];

export function useInboundDrafts() {
  const drafts = ref<InboundDraft[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const { $fetchAuth } = useAuthFetch();

  async function fetchDrafts() {
    loading.value = true;
    error.value = null;
    try {
      const result = await $fetchAuth<{ drafts: InboundDraft[] }>("/api/inbound-drafts");
      drafts.value = result.drafts;
    } catch {
      error.value = "Failed to load drafts";
    } finally {
      loading.value = false;
    }
  }

  async function confirmDraft(id: string, schoolId?: string) {
    await $fetchAuth(`/api/inbound-drafts/${id}/confirm`, {
      method: "POST",
      body: schoolId ? { schoolId } : {},
    });
    drafts.value = drafts.value.filter((d) => d.id !== id);
  }

  async function discardDraft(id: string) {
    await $fetchAuth(`/api/inbound-drafts/${id}/discard`, { method: "POST" });
    drafts.value = drafts.value.filter((d) => d.id !== id);
  }

  return { drafts, loading, error, fetchDrafts, confirmDraft, discardDraft };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useInboundDrafts.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the page**

```vue
<!-- pages/inbox/inbound-drafts.vue -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useInboundDrafts } from "~/composables/useInboundDrafts";

definePageMeta({ middleware: "auth" });

const { drafts, loading, error, fetchDrafts, confirmDraft, discardDraft } = useInboundDrafts();
const schoolIdByDraft = ref<Record<string, string>>({});

onMounted(fetchDrafts);

async function onConfirm(draftId: string, matchedSchoolId: string | null) {
  await confirmDraft(draftId, matchedSchoolId ? undefined : schoolIdByDraft.value[draftId]);
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="text-xl font-semibold text-brand-slate-900">Coach Emails to Review</h1>

    <DesignSystemLoadingState v-if="loading" />
    <DesignSystemErrorState v-else-if="error" :message="error" @retry="fetchDrafts" />
    <DesignSystemEmptyState
      v-else-if="drafts.length === 0"
      title="No emails to review"
      description="Forward a coach's email to your family's inbound address and it'll show up here."
    />

    <ul v-else class="mt-6 space-y-4">
      <li v-for="draft in drafts" :key="draft.id">
        <DesignSystemCard>
          <p class="font-medium text-brand-slate-900">
            {{ draft.sender_name ?? "Unknown sender" }}
            <span v-if="draft.sender_email" class="text-brand-slate-500">
              &lt;{{ draft.sender_email }}&gt;
            </span>
          </p>
          <p class="text-sm text-brand-slate-600">{{ draft.subject }}</p>
          <p class="mt-2 whitespace-pre-line text-sm text-brand-slate-700">
            {{ draft.body_text }}
          </p>

          <div v-if="!draft.matched_school_id" class="mt-3">
            <DesignSystemFormSelectSchool
              v-model="schoolIdByDraft[draft.id]"
              label="Which school is this from?"
            />
          </div>

          <div class="mt-4 flex gap-2">
            <DesignSystemButton
              :disabled="!draft.matched_school_id && !schoolIdByDraft[draft.id]"
              @click="onConfirm(draft.id, draft.matched_school_id)"
            >
              Confirm
            </DesignSystemButton>
            <DesignSystemButton variant="secondary" @click="discardDraft(draft.id)">
              Discard
            </DesignSystemButton>
          </div>
        </DesignSystemCard>
      </li>
    </ul>
  </div>
</template>
```

**Note for whoever implements this task:** `DesignSystemFormSelectSchool` is illustrative — check `components/DesignSystem/Form/` for the repo's actual existing school-picker component/composable (this codebase already has school search/selection elsewhere, e.g. the schools list page) and use the real one rather than inventing a new one. Read `docs/design/components.md` before touching this file, per this repo's UI convention (`docs/design/tokens.md` + `docs/design/components.md` are required reading before any UI work, per `CLAUDE.md`).

- [ ] **Step 6: Manual verification**

Run `npm run dev`, log in as a demo family with a pending draft (Carter Family / player1@compassdemo.app has one live already — see `[[demo-tester-accounts]]`), visit `/inbox/inbound-drafts`, confirm the draft renders, confirm/discard both work and remove it from the list.

- [ ] **Step 7: Lint + type-check**

Run: `npx eslint pages/inbox/inbound-drafts.vue composables/useInboundDrafts.ts tests/unit/composables/useInboundDrafts.spec.ts && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 8: Commit**

```bash
git add pages/inbox/inbound-drafts.vue composables/useInboundDrafts.ts tests/unit/composables/useInboundDrafts.spec.ts
git commit -m "feat: draft review page for inbound coach emails"
```

---

### Task 7: Settings page — display the family's inbound address

**Files:**
- Modify: `pages/settings/family-management.vue`
- Test: `tests/unit/components/Settings/FamilyManagement.spec.ts` (check the exact existing filename/location for this page's current test coverage before creating a new one — extend it if it exists rather than duplicating)

**Interfaces:**
- Consumes: `GET /api/family/inbound-address` (Task 5), via `useAuthFetch().$fetchAuth` (same convention as Task 6).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Read the current file**

Read `pages/settings/family-management.vue` in full before editing — this task adds a new section to an existing page, it doesn't replace it. Identify where similar read-only "copy this value" UI already exists elsewhere in the app (e.g., the family invite code display, if this page or a sibling has one) and match that exact pattern rather than inventing a new copy-button component.

- [ ] **Step 2: Write the failing test**

Add a test case to whatever spec file already covers this page (or create one following this repo's existing pattern for that page if none exists) asserting: on mount, the page calls `$fetchAuth("/api/family/inbound-address")`, and renders the returned `address` string somewhere in the DOM.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run <the spec file from Step 2>`
Expected: FAIL — the fetch call/render doesn't exist yet.

- [ ] **Step 4: Add the section**

Add a `ref` for the address, an `onMounted` fetch via `useAuthFetch().$fetchAuth("/api/family/inbound-address")`, and a small read-only display block (label + monospace address + a copy-to-clipboard button using `navigator.clipboard.writeText`) in a sensible spot on the page — likely near any existing family-code/invite display, for visual consistency.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run <the spec file from Step 2>`
Expected: PASS

- [ ] **Step 6: Manual verification**

`npm run dev`, visit `/settings/family-management` logged in as a demo family, confirm the address renders and the copy button works (paste somewhere to check).

- [ ] **Step 7: Lint + type-check**

Run: `npx eslint pages/settings/family-management.vue <spec file> && npm run type-check`
Expected: 0 errors both.

- [ ] **Step 8: Commit**

```bash
git add pages/settings/family-management.vue <spec file>
git commit -m "feat: display family's inbound-email forwarding address in settings"
```

---

## Self-Review Notes

- **Spec coverage against issue #586 Phase 2 checklist:** draft review UI (Task 6), confirm/edit/discard (Tasks 2, 3, 6 — "edit" is the school-picker fallback for an unmatched draft, not full field editing; the issue's UX description frames edit as optional/secondary to confirm-or-discard), notification (Task 4), settings display of inbound address (Tasks 5, 7). The issue's own alternate schema idea (`draft_interactions` table, or `interactions` with `status: draft`) is superseded by Phase 1's actual shipped schema (`inbound_email_drafts` + `confirmed_interaction_id` FK) — this plan builds on what's real, not what the issue speculated before Phase 1 existed.
- **Explicitly NOT in this plan** (Phase 3 per the issue, or separate follow-ups): parser-coverage improvements, auto-creating a coach record on unmatched-but-domain-matched senders, attachment-to-document linking, bulk-forward handling, adoption/accuracy analytics, and the iOS share-sheet SMS-logging feature (a wholly separate, non-email mechanism).
- **No migration** — verified live against prod (`lrzsenidegcqhwzwncve`) that `inbound_email_drafts.status` and `.confirmed_interaction_id` already exist and are unused by anything else, so Phase 2 is free to define its own status vocabulary (`pending` → `confirmed` | `discarded`) without a schema change.
- **Type consistency check:** `confirmDraft`/`discardDraft` (Task 6's composable) call the exact routes Tasks 2/3 define (`/api/inbound-drafts/:id/confirm`, `/api/inbound-drafts/:id/discard`); the `{ ok: true, interactionId }` / `{ ok: true }` response shapes match between implementer and composable across all three tasks; `InboundDraft`/`inbound_email_drafts` Row type is referenced consistently in Tasks 1, 5, and 6.
