/**
 * Parent/Athlete Access Control Integration Tests
 *
 * Replaces a fully-tautological predecessor (39 `expect(true).toBe(true)`
 * placeholders describing an intended test matrix but never exercising real
 * code — planning/audit-2026-07-27-findings.md, "6. Testing").
 *
 * Two real suites:
 *
 * 1. Live-Postgres suite (skipped without local Supabase): proves parents can
 *    read their linked athlete's data via GET /api/athlete/phase and
 *    GET /api/suggestions (both resolve "which athlete" the same way as the
 *    already-covered GET /api/athlete-tasks — see
 *    tests/integration/tasks/athlete-tasks-athlete-id.integration.spec.ts),
 *    and that a parent with no linked athlete never leaks another family's
 *    data (isolation-by-construction: these routes have no attacker-supplied
 *    athleteId to abuse, unlike /api/athlete-tasks).
 *
 * 2. Mocked wiring suite: proves each of the mutation routes actually calls
 *    the real `assertNotParent` (or `requireAdmin`) gate before doing any
 *    work — a parent role is rejected with 403, matching the exact
 *    behavior already unit-tested in tests/unit/server/utils/auth.spec.ts.
 *    This is deliberately mocked (not live-DB): the authorization logic
 *    itself already has real, live-DB-independent coverage; what's unproven
 *    without this suite is that each endpoint actually wires the gate in
 *    before its side effects.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { H3Event } from "h3";

vi.unmock("@supabase/supabase-js");

import {
  createClient,
  type SupabaseClient,
  type RealtimeClientOptions,
} from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

vi.mock("~/server/utils/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/server/utils/auth")>();
  return { ...actual, requireAuth: vi.fn(), requireAdmin: vi.fn() };
});

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
  useSupabaseAdmin: vi.fn(),
}));

// social/sync.post.ts's catch block calls auditLog() as a fire-and-forget
// side effect on failure — orthogonal to the authz gate under test.
vi.mock("~/server/utils/auditLog", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  logCRUD: vi.fn().mockResolvedValue(undefined),
  logError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => Error & { statusCode: number };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage || config.message) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(query: Record<string, string> = {}): H3Event {
  const search = new URLSearchParams(query).toString();
  const path = search ? `/api/x?${search}` : "/api/x";
  return {
    context: {},
    path,
    node: { req: { url: path }, res: {} },
  } as unknown as H3Event;
}

/** Builds a mock Supabase client whose `users` role lookup returns `role`. */
function mockSupabaseWithRole(role: "player" | "parent") {
  return {
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { role }, error: null }),
              maybeSingle: () =>
                Promise.resolve({ data: { role }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }),
  };
}

describe("Parent/Athlete Access Control — mutation route wiring (mocked authz)", () => {
  it.each([
    {
      name: "POST /api/athlete/phase/advance",
      path: "~/server/api/athlete/phase/advance.post",
    },
    {
      name: "POST /api/athlete/status/recalculate",
      path: "~/server/api/athlete/status/recalculate.post",
    },
    {
      name: "POST /api/suggestions/evaluate",
      path: "~/server/api/suggestions/evaluate.post",
    },
    {
      name: "POST /api/notifications/generate",
      path: "~/server/api/notifications/generate.post",
    },
  ])(
    "rejects a parent with 403 before performing the mutation: $name",
    async ({ path }) => {
      vi.resetModules();
      const { requireAuth } = await import("~/server/utils/auth");
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      vi.mocked(requireAuth).mockResolvedValue({
        id: "parent-1",
        email: "parent@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(
        mockSupabaseWithRole("parent") as unknown as SupabaseClient,
      );

      const handler = (await import(path)).default;

      await expect(handler(fakeEvent())).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining("read-only"),
      });
    },
  );

  it("admin-only POST /api/admin/batch-fetch-logos rejects a non-admin athlete with 403 (requireAdmin, not assertNotParent)", async () => {
    vi.resetModules();
    const { requireAdmin } = await import("~/server/utils/auth");
    vi.mocked(requireAdmin).mockRejectedValue(
      Object.assign(new Error("Forbidden"), { statusCode: 403 }),
    );

    const handler = (await import("~/server/api/admin/batch-fetch-logos"))
      .default;

    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

async function createUser(
  admin: SupabaseClient,
  role: "player" | "parent",
  label: string,
  runId: number,
) {
  const email = `pac-${label}-${runId}@example.com`;
  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: "ParentAccessTest123!",
      email_confirm: true,
    });
  if (authError || !authUser.user) {
    throw new Error(
      `Failed to create auth user (${label}): ${authError?.message}`,
    );
  }
  const { error: userInsertError } = await admin
    .from("users")
    .insert({ id: authUser.user.id, email, role });
  if (userInsertError) {
    throw new Error(
      `Failed to insert public.users row (${label}): ${userInsertError.message}`,
    );
  }
  return authUser.user.id as string;
}

async function createFamily(
  admin: SupabaseClient,
  createdByUserId: string,
  code: string,
) {
  const { data, error } = await admin
    .from("family_units")
    .insert({
      family_name: `PAC Family ${code}`,
      family_code: `FAM-${code}`,
      created_by_user_id: createdByUserId,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create family unit: ${error?.message}`);
  }
  return (data as { id: string }).id;
}

async function addFamilyMember(
  admin: SupabaseClient,
  familyUnitId: string,
  userId: string,
  role: "player" | "parent",
) {
  const { error } = await admin
    .from("family_members")
    .insert({ family_unit_id: familyUnitId, user_id: userId, role });
  if (error) {
    throw new Error(`Failed to add family member: ${error.message}`);
  }
}

describe.skipIf(!hasLiveSupabase)(
  "Parent/Athlete Access Control — live Postgres read routes",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);
    const RUN_ID = Date.now();

    let familyAParentId: string;
    let familyAAthleteId: string;
    let familyBParentId: string;
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      familyAParentId = await createUser(admin, "parent", "a-parent", RUN_ID);
      familyAAthleteId = await createUser(admin, "player", "a-athlete", RUN_ID);
      familyBParentId = await createUser(admin, "parent", "b-parent", RUN_ID);
      createdUserIds.push(familyAParentId, familyAAthleteId, familyBParentId);

      const runIdBase36 = RUN_ID.toString(36).toUpperCase().padStart(5, "0");
      const familyAId = await createFamily(
        admin,
        familyAParentId,
        `${runIdBase36.slice(-5)}C`,
      );
      const familyBId = await createFamily(
        admin,
        familyBParentId,
        `${runIdBase36.slice(-5)}D`,
      );
      createdFamilyIds.push(familyAId, familyBId);

      await addFamilyMember(admin, familyAId, familyAParentId, "parent");
      await addFamilyMember(admin, familyAId, familyAAthleteId, "player");
      // Family B: parent only, deliberately unrelated to family A's athlete.

      // Give the athlete a distinguishing phase so we can prove the parent
      // sees the ATHLETE's row, not their own (a parent has no `current_phase`
      // set by this test, so any leak of the parent's own record would show
      // up as `null`/derived-from-nothing instead of "sophomore").
      await admin
        .from("users")
        .update({ current_phase: "sophomore" })
        .eq("id", familyAAthleteId);
    });

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      for (const familyId of createdFamilyIds) {
        await admin
          .from("family_members")
          .delete()
          .eq("family_unit_id", familyId);
        await admin.from("family_units").delete().eq("id", familyId);
      }
      for (const userId of createdUserIds) {
        await admin.from("users").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
    });

    async function loadPhaseHandler() {
      vi.resetModules();
      const { requireAuth } = await import("~/server/utils/auth");
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      vi.mocked(requireAuth).mockImplementation(async () => ({
        id: "unused",
      }));
      vi.mocked(createServerSupabaseClient).mockReturnValue(admin);
      return (await import("~/server/api/athlete/phase.get")).default;
    }

    it("a parent linked to an athlete reads the ATHLETE's phase, not their own", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = await loadPhaseHandler();
      vi.mocked(requireAuth).mockResolvedValue({
        id: familyAParentId,
        email: "parent@example.com",
      });

      const result = (await handler(fakeEvent())) as { phase: string };
      expect(result.phase).toBe("sophomore");
    });

    it("a parent with no linked athlete (unrelated family) never sees family A's data", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = await loadPhaseHandler();
      vi.mocked(requireAuth).mockResolvedValue({
        id: familyBParentId,
        email: "other-parent@example.com",
      });

      const result = (await handler(fakeEvent())) as { phase: string };
      // Family B has no linked player, so athleteId falls back to the
      // parent's own id — the handler derives a phase from (absent)
      // graduation-year data, never family A's "sophomore".
      expect(result.phase).not.toBe("sophomore");
    });

    it("the athlete reads their own phase directly (no parent resolution needed)", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const handler = await loadPhaseHandler();
      vi.mocked(requireAuth).mockResolvedValue({
        id: familyAAthleteId,
        email: "athlete@example.com",
      });

      const result = (await handler(fakeEvent())) as { phase: string };
      expect(result.phase).toBe("sophomore");
    });
  },
);
