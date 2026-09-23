/**
 * Read-after-write integration test for GET /api/athlete-tasks against a REAL
 * Supabase Postgres instance — not mocks.
 *
 * The bug this covers (planning/audit-2026-07-27-findings.md, "4. Correctness
 * / bugs": `composables/useTasks.ts:131-134` +
 * `server/api/athlete-tasks/index.get.ts:18-22`): the client passes an
 * `athleteId` query param when a parent is viewing a linked athlete, but the
 * endpoint always queried `athlete_id = user.id` (the caller's own id) and
 * ignored the param — so a parent viewing an athlete merged the athlete's
 * task deadlines with the PARENT's own (empty) completion rows, making every
 * task render as not-started regardless of the athlete's real progress.
 *
 * A mocked Supabase client can't prove this: the bug is entirely about which
 * row the `.eq("athlete_id", ...)` filter resolves to across two real,
 * differently-owned rows, and the authz check (`resolveTargetAthleteId`)
 * queries the real `family_members` table to decide whether the cross-account
 * read is even allowed. This exercises the real endpoint handler against
 * local Postgres with a real parent + athlete family unit, and a second,
 * unrelated family unit to prove cross-account access is rejected (AC5).
 *
 * A full Playwright browser flow was considered but judged disproportionate:
 * the bug is server-side data resolution + authz, not rendering or client
 * interaction — driving the real handler against a real database proves the
 * fix without the added flakiness/runtime cost of a browser session.
 *
 * Requires (same convention as tests/integration/athlete/phase-advance.integration.spec.ts):
 * NUXT_PUBLIC_SUPABASE_URL (or TEST_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Skips (with reason) when unset.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { H3Event } from "h3";

// tests/setup.ts globally mocks @supabase/supabase-js for unit specs. This
// suite needs a real client against local Postgres to prove the cross-account
// row resolution + authz, so it opts out for itself only (same precedent as
// the RLS/cron/phase-advance integration specs).
vi.unmock("@supabase/supabase-js");

import {
  createClient,
  type SupabaseClient,
  type RealtimeClientOptions,
} from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasLiveSupabase = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

// Reviewer finding on PR #947: mocking createServerSupabaseUserClient to
// return the admin (service-role) client bypasses RLS entirely, so these
// tests kept passing even if a real session client couldn't read
// athlete_task -- defeating the point of a live-Postgres test for a
// session-scoped-client migration. Sign in as the seeded user instead and
// let the route's own createServerSupabaseUserClient() build a real,
// RLS-bound client from that access token (only extractRequestToken is
// mocked, to hand it the token). admin is used only for fixture
// setup/cleanup and resolveTargetAthleteId's authorization check
// (useSupabaseAdmin, a legitimate service-role use predating #912).
const signIn = async (email: string, password: string): Promise<string> => {
  const client = createClient(SUPABASE_URL as string, ANON_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(`signIn failed for ${email}: ${error?.message}`);
  }
  return data.session.access_token;
};

// Auth/logging are Phase 1-4 territory and orthogonal to what this test
// proves (row resolution + authz) — mock just enough to invoke the real
// handler without exercising token verification, matching the existing
// convention for these routes (see phase-advance.integration.spec.ts).
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// createServerSupabaseUserClient stays REAL (unmocked) -- it must build an
// actual RLS-bound client from the token extractRequestToken hands it, per
// the reviewer finding above. useSupabaseAdmin is mocked to the fixture
// admin client, matching resolveTargetAthleteId's legitimate service-role use.
vi.mock("~/server/utils/supabase", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("~/server/utils/supabase")>();
  return {
    ...actual,
    useSupabaseAdmin: vi.fn(),
  };
});

vi.mock("~/server/utils/requestToken", () => ({
  extractRequestToken: vi.fn(() => "fake-token"),
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
      statusMessage: string;
    }) => Error & { statusCode: number };
  }
).createError = (config: { statusCode: number; statusMessage: string }) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(query: Record<string, string> = {}): H3Event {
  const search = new URLSearchParams(query).toString();
  const path = search ? `/api/athlete-tasks?${search}` : "/api/athlete-tasks";
  return {
    context: {},
    // h3's getQuery(event) reads event.path (not node.req.url) — see
    // node_modules/h3/dist/index.mjs `getQuery(event) { return getQuery$1(event.path || ""); }`
    path,
    node: {
      req: { url: path },
      res: {},
    },
  } as unknown as H3Event;
}

const RUN_ID = Date.now();
const PASSWORD = "AthleteTasksTest123!";

async function createUser(
  admin: SupabaseClient,
  role: "player" | "parent",
  label: string,
) {
  const email = `e2e-athlete-tasks-${label}-${RUN_ID}@example.com`;
  const { data: authUser, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
  if (authError || !authUser.user) {
    throw new Error(
      `Failed to create auth user (${label}): ${authError?.message}`,
    );
  }
  const { error: userInsertError } = await admin.from("users").insert({
    id: authUser.user.id,
    email,
    role,
  });
  if (userInsertError) {
    throw new Error(
      `Failed to insert public.users row (${label}): ${userInsertError.message}`,
    );
  }
  return { id: authUser.user.id as string, email };
}

async function createFamily(
  admin: SupabaseClient,
  createdByUserId: string,
  code: string,
) {
  const { data, error } = await admin
    .from("family_units")
    .insert({
      family_name: `Test Family ${code}`,
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
  const { error } = await admin.from("family_members").insert({
    family_unit_id: familyUnitId,
    user_id: userId,
    role,
  });
  if (error) {
    throw new Error(`Failed to add family member: ${error.message}`);
  }
}

describe.skipIf(!hasLiveSupabase)(
  "GET /api/athlete-tasks — athleteId resolution + cross-account authz, live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    let familyAParentId: string;
    let familyAParentEmail: string;
    let familyAAthleteId: string;
    let familyAAthleteEmail: string;
    let familyBParentId: string;
    let familyBParentEmail: string;
    let taskId: string;
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      // A single real task row to attach completions to.
      const { data: taskRows, error: taskError } = await admin
        .from("task")
        .select("id")
        .limit(1);
      if (taskError || !taskRows || taskRows.length === 0) {
        throw new Error(
          `Failed to fetch a seeded task row: ${taskError?.message ?? "none found"}`,
        );
      }
      taskId = taskRows[0].id as string;

      const familyAParent = await createUser(admin, "parent", "family-a-parent");
      const familyAAthlete = await createUser(admin, "player", "family-a-athlete");
      const familyBParent = await createUser(admin, "parent", "family-b-parent");
      familyAParentId = familyAParent.id;
      familyAParentEmail = familyAParent.email;
      familyAAthleteId = familyAAthlete.id;
      familyAAthleteEmail = familyAAthlete.email;
      familyBParentId = familyBParent.id;
      familyBParentEmail = familyBParent.email;
      createdUserIds.push(familyAParentId, familyAAthleteId, familyBParentId);

      // family_code column is varchar(10) with CHECK format FAM-[A-Z0-9]{6} —
      // pack the run id into base36 and pad/truncate to exactly 6 chars.
      const runIdBase36 = RUN_ID.toString(36).toUpperCase().padStart(5, "0");
      const familyAId = await createFamily(
        admin,
        familyAParentId,
        `${runIdBase36.slice(-5)}A`,
      );
      const familyBId = await createFamily(
        admin,
        familyBParentId,
        `${runIdBase36.slice(-5)}B`,
      );
      createdFamilyIds.push(familyAId, familyBId);

      await addFamilyMember(admin, familyAId, familyAParentId, "parent");
      await addFamilyMember(admin, familyAId, familyAAthleteId, "player");
      // Family B has only a parent — deliberately unrelated to family A.
      await addFamilyMember(admin, familyBId, familyBParentId, "parent");

      // The athlete has a real completed task — this is what the parent
      // should see. The parent's own athlete_task rows stay empty, which is
      // exactly the state that produced the bug (parent's empty rows merged
      // in instead of the athlete's).
      const { error: athleteTaskError } = await admin
        .from("athlete_task")
        .insert({
          athlete_id: familyAAthleteId,
          task_id: taskId,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      if (athleteTaskError) {
        throw new Error(
          `Failed to seed completed athlete_task row: ${athleteTaskError.message}`,
        );
      }
    });

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin
        .from("athlete_task")
        .delete()
        .eq("athlete_id", familyAAthleteId);
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

    it("AC1: parent viewing their linked athlete sees the athlete's real completion rows, not the parent's own empty ones", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const { useSupabaseAdmin } = await import("~/server/utils/supabase");
      const { extractRequestToken } = await import(
        "~/server/utils/requestToken"
      );
      vi.mocked(requireAuth).mockResolvedValue({
        id: familyAParentId,
        email: familyAParentEmail,
      });
      vi.mocked(extractRequestToken).mockReturnValue(
        await signIn(familyAParentEmail, PASSWORD),
      );
      vi.mocked(useSupabaseAdmin).mockReturnValue(admin);

      const handler = (await import("~/server/api/athlete-tasks/index.get"))
        .default;

      const result = (await handler(
        fakeEvent({ athleteId: familyAAthleteId }),
      )) as Array<{ athlete_id: string; task_id: string; status: string }>;

      expect(result).toHaveLength(1);
      expect(result[0].athlete_id).toBe(familyAAthleteId);
      expect(result[0].task_id).toBe(taskId);
      expect(result[0].status).toBe("completed");
    });

    it("regression: athlete calling without athleteId still sees their own rows", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const { extractRequestToken } = await import(
        "~/server/utils/requestToken"
      );
      vi.mocked(requireAuth).mockResolvedValue({
        id: familyAAthleteId,
        email: familyAAthleteEmail,
      });
      vi.mocked(extractRequestToken).mockReturnValue(
        await signIn(familyAAthleteEmail, PASSWORD),
      );

      const handler = (await import("~/server/api/athlete-tasks/index.get"))
        .default;

      const result = (await handler(fakeEvent())) as Array<{
        athlete_id: string;
      }>;
      expect(result).toHaveLength(1);
      expect(result[0].athlete_id).toBe(familyAAthleteId);
    });

    it("AC5: a parent from an unrelated family cannot fetch the athlete's tasks (403)", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const { useSupabaseAdmin } = await import("~/server/utils/supabase");
      const { extractRequestToken } = await import(
        "~/server/utils/requestToken"
      );
      vi.mocked(requireAuth).mockResolvedValue({
        id: familyBParentId,
        email: familyBParentEmail,
      });
      vi.mocked(extractRequestToken).mockReturnValue(
        await signIn(familyBParentEmail, PASSWORD),
      );
      vi.mocked(useSupabaseAdmin).mockReturnValue(admin);

      const handler = (await import("~/server/api/athlete-tasks/index.get"))
        .default;

      await expect(
        handler(fakeEvent({ athleteId: familyAAthleteId })),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  },
);
