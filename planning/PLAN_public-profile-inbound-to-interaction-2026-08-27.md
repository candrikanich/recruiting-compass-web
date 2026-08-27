# Public-profile inbound coach messages → tracked interactions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn inbound coach messages captured on the public player profile (Contact / Express Interest) into first-class, coach-linked `interactions` — auto when the coach email matches, human-assigned otherwise — without spawning orphaned or duplicate coach records.

**Architecture:** Two paths. (A) **Matched** — at submission, if `matchCoachByEmail` finds a coach, the server inserts the `interactions` row (coach's `school_id` satisfies NOT NULL), repoints the existing notification to it, and marks the lead `resolved`. (B) **Unmatched** — the `profile_contacts` lead stays `pending`; the player later resolves it via a client-side assignment modal that reuses existing store actions (school resolve → `createCoach` → `useInteractions.create`, which auto-fires the inbound alert) then calls a small `resolve` endpoint. No coach is ever auto-created from unauthenticated input.

**Tech Stack:** Nuxt 3 / Vue 3 / TypeScript strict, Supabase (service-role admin on server, RLS client-side), Pinia, Vitest (co-located `*.test.ts` + `tests/unit/**`), Playwright E2E. Migrations applied live via Supabase MCP `apply_migration` (repo convention — `npx supabase db push` is broken here).

**Spec:** `planning/DESIGN_public-profile-inbound-to-interaction-2026-08-27.md`

## Global Constraints

- **Never create/mutate a coach or school from unauthenticated public input.** Matching stays read-only (email exact, family-scoped).
- **No schema change to the `interactions` table.** `school_id` and `logged_by` stay NOT NULL; matched path supplies both, unmatched path defers creation until assignment.
- **Single Supabase DB serves prod + QA** (`xpxzhqghxecsjhvklsqg`). Every migration is a prod write. Apply via MCP `apply_migration`, not `db push`.
- **Enum-add is non-transactional in Postgres** — `ALTER TYPE ... ADD VALUE 'interest'` gets its own migration, committed before any code path uses the value.
- **Authed client calls use `useAuthFetch().$fetchAuth`**, never bare `$fetch` (app sets no auth cookie → 401). See MEMORY `authed-composables-use-authfetch`.
- **UTC date boundaries only** — no local `getFullYear()`/`getMonth()` (TZ bugs). Use `occurred_at = new Date().toISOString()`.
- **Design tokens** — no raw hex / rgba in `<style>` or inline; use theme vars / brand utilities; `<DesignSystem*>` for empty/loading/error states. Enforced by `npm run audit:tokens`.
- **iOS parity is a follow-up, not this slice.** Produced interactions already render on iOS; the assignment UI is web-only here. Log an iOS handoff at the end.

---

## File Structure

**Migrations (new, applied via MCP):**
- `supabase/migrations/<ts>_interaction_type_add_interest.sql` — `ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'interest'`.
- `supabase/migrations/<ts>_profile_contacts_status.sql` — add `status` + `interaction_id` + backfill.

**Server:**
- `server/utils/matchCoachByEmail.ts` — MODIFY: return `{ coachId, schoolId }`.
- `server/utils/inboundInteraction.ts` — NEW: pure `buildInboundInteractionRow(...)` + thin `insertInboundInteraction(admin, row)`.
- `server/api/public/profile/[slug]/contact.post.ts` — MODIFY: matched-path insert + notification repoint + lead status.
- `server/api/public/profile/[slug]/interest.post.ts` — MODIFY: same, identity-gated.
- `server/api/player/profile/contacts.get.ts` — MODIFY: select + expose `status`, `interaction_id`.
- `server/api/player/profile/contacts/[id]/resolve.post.ts` — NEW: authed, sets `status` (`resolved`|`dismissed`) + `interaction_id`, family-scoped, double-convert guard.

**Client:**
- `composables/useInteractions.ts` — MODIFY: drop the stale player-only client guard (RLS already allows any family member).
- `composables/useProfileContacts.ts` — MODIFY: carry `status`/`interaction_id`; add `resolveLead`, `dismissLead`.
- `components/profile/AssignCoachModal.vue` — NEW: school-first → coach pick/create → interaction → resolve.
- `components/profile/ProfileInbox.vue` — MODIFY: pending badge, Assign/Dismiss CTAs, pending/resolved filter.

**Enum audit (Task 1):**
- `types/database.ts`, `types/models.ts`, `utils/validation/schemas.ts`, `utils/interactionFormatters.ts`.

---

### Task 1: Add `interest` interaction type + audit all switch/label sites

**Files:**
- Create: `supabase/migrations/<ts>_interaction_type_add_interest.sql`
- Modify: `types/database.ts` (interaction_type union ~3311-3324 + values array ~3498-3511)
- Modify: `types/models.ts:147-160` (InteractionType union)
- Modify: `utils/validation/schemas.ts:166-180` (Zod `type` enum)
- Modify: `utils/interactionFormatters.ts` (4 `Record` maps: icon, bg, color, label)
- Test: `tests/unit/utils/interactionFormatters.spec.ts` (exists) — add `interest` cases

**Interfaces:**
- Produces: interaction_type now includes literal `"interest"`, accepted by `interactionSchema`, formatted as "Interest".

- [ ] **Step 1: Write the failing test** — append to `tests/unit/utils/interactionFormatters.spec.ts`:

```ts
import { getTypeIcon, formatType } from "~/utils/interactionFormatters";

describe("interest interaction type", () => {
  it("formats interest with a label and a non-default icon", () => {
    expect(formatType("interest")).toBe("Interest");
    expect(getTypeIcon("interest")).toBe("i-heroicons-hand-raised");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/interactionFormatters.spec.ts -t "interest interaction type"`
Expected: FAIL — `formatType("interest")` returns the default (`"Other"` via fallback) not `"Interest"`.

- [ ] **Step 3: Write the migration** (`ALTER TYPE` — its own file, no other DDL):

```sql
-- Add 'interest' to interaction_type so Express-Interest submissions log as
-- their own interaction type. Enum ADD VALUE is non-transactional; keep alone.
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'interest';
```

- [ ] **Step 4: Add `interest` to every type site.**

`types/models.ts` — add `| "interest"` to the InteractionType union.
`utils/validation/schemas.ts` — add `"interest",` to the `z.enum([...])` list.
`types/database.ts` — add `| "interest"` to the interaction_type union and `"interest",` to its values array.
`utils/interactionFormatters.ts` — add to all four maps:

```ts
// getTypeIcon icons:
interest: "i-heroicons-hand-raised",
// getTypeIconBg bgs:
interest: "bg-purple-100",
// getTypeIconColor colors:
interest: "text-purple-600",
// formatType typeMap:
interest: "Interest",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/utils/interactionFormatters.spec.ts -t "interest interaction type"`
Expected: PASS.

- [ ] **Step 6: Apply the migration live** (MCP `apply_migration`, name `interaction_type_add_interest`). Then verify:

```sql
SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'interaction_type' AND e.enumlabel = 'interest';
```
Expected: one row.

- [ ] **Step 7: Full type-check + targeted tests**

Run: `npm run type-check && npx vitest run tests/unit/utils/interactionFormatters.spec.ts`
Expected: 0 type errors, all green.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations types/database.ts types/models.ts utils/validation/schemas.ts utils/interactionFormatters.ts tests/unit/utils/interactionFormatters.spec.ts
git commit -m "feat: add 'interest' interaction type + formatter/label/validation support"
```

---

### Task 2: `profile_contacts` gains `status` + `interaction_id` (migration + backfill)

**Files:**
- Create: `supabase/migrations/<ts>_profile_contacts_status.sql`
- Modify: `types/database.ts` (profile_contacts Row/Insert/Update ~2028-2079, + a relationship for `interaction_id`)

**Interfaces:**
- Produces: `profile_contacts.status: 'pending' | 'resolved' | 'dismissed'` (default `'pending'`), `profile_contacts.interaction_id: string | null` (FK interactions, ON DELETE SET NULL).

- [ ] **Step 1: Write the migration**

```sql
-- Resolution state for inbound leads. status gates the inbox pending queue;
-- interaction_id ties a lead to the interaction it produced (match or assign).
ALTER TABLE profile_contacts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'dismissed')),
  ADD COLUMN IF NOT EXISTS interaction_id uuid
    REFERENCES interactions(id) ON DELETE SET NULL;

-- Backfill: rows that already matched a coach are effectively resolved
-- (the interaction will be minted going forward; historic ones have none),
-- everything else is a pending lead awaiting assignment.
UPDATE profile_contacts
  SET status = 'resolved'
  WHERE matched_coach_id IS NOT NULL AND status = 'pending';
```

- [ ] **Step 2: Apply live** (MCP `apply_migration`, name `profile_contacts_status`). Verify:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profile_contacts' AND column_name IN ('status','interaction_id')
ORDER BY column_name;
```
Expected: two rows (`interaction_id`, `status`).

- [ ] **Step 3: Regenerate / hand-edit `types/database.ts`** — add `status: string` and `interaction_id: string | null` to profile_contacts Row, `status?`/`interaction_id?` to Insert and Update, and an `interactions` relationship entry for `interaction_id`.

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations types/database.ts
git commit -m "feat: add status + interaction_id to profile_contacts"
```

---

### Task 3: `matchCoachByEmail` also returns the matched coach's `school_id`

**Files:**
- Modify: `server/utils/matchCoachByEmail.ts`
- Test: `tests/unit/server/utils/matchCoachByEmail.spec.ts` (new)

**Interfaces:**
- Produces: `matchCoachByEmail(admin, { familyUnitId, email }) → Promise<{ coachId: string | null; schoolId: string | null }>`.

- [ ] **Step 1: Write the failing test** (fake client, chainable — mirrors repo mock style):

```ts
import { describe, it, expect } from "vitest";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";

function fakeAdmin(row: { id: string; school_id: string } | null) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    ilike: () => builder,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { from: () => builder } as never;
}

describe("matchCoachByEmail", () => {
  it("returns coachId and schoolId when a coach matches", async () => {
    const res = await matchCoachByEmail(fakeAdmin({ id: "c1", school_id: "s1" }), {
      familyUnitId: "f1",
      email: "coach@school.edu",
    });
    expect(res).toEqual({ coachId: "c1", schoolId: "s1" });
  });

  it("returns nulls when no email is supplied", async () => {
    const res = await matchCoachByEmail(fakeAdmin(null), { familyUnitId: "f1" });
    expect(res).toEqual({ coachId: null, schoolId: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/matchCoachByEmail.spec.ts`
Expected: FAIL — result lacks `schoolId`.

- [ ] **Step 3: Implement** — change the select and return:

```ts
export interface MatchCoachByEmailResult {
  coachId: string | null;
  schoolId: string | null;
}
// ...
  if (!email) return { coachId: null, schoolId: null };

  const { data } = await admin
    .from("coaches")
    .select("id, school_id")
    .eq("family_unit_id", params.familyUnitId)
    .ilike("email", escapeIlike(email))
    .maybeSingle();

  return { coachId: data?.id ?? null, schoolId: data?.school_id ?? null };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/utils/matchCoachByEmail.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/matchCoachByEmail.ts tests/unit/server/utils/matchCoachByEmail.spec.ts
git commit -m "feat: matchCoachByEmail returns matched coach school_id"
```

---

### Task 4: Pure `buildInboundInteractionRow` helper

**Files:**
- Create: `server/utils/inboundInteraction.ts`
- Test: `tests/unit/server/utils/inboundInteraction.spec.ts` (new)

**Interfaces:**
- Produces:
  ```ts
  interface InboundLeadInput {
    kind: "contact" | "interest";
    coachId: string;
    schoolId: string;
    familyUnitId: string;
    loggedBy: string;   // player user id
    note: string | null;
    program: string | null;
    occurredAt: string; // ISO
  }
  function buildInboundInteractionRow(input: InboundLeadInput): InteractionInsert
  async function insertInboundInteraction(admin, row): Promise<{ id: string } | null>
  ```
  `type` = `"email"` for contact, `"interest"` for interest; `direction` = `"inbound"`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildInboundInteractionRow } from "~/server/utils/inboundInteraction";

const base = {
  coachId: "c1", schoolId: "s1", familyUnitId: "f1", loggedBy: "u1",
  note: "We loved your film", program: null, occurredAt: "2026-08-27T00:00:00.000Z",
} as const;

describe("buildInboundInteractionRow", () => {
  it("maps a contact lead to an inbound email interaction", () => {
    const row = buildInboundInteractionRow({ ...base, kind: "contact" });
    expect(row).toMatchObject({
      coach_id: "c1", school_id: "s1", family_unit_id: "f1", logged_by: "u1",
      type: "email", direction: "inbound", occurred_at: base.occurredAt,
      content: "We loved your film",
    });
    expect(row.subject).toContain("public profile");
  });

  it("maps an interest lead to an inbound interest interaction with program in subject", () => {
    const row = buildInboundInteractionRow({
      ...base, kind: "interest", note: null, program: "Pitcher",
    });
    expect(row.type).toBe("interest");
    expect(row.direction).toBe("inbound");
    expect(row.subject).toContain("Pitcher");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/utils/inboundInteraction.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

type InteractionInsert =
  Database["public"]["Tables"]["interactions"]["Insert"];

export interface InboundLeadInput {
  kind: "contact" | "interest";
  coachId: string;
  schoolId: string;
  familyUnitId: string;
  loggedBy: string;
  note: string | null;
  program: string | null;
  occurredAt: string;
}

export function buildInboundInteractionRow(
  input: InboundLeadInput,
): InteractionInsert {
  const subject =
    input.kind === "interest"
      ? `Interest via public profile${input.program ? ` — ${input.program}` : ""}`
      : "Contact via public profile";

  return {
    coach_id: input.coachId,
    school_id: input.schoolId,
    family_unit_id: input.familyUnitId,
    logged_by: input.loggedBy,
    type: input.kind === "interest" ? "interest" : "email",
    direction: "inbound",
    occurred_at: input.occurredAt,
    subject,
    content: input.note,
  };
}

export async function insertInboundInteraction(
  admin: SupabaseClient<Database>,
  row: InteractionInsert,
): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from("interactions")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: data.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/utils/inboundInteraction.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/inboundInteraction.ts tests/unit/server/utils/inboundInteraction.spec.ts
git commit -m "feat: buildInboundInteractionRow + insertInboundInteraction helper"
```

---

### Task 5: Wire the matched path into `contact.post.ts`

**Files:**
- Modify: `server/api/public/profile/[slug]/contact.post.ts`

**Interfaces:**
- Consumes: `matchCoachByEmail` (`{ coachId, schoolId }`), `buildInboundInteractionRow`, `insertInboundInteraction`.
- Behavior: on `matchedCoachId != null`, insert the interaction and set the lead `status: "resolved"` + `interaction_id`; repoint the notification to the interaction. On no match, set `status: "pending"` (default; still write explicitly for clarity). Interaction-insert failure must NOT fail the response — the lead is already stored.

- [ ] **Step 1: Update the match call + lead insert.** Replace the destructure and add status:

```ts
const { coachId: matchedCoachId, schoolId: matchedSchoolId } =
  await matchCoachByEmail(admin, {
    familyUnitId: profile.family_unit_id,
    email: data.coachEmail,
  });
```

In `insertRow`, add:
```ts
status: matchedCoachId ? "resolved" : "pending",
```

- [ ] **Step 2: After the lead insert succeeds, mint the interaction when matched.** Insert this block immediately after `inserted` is confirmed (before the notify block), guarded so a failure never throws:

```ts
let interactionId: string | null = null;
if (matchedCoachId && matchedSchoolId && profile.user_id) {
  try {
    const created = await insertInboundInteraction(
      admin,
      buildInboundInteractionRow({
        kind: "contact",
        coachId: matchedCoachId,
        schoolId: matchedSchoolId,
        familyUnitId: profile.family_unit_id,
        loggedBy: profile.user_id,
        note: data.note,
        program: null,
        occurredAt: new Date().toISOString(),
      }),
    );
    interactionId = created?.id ?? null;
    if (interactionId) {
      await admin
        .from("profile_contacts")
        .update({ interaction_id: interactionId })
        .eq("id", inserted.id);
    }
  } catch (interErr) {
    logger.warn("Failed to create inbound interaction from matched lead", interErr);
  }
}
```

- [ ] **Step 3: Repoint the notification** to the interaction when one exists. In the `notificationRow`, make `related_entity_type`/`related_entity_id` conditional:

```ts
related_entity_type: interactionId ? "interaction" : "profile_contact",
related_entity_id: interactionId ?? inserted.id,
```

- [ ] **Step 4: Import the helpers** at top:

```ts
import {
  buildInboundInteractionRow,
  insertInboundInteraction,
} from "~/server/utils/inboundInteraction";
```

- [ ] **Step 5: Type-check + lint**

Run: `npm run type-check && npx eslint server/api/public/profile/\[slug\]/contact.post.ts`
Expected: 0 errors.

- [ ] **Step 6: Manual verify** with dev server + a seeded matching coach:

Run: `npm run dev`, then (player1 family, a coach whose email is `known@school.edu`):
```bash
curl -s -X POST http://localhost:3000/api/public/profile/<player1-slug>/contact \
  -H 'content-type: application/json' \
  -d '{"coachName":"Known Coach","coachEmail":"known@school.edu","note":"Great film"}'
```
Expected: `{ "ok": true }`. Then query live: `profile_contacts` row `status='resolved'`, `interaction_id` set; an `interactions` row `direction='inbound'`, `type='email'`, `coach_id` = the coach.

- [ ] **Step 7: Commit**

```bash
git add server/api/public/profile/\[slug\]/contact.post.ts
git commit -m "feat: contact submissions from a matched coach create an inbound interaction"
```

---

### Task 6: Wire the matched path into `interest.post.ts` (identity-gated)

**Files:**
- Modify: `server/api/public/profile/[slug]/interest.post.ts`

**Interfaces:**
- Consumes: same helpers as Task 5.
- Behavior: identical to contact, but `kind: "interest"`, `program: data.program`, `note: null` (interest has no note). Only mint when matched (email present + coach found). Identity-less interest → stays `pending` lead-only (decision #5).

- [ ] **Step 1: Update the match destructure** to `{ coachId: matchedCoachId, schoolId: matchedSchoolId }` (mirror Task 5 Step 1).

- [ ] **Step 2: Add `status`** to the lead insert row: `status: matchedCoachId ? "resolved" : "pending",`.

- [ ] **Step 3: Add the mint block** after the lead insert (mirror Task 5 Step 2) with:

```ts
buildInboundInteractionRow({
  kind: "interest",
  coachId: matchedCoachId,
  schoolId: matchedSchoolId,
  familyUnitId: profile.family_unit_id,
  loggedBy: profile.user_id,
  note: null,
  program: data.program,
  occurredAt: new Date().toISOString(),
})
```

- [ ] **Step 4: Repoint the notification** (mirror Task 5 Step 3) and import the helpers.

- [ ] **Step 5: Type-check + lint**

Run: `npm run type-check && npx eslint server/api/public/profile/\[slug\]/interest.post.ts`
Expected: 0 errors.

- [ ] **Step 6: Manual verify** — POST interest with a matching `coachEmail` → `type='interest'` inbound interaction created; POST interest with no email/name → lead `status='pending'`, no interaction.

- [ ] **Step 7: Commit**

```bash
git add server/api/public/profile/\[slug\]/interest.post.ts
git commit -m "feat: matched interest submissions create an inbound interest interaction"
```

---

### Task 7: Expose `status` + `interaction_id` from the leads read endpoint

**Files:**
- Modify: `server/api/player/profile/contacts.get.ts`
- Modify: `composables/useProfileContacts.ts` (type only in this task)

**Interfaces:**
- Produces: each lead in the GET response includes `status: "pending" | "resolved" | "dismissed"` and `interaction_id: string | null`.

- [ ] **Step 1: Extend the SELECT** (add `status, interaction_id`):

```ts
.select(
  "id, type, coach_name, coach_email, coach_title, school_name, program, note, matched_coach_id, status, interaction_id, created_at",
)
```

- [ ] **Step 2: Extend the `ProfileContactLead` interface** in `contacts.get.ts` with `status: "pending" | "resolved" | "dismissed";` and `interaction_id: string | null;`.

- [ ] **Step 3: Mirror the fields** in `composables/useProfileContacts.ts` `ProfileLead` interface (`status`, `interaction_id`).

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add server/api/player/profile/contacts.get.ts composables/useProfileContacts.ts
git commit -m "feat: surface lead status + interaction_id to the inbox"
```

---

### Task 8: `resolve` endpoint — mark a lead resolved/dismissed

**Files:**
- Create: `server/api/player/profile/contacts/[id]/resolve.post.ts`
- Test: `tests/unit/server/api/resolveLead.validation.spec.ts` (new — pure body-schema test)

**Interfaces:**
- Produces: `POST /api/player/profile/contacts/:id/resolve` body `{ status: "resolved" | "dismissed", interactionId?: string }`. Auth: `requireAuth` + `family_members` scope (mirror `contacts.get.ts`). Guards: lead must belong to caller's family; if already `resolved`, no-op return existing `interaction_id` (double-convert guard). `resolved` requires `interactionId`.
- Exports `resolveBodySchema` (Zod) for unit testing.

- [ ] **Step 1: Write the failing test** (schema only — the pure, unit-testable part):

```ts
import { describe, it, expect } from "vitest";
import { resolveBodySchema } from "~/server/api/player/profile/contacts/[id]/resolve.post";

describe("resolveBodySchema", () => {
  it("requires interactionId when status is resolved", () => {
    expect(resolveBodySchema.safeParse({ status: "resolved" }).success).toBe(false);
    expect(
      resolveBodySchema.safeParse({
        status: "resolved",
        interactionId: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("allows dismissed without an interactionId", () => {
    expect(resolveBodySchema.safeParse({ status: "dismissed" }).success).toBe(true);
  });

  it("rejects unknown status", () => {
    expect(resolveBodySchema.safeParse({ status: "open" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/server/api/resolveLead.validation.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the endpoint**

```ts
/**
 * POST /api/player/profile/contacts/:id/resolve
 * Marks an inbound lead resolved (with the interaction the player minted) or
 * dismissed. Family scope resolved server-side from the caller's
 * family_members row. Idempotent: a lead already resolved returns its
 * existing interaction_id without overwriting.
 */
import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { z } from "zod";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

export const resolveBodySchema = z
  .object({
    status: z.enum(["resolved", "dismissed"]),
    interactionId: z.string().uuid().optional(),
  })
  .refine((v) => v.status !== "resolved" || !!v.interactionId, {
    message: "interactionId is required when resolving",
    path: ["interactionId"],
  });

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile/contacts/resolve");
  try {
    const { id: userId } = await requireAuth(event);
    const leadId = getRouterParam(event, "id")!;
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid lead id" });
    }

    const parsed = resolveBodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }

    const admin = useSupabaseAdmin();

    const { data: membership, error: membershipError } = await admin
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();
    if (membershipError && membershipError.code !== "PGRST116") {
      logger.error("Failed to resolve family membership", membershipError);
      throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
    }
    if (!membership) {
      throw createError({ statusCode: 403, statusMessage: "Not a family member" });
    }

    const { data: lead, error: leadErr } = await admin
      .from("profile_contacts")
      .select("id, status, interaction_id, family_unit_id")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr) {
      logger.error("Failed to load lead", leadErr);
      throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
    }
    if (!lead || lead.family_unit_id !== membership.family_unit_id) {
      throw createError({ statusCode: 404, statusMessage: "Lead not found" });
    }

    // Double-convert guard: never overwrite an existing resolution.
    if (lead.status === "resolved") {
      return { ok: true, status: "resolved", interactionId: lead.interaction_id };
    }

    const { error: updErr } = await admin
      .from("profile_contacts")
      .update({
        status: parsed.data.status,
        interaction_id: parsed.data.interactionId ?? null,
      })
      .eq("id", leadId);
    if (updErr) {
      logger.error("Failed to update lead status", updErr);
      throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
    }

    return {
      ok: true,
      status: parsed.data.status,
      interactionId: parsed.data.interactionId ?? null,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to resolve lead", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to resolve lead" });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/server/api/resolveLead.validation.spec.ts`
Expected: PASS.

- [ ] **Step 5: Type-check + lint + manual smoke** (`npm run dev`; authed `$fetchAuth` from the app, or a curl with a valid session): dismiss a pending lead → `status='dismissed'`; resolve without interactionId → 422.

- [ ] **Step 6: Commit**

```bash
git add server/api/player/profile/contacts/\[id\]/resolve.post.ts tests/unit/server/api/resolveLead.validation.spec.ts
git commit -m "feat: resolve endpoint for inbound leads (resolve/dismiss + guards)"
```

---

### Task 9: `useProfileContacts` — `resolveLead` + `dismissLead` actions

**Files:**
- Modify: `composables/useProfileContacts.ts`
- Test: `tests/unit/composables/useProfileContacts.spec.ts` (new)

**Interfaces:**
- Consumes: `POST /api/player/profile/contacts/:id/resolve` via `$fetchAuth`.
- Produces: `resolveLead(id: string, interactionId: string): Promise<void>` and `dismissLead(id: string): Promise<void>`; both refetch on success. Exposed from the composable's return.

- [ ] **Step 1: Write the failing test** (mock `useAuthFetch`, per MEMORY `authed-composables-use-authfetch`):

```ts
import { describe, it, expect, vi } from "vitest";

const fetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: fetchAuth }),
}));

import { useProfileContacts } from "~/composables/useProfileContacts";

describe("useProfileContacts.dismissLead", () => {
  it("POSTs status=dismissed to the resolve endpoint", async () => {
    fetchAuth.mockResolvedValue({ leads: [], counts: {} });
    const { dismissLead } = useProfileContacts();
    await dismissLead("lead-1");
    expect(fetchAuth).toHaveBeenCalledWith(
      "/api/player/profile/contacts/lead-1/resolve",
      { method: "POST", body: { status: "dismissed" } },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useProfileContacts.spec.ts`
Expected: FAIL — `dismissLead` not exported.

- [ ] **Step 3: Implement** — add inside `useProfileContacts`, before `return`:

```ts
async function resolveLead(id: string, interactionId: string): Promise<void> {
  await $fetchAuth(`/api/player/profile/contacts/${id}/resolve`, {
    method: "POST",
    body: { status: "resolved", interactionId },
  });
  await fetchContacts();
}

async function dismissLead(id: string): Promise<void> {
  await $fetchAuth(`/api/player/profile/contacts/${id}/resolve`, {
    method: "POST",
    body: { status: "dismissed" },
  });
  await fetchContacts();
}
```

Add `resolveLead, dismissLead` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useProfileContacts.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add composables/useProfileContacts.ts tests/unit/composables/useProfileContacts.spec.ts
git commit -m "feat: resolveLead + dismissLead actions on useProfileContacts"
```

---

### Task 9B: Loosen `createInteraction` to any family member (parent OR player)

**Why:** Parents and players work the recruiting record together — the app's core premise. The `interactions` RLS INSERT policy **already** allows any family member (`20260826000000_allow_family_members_create_interactions.sql`, live since 2026-08-26: `logged_by = auth.uid()` + family membership, role gate dropped). Only the stale **client** guard still blocks parents. This aligns the client with the shipped RLS so a parent can log interactions and assign inbound coaches on the player's behalf. Must land before Task 10 (the assign modal calls `createInteraction`).

**Files:**
- Modify: `composables/useInteractions.ts:253-256` (remove the role throw)
- Modify: `tests/unit/composables/useInteractions.advanced.spec.ts:~299` (flip the now-stale assertion)

**Interfaces:**
- Produces: `createInteraction` succeeds for any authenticated family member; still requires `userStore.user` and an active family context; still stamps `logged_by: userStore.user.id` (satisfies RLS `logged_by = auth.uid()`).

- [ ] **Step 1: Flip the stale test.** The existing test at `useInteractions.advanced.spec.ts:~299` asserts a parent-role user throws `"Only players can create interactions"`. That assertion is stale vs. the shipped RLS. Rewrite it to assert a parent-role user **can** create — mirror an existing passing create test's arrange/mock, set the user role to `"parent"`, and assert the insert path is reached (no throw; `supabase.from("interactions").insert` called). Keep the "not authenticated" and "no family context" guard tests unchanged.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/composables/useInteractions.advanced.spec.ts`
Expected: FAIL — parent still throws because the guard is still in place.

- [ ] **Step 3: Remove the role guard** in `composables/useInteractions.ts` (delete these lines):

```ts
    if (userStore.user.role !== "player") {
      throw new Error("Only players can create interactions");
    }
```

Leave the `if (!userStore.user)` and `if (!activeFamily.activeFamilyId.value)` guards intact.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/composables/useInteractions.advanced.spec.ts`
Expected: PASS.

- [ ] **Step 5: Full interactions suite + type-check** (catch any other test that assumed the guard)

Run: `npm run type-check && npx vitest run tests/unit/composables/useInteractions`
Expected: 0 type errors, all green.

- [ ] **Step 6: Commit**

```bash
git add composables/useInteractions.ts tests/unit/composables/useInteractions.advanced.spec.ts
git commit -m "feat: allow any family member (parent or player) to log interactions, matching RLS"
```

---

### Task 10: `AssignCoachModal` — school-first → coach → interaction → resolve

**Files:**
- Create: `components/profile/AssignCoachModal.vue`
- Test: `tests/unit/components/profile/AssignCoachModal.spec.ts` (new)

**Interfaces:**
- Consumes: `stores/coaches.ts createCoach(schoolId, data)`, `useInteractions().createInteraction` (client insert that auto-fires `createInboundInteractionAlert`), `useProfileContacts().resolveLead`, the family's schools list, an existing school picker/add flow.
- Props: `lead: ProfileLead`. Emits: `resolved` (after the lead is resolved) and `close`.
- Behavior: (1) resolve the school — suggest a `schools` match on `lead.school_name`, else pick/add; (2) suggest existing coaches in that school + a family-wide fuzzy pass on `lead.coach_name` (dedup); (3) link existing OR create new (pre-filled: `coach_name` split to first/last, `coach_email`, `coach_title`); (4) create the interaction (`direction: "inbound"`, `type: lead.type === "interest" ? "interest" : "email"`, `coach_id`, `school_id`, `content: lead.note`); (5) call `resolveLead(lead.id, interaction.id)`; emit `resolved`.

- [ ] **Step 1: Write the failing test** (behavior: confirming create-new mints an interaction then resolves the lead). Mock the coaches store, `useInteractions`, and `useProfileContacts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AssignCoachModal from "~/components/profile/AssignCoachModal.vue";

const createCoach = vi.fn().mockResolvedValue({ id: "coach-new", school_id: "s1" });
const createInteraction = vi.fn().mockResolvedValue({ id: "int-1" });
const resolveLead = vi.fn().mockResolvedValue(undefined);

vi.mock("~/stores/coaches", () => ({ useCoachesStore: () => ({ createCoach, coaches: { value: [] }, fetchCoaches: vi.fn() }) }));
vi.mock("~/composables/useInteractions", () => ({ useInteractions: () => ({ createInteraction }) }));
vi.mock("~/composables/useProfileContacts", () => ({ useProfileContacts: () => ({ resolveLead, dismissLead: vi.fn(), leads: { value: [] }, counts: { value: {} }, loading: { value: false }, error: { value: null }, fetchContacts: vi.fn() }) }));

const lead = {
  id: "lead-1", type: "contact", coach_name: "Jane Smith", coach_email: "jane@school.edu",
  coach_title: "Head Coach", school_name: "State U", program: null, note: "Loved your film",
  matched_coach_id: null, status: "pending", interaction_id: null, created_at: "2026-08-27",
};

describe("AssignCoachModal", () => {
  it("creates a coach + inbound interaction then resolves the lead", async () => {
    const wrapper = mount(AssignCoachModal, {
      props: { lead, presetSchoolId: "s1" },
      global: { stubs: { teleport: true } },
    });
    await wrapper.get('[data-test="create-new-coach"]').trigger("click");
    await wrapper.get('[data-test="confirm-assign"]').trigger("click");
    await new Promise((r) => setTimeout(r));

    expect(createCoach).toHaveBeenCalledWith("s1", expect.objectContaining({
      first_name: "Jane", last_name: "Smith", email: "jane@school.edu",
    }));
    expect(createInteraction).toHaveBeenCalledWith(expect.objectContaining({
      coach_id: "coach-new", school_id: "s1", direction: "inbound", type: "email",
    }));
    expect(resolveLead).toHaveBeenCalledWith("lead-1", "int-1");
    expect(wrapper.emitted("resolved")).toBeTruthy();
  });
});
```

> Note: match the real `useInteractions` create fn name when you open the composable (it is `createInteraction` in the return; verify at implementation time and keep the test in sync). `presetSchoolId` is a test seam so the school-resolution step can be bypassed in the unit test; production flow resolves it via the school picker in Step 3.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/profile/AssignCoachModal.spec.ts`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `AssignCoachModal.vue`** — `<script setup lang="ts">`, `withDefaults(defineProps<{ lead: ProfileLead; presetSchoolId?: string }>(), { presetSchoolId: undefined })`, `defineEmits<{ resolved: []; close: [] }>()`. Use `<DesignSystem*>` primitives and brand utilities only (no raw hex). Sections:
  - School resolver: if `presetSchoolId` use it; else a school select/add bound to a local `schoolId` ref, seeded by matching `lead.school_name` against the family schools list.
  - Coach step: list existing coaches in `schoolId` (dedup suggestion), a "Create new coach" toggle (`data-test="create-new-coach"`) that reveals name/email/title pre-filled from the lead (`splitName(lead.coach_name)`).
  - Confirm button `data-test="confirm-assign"` (disabled until a coach is chosen or new-coach fields valid) runs: `createCoach` (if new) → `createInteraction({ coach_id, school_id, type: lead.type === "interest" ? "interest" : "email", direction: "inbound", occurred_at: new Date().toISOString(), content: lead.note, subject: lead.type === "interest" ? "Interest via public profile" : "Contact via public profile" })` → `resolveLead(lead.id, created.id)` → `emit("resolved")`.
  - Local helper `splitName(full: string): { first: string; last: string }` — split on last space, last token is `last_name`, remainder `first_name`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/profile/AssignCoachModal.spec.ts`
Expected: PASS.

- [ ] **Step 5: Token audit + type-check**

Run: `npm run audit:tokens && npm run type-check`
Expected: 0 violations, 0 type errors.

- [ ] **Step 6: Commit**

```bash
git add components/profile/AssignCoachModal.vue tests/unit/components/profile/AssignCoachModal.spec.ts
git commit -m "feat: AssignCoachModal converts a pending lead into a coach-linked interaction"
```

---

### Task 11: `ProfileInbox` — pending badge, Assign/Dismiss CTAs, filter

**Files:**
- Modify: `components/profile/ProfileInbox.vue`
- Test: `tests/unit/components/profile/ProfileInbox.spec.ts` (new)

**Interfaces:**
- Consumes: `useProfileContacts` (now with `status`, `resolveLead`, `dismissLead`), `AssignCoachModal`.
- Behavior: pending leads show a "Needs coach" badge + "Assign coach" and "Dismiss" buttons; resolved leads show a "Tracked" badge and a link to the interaction (`interaction_id`); dismissed leads are hidden by default behind a filter. "Assign coach" opens `AssignCoachModal` for that lead; on `resolved`, the list refetches.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileInbox from "~/components/profile/ProfileInbox.vue";

const dismissLead = vi.fn().mockResolvedValue(undefined);
const pendingLead = { id: "l1", type: "contact", coach_name: "Jane Smith", coach_email: null, coach_title: null, school_name: "State U", program: null, note: "hi", matched_coach_id: null, status: "pending", interaction_id: null, created_at: "2026-08-27" };

vi.mock("~/composables/useProfileContacts", () => ({
  useProfileContacts: () => ({
    leads: { value: [pendingLead] },
    counts: { value: { interestThisMonth: 0, contactThisMonth: 1, totalThisMonth: 1 } },
    loading: { value: false }, error: { value: null },
    fetchContacts: vi.fn(), resolveLead: vi.fn(), dismissLead,
  }),
}));

describe("ProfileInbox pending lead", () => {
  it("shows a Needs coach badge and an Assign coach action", () => {
    const wrapper = mount(ProfileInbox, { global: { stubs: { AssignCoachModal: true, StatsTiles: true } } });
    expect(wrapper.text()).toContain("Needs coach");
    expect(wrapper.find('[data-test="assign-coach-l1"]').exists()).toBe(true);
  });

  it("calls dismissLead when Dismiss is clicked", async () => {
    const wrapper = mount(ProfileInbox, { global: { stubs: { AssignCoachModal: true, StatsTiles: true } } });
    await wrapper.get('[data-test="dismiss-l1"]').trigger("click");
    expect(dismissLead).toHaveBeenCalledWith("l1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/profile/ProfileInbox.spec.ts`
Expected: FAIL — badge/buttons absent.

- [ ] **Step 3: Implement** — in `ProfileInbox.vue`: pull `resolveLead, dismissLead` from the composable; a `filter` ref (`"open" | "all"`) hiding `dismissed` by default; per-lead status branch:
  - `pending`: `<DesignSystemBadge color="amber">Needs coach</DesignSystemBadge>`, buttons `data-test="assign-coach-{{lead.id}}"` (opens modal with `activeLead = lead`) and `data-test="dismiss-{{lead.id}}"` (`@click="dismissLead(lead.id)"`).
  - `resolved`: `<DesignSystemBadge color="green">Tracked</DesignSystemBadge>` + a `NuxtLink` to the interaction when `lead.interaction_id`.
  - Render `<AssignCoachModal v-if="activeLead" :lead="activeLead" @resolved="onResolved" @close="activeLead = null" />` where `onResolved` clears `activeLead` and calls `fetchContacts()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/components/profile/ProfileInbox.spec.ts`
Expected: PASS.

- [ ] **Step 5: Token audit + type-check + full unit suite**

Run: `npm run audit:tokens && npm run type-check && npm test`
Expected: 0 violations, 0 type errors, full suite green.

- [ ] **Step 6: Commit**

```bash
git add components/profile/ProfileInbox.vue tests/unit/components/profile/ProfileInbox.spec.ts
git commit -m "feat: inbox surfaces pending leads with assign/dismiss + tracked state"
```

---

### Task 12: E2E happy paths + browser verify + iOS handoff

**Files:**
- Create: `tests/e2e/public-profile-inbound-interaction.spec.ts`
- Create: `planning/iOS_HANDOFF_inbound-lead-assignment-2026-08-27.md`

**Interfaces:**
- Consumes: the whole flow end-to-end against the running app.

- [ ] **Step 1: Write the E2E spec** — two journeys (seeded on a demo family):
  - **Matched:** submit Contact with a coach email that already exists in the family → assert an inbound interaction appears on the interactions page for that coach, and the inbox lead shows "Tracked".
  - **Unmatched:** submit Contact with a novel email → inbox shows the lead "Needs coach" → open Assign coach → create new coach → confirm → interaction appears on the interactions page and the lead flips to "Tracked".

```ts
import { test, expect } from "@playwright/test";
// Follow tests/e2e conventions: RUN_ID-scoped data, authed storageState,
// networkidle before asserting SPA nav. Model the two journeys above.
```

- [ ] **Step 2: Run the E2E spec**

Run: `npm run test:e2e -- public-profile-inbound-interaction`
Expected: both journeys pass (Chromium).

- [ ] **Step 3: Browser verify** — `npm run dev`, log in as player1, submit both a matched and an unmatched inbound message through the real public profile UI, assign the unmatched one, confirm the interaction lands on `/interactions` and the reach-out nudge picks up the school. No console errors, no blank screens.

- [ ] **Step 4: Write the iOS handoff** — `planning/iOS_HANDOFF_inbound-lead-assignment-2026-08-27.md`: the pending-lead inbox + Assign-coach flow needs an iOS counterpart so leads can be resolved on mobile; the produced interactions already display on iOS. Note the new `interest` interaction type must be added to the iOS interaction-type constants/labels for parity.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/public-profile-inbound-interaction.spec.ts planning/iOS_HANDOFF_inbound-lead-assignment-2026-08-27.md
git commit -m "test: e2e for inbound-to-interaction + iOS handoff"
```

---

## Self-Review

**Spec coverage:**
- Matched auto-create → Tasks 3–6. Unmatched deferral + assignment → Tasks 8–11. `interest` type → Task 1. `status`/`interaction_id` traceability → Task 2, 7. No name auto-link → enforced by design (only email match mints at submission; Tasks 5/6). Dismiss → Tasks 8, 9, 11. Identity-less interest stays lead-only → Task 6 (mint gated on match). No coach auto-creation from public input → Tasks 5/6 never create coaches; only Task 10 (authed, human-confirmed) does. School-first assignment (CoachSelect not reusable) → Task 10. No double-notify → Tasks 5/6 repoint the existing notification. Nudge is school-fed → matched path sets `school_id` from the coach (Task 4/5). iOS parity follow-up → Task 12.

**Placeholder scan:** No TBD/TODO; every code step carries real code. The E2E spec body (Task 12 Step 1) is intentionally journey-described rather than fully transcribed because it must follow this repo's evolving `tests/e2e` seed/auth conventions — flagged inline, not a silent gap.

**Type consistency:** `matchCoachByEmail` → `{ coachId, schoolId }` used in Tasks 5/6. `buildInboundInteractionRow` input/`type` mapping (`contact→email`, `interest→interest`) consistent across Tasks 4/5/6/10. `resolveLead(id, interactionId)` / `dismissLead(id)` defined in Task 9, consumed in Tasks 10/11. `status` union `pending|resolved|dismissed` consistent across Tasks 2/7/8/11. **Resolved:** the client create fn is `useInteractions().createInteraction(interactionData, files?)` where `interactionData` is `Omit<Interaction, "id" | "created_at">` and passes through `interactionSchema` (which gains `interest` in Task 1) — the Task 10 modal + test use exactly this.

**Parent/player permissions (resolved — Task 9B):** Parents and players both manage the recruiting record. The `interactions` RLS already allows any family member to insert (live since 2026-08-26); Task 9B removes the stale client role-guard so parents can log interactions AND assign inbound coaches. No CTA gating — the "Assign coach" action is available to any family member. Task 9B must land before Task 10.
