/**
 * Integration tests for GET /api/cron/cleanup-expired-invites against a
 * REAL Supabase Postgres instance — not mocks.
 *
 * planning/audit-2026-07-27-findings.md flagged all 4 cron jobs as P0
 * "destructive batch jobs unverified". process-account-deletions already
 * has real coverage (Phase 3); this covers the second destructive one —
 * a cron that mutates and hard-deletes `family_invitations` rows based on
 * time-based WHERE clauses. A mocked client can assert the right Supabase
 * method names were called, but can't prove the actual date-comparison
 * predicates select the right rows — that needs real rows with real
 * timestamps in a real table.
 *
 * Requires (same convention as
 * tests/integration/cron/process-account-deletions.integration.spec.ts):
 * NUXT_PUBLIC_SUPABASE_URL (or TEST_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Skips (with reason) when unset.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
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

process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(),
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

function fakeEvent(headers: Record<string, string> = {}): H3Event {
  return {
    node: { req: { headers }, res: {} },
  } as unknown as H3Event;
}

describe.skipIf(!hasLiveSupabase)(
  "GET /api/cron/cleanup-expired-invites — live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);
    const RUN_ID = Date.now();
    const createdIds: string[] = [];
    let familyUnitId: string;
    let inviterId: string;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;
      const { data: authUser, error } = await admin.auth.admin.createUser({
        email: `cron-cleanup-inviter-${RUN_ID}@example.com`,
        password: "CronCleanupTest123!",
        email_confirm: true,
      });
      if (error || !authUser.user) {
        throw new Error(`Failed to create inviter: ${error?.message}`);
      }
      inviterId = authUser.user.id;
      await admin.from("users").insert({
        id: inviterId,
        email: `cron-cleanup-inviter-${RUN_ID}@example.com`,
        role: "player",
      });

      const { data: family, error: familyError } = await admin
        .from("family_units")
        .insert({
          family_name: `Cron Cleanup Family ${RUN_ID}`,
          family_code: `FAM-${RUN_ID.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`,
          created_by_user_id: inviterId,
        })
        .select("id")
        .single();
      if (familyError || !family) {
        throw new Error(`Failed to create family unit: ${familyError?.message}`);
      }
      familyUnitId = (family as { id: string }).id;
    });

    afterEach(async () => {
      if (!hasLiveSupabase || createdIds.length === 0) return;
      await admin.from("family_invitations").delete().in("id", createdIds);
      createdIds.length = 0;
    });

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("family_units").delete().eq("id", familyUnitId);
      await admin.from("users").delete().eq("id", inviterId);
      await admin.auth.admin.deleteUser(inviterId);
    });

    async function insertInvite(overrides: Record<string, unknown>) {
      const { data, error } = await admin
        .from("family_invitations")
        .insert({
          family_unit_id: familyUnitId,
          invited_by: inviterId,
          invited_email: `invitee-${Math.random().toString(36).slice(2)}@example.com`,
          role: "player",
          token: Math.random().toString(36).slice(2),
          ...overrides,
        })
        .select("id, status")
        .single();
      if (error || !data) {
        throw new Error(`Failed to seed invite: ${error?.message}`);
      }
      createdIds.push((data as { id: string }).id);
      return data as { id: string; status: string };
    }

    async function callHandler(secret = process.env.CRON_SECRET as string) {
      const { useSupabaseAdmin } = await import("~/server/utils/supabase");
      vi.mocked(useSupabaseAdmin).mockReturnValue(admin);
      const handler = (
        await import("~/server/api/cron/cleanup-expired-invites.get")
      ).default;
      return handler(fakeEvent({ authorization: `Bearer ${secret}` }));
    }

    it("rejects a request with a wrong cron secret (401)", async () => {
      await expect(callHandler("wrong-secret")).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("marks a pending invite past its expires_at as 'expired', and leaves a still-valid pending invite untouched", async () => {
      const past = await insertInvite({
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      });
      const future = await insertInvite({
        expires_at: new Date(Date.now() + 60_000 * 60 * 24).toISOString(),
      });

      const result = (await callHandler()) as { markedExpired: number };
      expect(result.markedExpired).toBeGreaterThanOrEqual(1);

      const { data: pastRow } = await admin
        .from("family_invitations")
        .select("status")
        .eq("id", past.id)
        .single();
      expect((pastRow as { status: string }).status).toBe("expired");

      const { data: futureRow } = await admin
        .from("family_invitations")
        .select("status")
        .eq("id", future.id)
        .single();
      expect((futureRow as { status: string }).status).toBe("pending");
    });

    it("hard-deletes a declined invite older than the 7-day grace period, but keeps a recently-declined one", async () => {
      const oldDeclined = await insertInvite({
        status: "declined",
        declined_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const recentDeclined = await insertInvite({
        status: "declined",
        declined_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = (await callHandler()) as { deletedDeclined: number };
      expect(result.deletedDeclined).toBeGreaterThanOrEqual(1);

      const { data: oldRow } = await admin
        .from("family_invitations")
        .select("id")
        .eq("id", oldDeclined.id)
        .maybeSingle();
      expect(oldRow).toBeNull();

      const { data: recentRow } = await admin
        .from("family_invitations")
        .select("id")
        .eq("id", recentDeclined.id)
        .maybeSingle();
      expect(recentRow).not.toBeNull();
      // already deleted by the cron's own hard-delete step would fail this
      // afterEach's cleanup is a no-op for oldDeclined since it's already gone.
    });

    it("hard-deletes an expired invite older than the 7-day grace period, but keeps a recently-expired one", async () => {
      const oldExpired = await insertInvite({
        status: "expired",
        expires_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const recentExpired = await insertInvite({
        status: "expired",
        expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const result = (await callHandler()) as { deletedExpired: number };
      expect(result.deletedExpired).toBeGreaterThanOrEqual(1);

      const { data: oldRow } = await admin
        .from("family_invitations")
        .select("id")
        .eq("id", oldExpired.id)
        .maybeSingle();
      expect(oldRow).toBeNull();

      const { data: recentRow } = await admin
        .from("family_invitations")
        .select("id")
        .eq("id", recentExpired.id)
        .maybeSingle();
      expect(recentRow).not.toBeNull();
    });
  },
);
