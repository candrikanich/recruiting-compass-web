/**
 * Auth + Onboarding Flow Integration Test
 *
 * Replaces a fully-tautological predecessor (86 `expect(true).toBe(true)`
 * placeholders narrating a signup -> onboarding -> family-link UI journey but
 * never exercising real code — planning/audit-2026-07-27-findings.md,
 * "6. Testing").
 *
 * The individual pieces of that narrative already have solid, real,
 * non-tautological coverage elsewhere:
 * - Signup role metadata (player/parent):
 *   tests/unit/composables/useAuth.spec.ts ("should include role in metadata
 *   for player/parent signup")
 * - Family code join (both roles, idempotency, self-join rejection):
 *   tests/unit/server/api/family-code-join.spec.ts
 * - Onboarding assessment -> phase/task logic, step persistence, progress:
 *   tests/unit/composables/useOnboarding.spec.ts (22 real tests)
 *
 * What none of those unit suites prove is that the pieces compose correctly
 * against a REAL database: a real auth user, with a real role, really joins
 * a real family, and once onboarding marks the athlete's phase, a real
 * linked parent can really see it (reusing the same GET /api/athlete/phase
 * route proven in parent-access-control.integration.spec.ts). That's what
 * this suite proves — the actual "journey", against local Postgres.
 *
 * Skips (with reason) when local Supabase is unavailable.
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
  return { ...actual, requireAuth: vi.fn() };
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

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: async (event: H3Event) =>
      (event as unknown as { _readBody: unknown })._readBody,
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

function fakeEvent(
  body?: Record<string, unknown>,
  query: Record<string, string> = {},
): H3Event {
  const search = new URLSearchParams(query).toString();
  const path = search ? `/api/x?${search}` : "/api/x";
  return {
    context: { clientAddress: "127.0.0.1" },
    path,
    node: { req: { url: path }, res: {} },
    _readBody: body,
  } as unknown as H3Event;
}

describe.skipIf(!hasLiveSupabase)(
  "Auth signup -> family join -> onboarding completion -> parent visibility (live Postgres)",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);
    const RUN_ID = Date.now();

    let playerId: string;
    let parentId: string;
    let familyUnitId: string;
    const familyCode = `FAM-${RUN_ID.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;

    async function createAuthUser(role: "player" | "parent", label: string) {
      const email = `afo-${label}-${RUN_ID}@example.com`;
      // Mirrors composables/useAuth.ts's real signUp(): role travels in
      // user_metadata, and a public.users row is created with that role
      // (the real signUp flow does this via a DB trigger; we replicate the
      // end state directly since this suite targets server-side behavior,
      // not the trigger itself).
      const { data: authUser, error } = await admin.auth.admin.createUser({
        email,
        password: "AuthFlowTest123!",
        email_confirm: true,
        user_metadata: { role },
      });
      if (error || !authUser.user) {
        throw new Error(`Failed to create auth user (${label}): ${error?.message}`);
      }
      const { error: insertError } = await admin
        .from("users")
        .insert({ id: authUser.user.id, email, role });
      if (insertError) {
        throw new Error(
          `Failed to insert public.users row (${label}): ${insertError.message}`,
        );
      }
      return authUser.user.id as string;
    }

    beforeAll(async () => {
      if (!hasLiveSupabase) return;
      playerId = await createAuthUser("player", "player");
      parentId = await createAuthUser("parent", "parent");

      const { data: family, error } = await admin
        .from("family_units")
        .insert({
          family_name: `Auth Flow Family ${RUN_ID}`,
          family_code: familyCode,
          created_by_user_id: playerId,
        })
        .select("id")
        .single();
      if (error || !family) {
        throw new Error(`Failed to create family unit: ${error?.message}`);
      }
      familyUnitId = (family as { id: string }).id;
      const { error: memberError } = await admin.from("family_members").insert({
        family_unit_id: familyUnitId,
        user_id: playerId,
        role: "player",
      });
      if (memberError) {
        throw new Error(`Failed to seed player family membership: ${memberError.message}`);
      }
    });

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("family_members").delete().eq("family_unit_id", familyUnitId);
      await admin.from("family_units").delete().eq("id", familyUnitId);
      for (const userId of [playerId, parentId]) {
        await admin.from("users").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
    });

    it("journey: parent joins the player's family via a real family code, then reads the athlete's onboarding-completed phase", async () => {
      // Step 1: parent joins via the real POST /api/family/code/join handler.
      const { requireAuth } = await import("~/server/utils/auth");
      const { useSupabaseAdmin } = await import("~/server/utils/supabase");
      vi.mocked(requireAuth).mockResolvedValue({
        id: parentId,
        email: "parent@example.com",
      });
      vi.mocked(useSupabaseAdmin).mockReturnValue(admin);

      const joinHandler = (await import("~/server/api/family/code/join.post"))
        .default;
      const joinResult = (await joinHandler(fakeEvent({ familyCode }))) as {
        success: boolean;
        familyId: string;
      };

      expect(joinResult.success).toBe(true);
      expect(joinResult.familyId).toBe(familyUnitId);

      const { data: membership } = await admin
        .from("family_members")
        .select("role")
        .eq("family_unit_id", familyUnitId)
        .eq("user_id", parentId)
        .single();
      expect((membership as { role: string } | null)?.role).toBe("parent");

      // Step 2: the athlete "completes onboarding" — mirrors the real DB
      // write in composables/useOnboarding.ts's completeOnboarding(): the
      // users row gets current_phase + phase_milestone_data set.
      const { error: onboardingError } = await admin
        .from("users")
        .update({
          current_phase: "sophomore",
          phase_milestone_data: {
            onboarding_complete: true,
            onboarding_completed_at: new Date().toISOString(),
          },
        })
        .eq("id", playerId);
      expect(onboardingError).toBeNull();

      // Step 3: the newly-linked parent reads the athlete's phase via the
      // real GET /api/athlete/phase handler — proving the full chain
      // (signup role -> family join -> onboarding write -> parent read)
      // holds together against real rows, not isolated mocks.
      const { createServerSupabaseClient } = await import(
        "~/server/utils/supabase"
      );
      vi.mocked(createServerSupabaseClient).mockReturnValue(admin);
      vi.mocked(requireAuth).mockResolvedValue({
        id: parentId,
        email: "parent@example.com",
      });

      const phaseHandler = (await import("~/server/api/athlete/phase.get"))
        .default;
      const phaseResult = (await phaseHandler(fakeEvent())) as {
        phase: string;
      };
      expect(phaseResult.phase).toBe("sophomore");
    });
  },
);
