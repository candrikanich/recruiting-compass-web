/**
 * Read-after-write integration test for the athlete phase system
 * (GET /api/athlete/phase, POST /api/athlete/phase/advance) against a REAL
 * Supabase Postgres instance — not mocks.
 *
 * The bug this covers (planning/audit-2026-07-27-findings.md, "Verified
 * criticals" + "Correctness / bugs"): `PHASE_MILESTONES` referenced slugs
 * that were never seeded anywhere, so `canAdvancePhase()` could never
 * resolve them against real `task.id` values and phase advancement was
 * permanently impossible. Separately, the GET endpoint derived phase purely
 * from grade while the advance endpoint wrote `users.current_phase`, which
 * GET never read — so even a successful advance was invisible.
 *
 * A mocked Supabase client can't prove either of these: the slug/id
 * mismatch only exists against the real seeded `task` rows
 * (supabase/migrations/20260727000002_phase_system_repair.sql), and
 * read-after-write consistency across "requests" requires a real durable
 * write, not an in-memory mock. This test exercises the actual endpoint
 * handlers end-to-end against local Postgres: seed a real athlete, complete
 * the real seeded freshman milestone tasks, advance, then prove the new
 * phase is visible both immediately (same-process re-GET, matching what
 * `usePhaseCalculation.advancePhase()` does client-side) and from a brand
 * new Supabase client (simulating a fresh session / new serverless
 * invocation with no shared in-memory state).
 *
 * A full Playwright browser flow was considered but judged disproportionate
 * here: the bug is entirely in server-side data resolution (slug -> task id,
 * and which column each endpoint reads), not rendering or client
 * interaction, so exercising the real endpoint handlers against a real
 * database proves the fix without the added flakiness/runtime cost of
 * driving a browser through login + task-completion UI.
 *
 * Requires (same convention as tests/e2e/seed/helpers and
 * tests/integration/rls/rls-security-hotfix.integration.spec.ts):
 * NUXT_PUBLIC_SUPABASE_URL (or TEST_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Skips (with reason) when unset.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { H3Event } from "h3";

// tests/setup.ts globally mocks @supabase/supabase-js for unit specs.
// This suite needs a real client against local Postgres to prove the slug ->
// task id resolution and the cross-request read-after-write behavior, so it
// opts out for itself only (same precedent as the RLS/cron integration specs).
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

// Auth/logging/audit are Phase 1-4 territory and orthogonal to what this test
// proves (slug resolution + cross-request read-after-write) — mock just
// enough of them to invoke the real handlers without exercising token
// verification, matching the existing unit-test convention for these routes.
vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
  getUserRole: vi.fn().mockResolvedValue("player"),
  assertNotParent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/auditLog", () => ({
  logCRUD: vi.fn().mockResolvedValue(undefined),
  logError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Real h3, except defineEventHandler stays an identity wrapper — same as the
// existing phase.get.spec.ts / advance.post.spec.ts convention, since a bare
// { context, node } fake event doesn't satisfy h3's full runtime wrapping.
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

function fakeEvent(): H3Event {
  return {
    context: {},
    node: { req: {}, res: {} },
  } as unknown as H3Event;
}

const FRESHMAN_MILESTONE_SLUGS = [
  "understand-academic-requirements",
  "establish-development-routine",
  "play-travel-ball",
  "research-division-levels",
];

const RUN_ID = Date.now();

describe.skipIf(!hasLiveSupabase)(
  "athlete phase advance — read-after-write, live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);
    let athleteId: string;
    let milestoneTaskIds: string[];

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      // 1. Real seeded task rows — proves the slug -> id resolution works
      // against the actual seed migration, not a hand-rolled fixture map.
      const { data: taskRows, error: taskError } = await admin
        .from("task")
        .select("id, slug")
        .in("slug", FRESHMAN_MILESTONE_SLUGS);

      if (taskError) {
        throw new Error(
          `Failed to fetch milestone task rows: ${taskError.message}`,
        );
      }
      if (!taskRows || taskRows.length !== FRESHMAN_MILESTONE_SLUGS.length) {
        throw new Error(
          `Expected ${FRESHMAN_MILESTONE_SLUGS.length} seeded milestone tasks, found ${taskRows?.length ?? 0}. ` +
            "Has supabase/migrations/20260727000002_phase_system_repair.sql been applied? (supabase db push)",
        );
      }
      milestoneTaskIds = taskRows.map((t) => t.id as string);

      // 2. Real auth + public.users row — no DB trigger creates public.users,
      // application code (stores/user.ts) does it, so the fixture inserts
      // directly via the admin client (established pattern from prior phases).
      const email = `e2e-phase-advance-${RUN_ID}@example.com`;
      const { data: authUser, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password: "PhaseAdvanceTest123!",
          email_confirm: true,
        });
      if (authError || !authUser.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }
      athleteId = authUser.user.id;

      const { error: userInsertError } = await admin.from("users").insert({
        id: athleteId,
        email,
        role: "player",
      });
      if (userInsertError) {
        throw new Error(
          `Failed to insert public.users row: ${userInsertError.message}`,
        );
      }

      // No graduation_year set in user_preferences — grade-derived default
      // resolves to "freshman", matching the milestone list under test.

      // 3. Complete all 4 freshmanToSophomore milestone tasks.
      const { error: athleteTaskError } = await admin
        .from("athlete_task")
        .insert(
          milestoneTaskIds.map((taskId) => ({
            athlete_id: athleteId,
            task_id: taskId,
            status: "completed",
            completed_at: new Date().toISOString(),
          })),
        );
      if (athleteTaskError) {
        throw new Error(
          `Failed to seed completed athlete_task rows: ${athleteTaskError.message}`,
        );
      }
    });

    afterAll(async () => {
      if (!hasLiveSupabase || !athleteId) return;
      await admin.from("athlete_task").delete().eq("athlete_id", athleteId);
      await admin.from("user_preferences").delete().eq("user_id", athleteId);
      await admin.from("users").delete().eq("id", athleteId);
      await admin.auth.admin.deleteUser(athleteId);
    });

    it("AC1/AC3: a seeded athlete who completed the required milestones can advance, and progress is nonzero beforehand", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      vi.mocked(requireAuth).mockResolvedValue({
        id: athleteId,
        email: "athlete@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(admin);

      const phaseGetHandler = (await import("~/server/api/athlete/phase.get"))
        .default;

      const before = await phaseGetHandler(fakeEvent());
      expect(before.phase).toBe("freshman");
      expect(before.milestoneProgress.percentComplete).toBe(100);
      expect(before.canAdvance).toBe(true);

      const advanceHandler = (
        await import("~/server/api/athlete/phase/advance.post")
      ).default;
      const advanceResult = (await advanceHandler(fakeEvent())) as {
        success: boolean;
        phase: string;
      };

      expect(advanceResult.success).toBe(true);
      expect(advanceResult.phase).toBe("sophomore");
    });

    it("AC2: the new phase is visible immediately (same session) and after simulating a fresh session (new Supabase client, no shared in-memory state)", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const phaseGetHandler = (await import("~/server/api/athlete/phase.get"))
        .default;

      vi.mocked(requireAuth).mockResolvedValue({
        id: athleteId,
        email: "athlete@example.com",
      });

      // Immediate reflect: same client instance the advance in the previous
      // test just wrote through (mirrors usePhaseCalculation.advancePhase()
      // calling refreshPhase() right after a successful advance).
      vi.mocked(createServerSupabaseClient).mockReturnValue(admin);
      const immediate = await phaseGetHandler(fakeEvent());
      expect(immediate.phase).toBe("sophomore");

      // Fresh session: a brand new client/connection, proving the write is
      // durable in Postgres and not an artifact of client-side caching.
      const freshSessionClient = adminClient();
      vi.mocked(createServerSupabaseClient).mockReturnValue(freshSessionClient);
      const afterReload = await phaseGetHandler(fakeEvent());
      expect(afterReload.phase).toBe("sophomore");
    });

    it("idempotency: advancing again immediately is gated (not a duplicate side effect), since sophomore's own milestones aren't complete", async () => {
      const { requireAuth } = await import("~/server/utils/auth");
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      vi.mocked(requireAuth).mockResolvedValue({
        id: athleteId,
        email: "athlete@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(admin);

      const advanceHandler = (
        await import("~/server/api/athlete/phase/advance.post")
      ).default;
      const secondAdvance = (await advanceHandler(fakeEvent())) as {
        success: boolean;
        phase: string;
        message: string;
      };

      expect(secondAdvance.success).toBe(false);
      expect(secondAdvance.phase).toBe("sophomore");

      const { data: userRow } = await admin
        .from("users")
        .select("current_phase")
        .eq("id", athleteId)
        .single();
      expect(userRow?.current_phase).toBe("sophomore");
    });
  },
);
