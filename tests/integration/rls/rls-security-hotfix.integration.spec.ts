/**
 * RLS regression tests for the Phase 1 security hotfix
 * (supabase/migrations/20260727000000_rls_security_hotfix_phase1.sql).
 *
 * These hit a REAL Supabase Postgres instance (local `supabase start` or a
 * dedicated test project) — not mocks — because RLS is enforced entirely in
 * Postgres and cannot be exercised meaningfully against a mocked client. Each
 * test signs in as a real user via the password grant (anon key) and proves
 * the policy blocks/allows exactly what it should.
 *
 * Requires (same convention as tests/e2e/seed/helpers): NUXT_PUBLIC_SUPABASE_URL
 * (or TEST_SUPABASE_URL), NUXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 * Skips (with reason) when unset, matching this repo's existing
 * conditional-data-guard pattern for infra-dependent tests.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// tests/setup.ts globally mocks @supabase/supabase-js (vi.mock in setupFiles)
// to keep unit/integration specs network-free by default. This file needs
// the real client — RLS is enforced entirely in Postgres and cannot be
// exercised against a mocked client — so it opts out for itself only,
// matching the existing unmock precedent in useAuthFetch.spec.ts.
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

// supabase-js eagerly constructs a RealtimeClient inside createClient, which
// needs a WebSocket transport under Node (see tests/e2e/seed/helpers). These
// tests never open a realtime channel.
const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

const signIn = async (email: string, password: string) => {
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
  return client;
};

const RUN_ID = Date.now();
const PASSWORD = "RlsHotfixTest123!";

describe.skipIf(!hasLiveSupabase)(
  "RLS security hotfix (phase 1) — live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    let userAId: string;
    let userBId: string;
    let userAClient: SupabaseClient;
    let userBClient: SupabaseClient;

    // Fixtures for (a) events cross-tenant access
    let bsSchoollessEventId: string;

    // Fixtures for (c) family_units created_by_user_id immutability
    let familyUnitId: string;

    // Fixtures for (d) interactions forged logged_by
    let aSchoolId: string;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const makeUser = async (tag: string) => {
        const email = `e2e-rls-hotfix-${RUN_ID}-${tag}@example.com`;
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { role: "player" },
        });
        if (error || !data.user) {
          throw new Error(`createUser(${tag}) failed: ${error?.message}`);
        }
        // This repo creates public.users rows from application code (see
        // stores/user.ts createUserProfile) on first login, not via a
        // database trigger on auth.users — confirmed no trigger exists on
        // auth.users in this schema. Insert the profile row directly since
        // these tests never drive the app UI.
        const { error: profileErr } = await admin.from("users").insert({
          id: data.user.id,
          email,
          role: "player",
        });
        if (profileErr) {
          throw new Error(
            `seed public.users(${tag}) failed: ${profileErr.message}`,
          );
        }
        return { id: data.user.id, email };
      };

      const a = await makeUser("a");
      const b = await makeUser("b");
      userAId = a.id;
      userBId = b.id;

      userAClient = await signIn(a.email, PASSWORD);
      userBClient = await signIn(b.email, PASSWORD);

      // (a) B owns a school-less event (school_id IS NULL, user_id = B).
      const { data: event, error: eventErr } = await admin
        .from("events")
        .insert({
          user_id: userBId,
          type: "game",
          name: `[e2e-rls-${RUN_ID}] B's schoolless event`,
          start_date: "2026-08-01",
          school_id: null,
        })
        .select("id")
        .single();
      if (eventErr || !event) {
        throw new Error(`seed event failed: ${eventErr?.message}`);
      }
      bsSchoollessEventId = event.id as string;

      // (c) Family unit created by A, with A and B as members.
      const { data: family, error: familyErr } = await admin
        .from("family_units")
        .insert({ created_by_user_id: userAId, family_name: "RLS Hotfix Fam" })
        .select("id")
        .single();
      if (familyErr || !family) {
        throw new Error(`seed family_unit failed: ${familyErr?.message}`);
      }
      familyUnitId = family.id as string;

      const { error: membersErr } = await admin.from("family_members").insert([
        { family_unit_id: familyUnitId, user_id: userAId, role: "player" },
        { family_unit_id: familyUnitId, user_id: userBId, role: "parent" },
      ]);
      if (membersErr) {
        throw new Error(`seed family_members failed: ${membersErr.message}`);
      }

      // (d) A school owned by A, linked to the shared family, for interaction inserts.
      const { data: school, error: schoolErr } = await admin
        .from("schools")
        .insert({
          user_id: userAId,
          family_unit_id: familyUnitId,
          name: `[e2e-rls-${RUN_ID}] A's School`,
        })
        .select("id")
        .single();
      if (schoolErr || !school) {
        throw new Error(`seed school failed: ${schoolErr?.message}`);
      }
      aSchoolId = school.id as string;
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("family_members").delete().eq("family_unit_id", familyUnitId);
      await admin.from("family_units").delete().eq("id", familyUnitId);
      await admin.from("schools").delete().eq("id", aSchoolId);
      await admin.from("events").delete().eq("id", bsSchoollessEventId);
      await admin.auth.admin.deleteUser(userAId).catch(() => null);
      await admin.auth.admin.deleteUser(userBId).catch(() => null);
    });

    describe("(a) events: school-less event ownership", () => {
      it("user A cannot SELECT user B's school-less event", async () => {
        const { data, error } = await userAClient
          .from("events")
          .select("id")
          .eq("id", bsSchoollessEventId);

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("user A cannot UPDATE user B's school-less event", async () => {
        const { data, error } = await userAClient
          .from("events")
          .update({ name: "hijacked" })
          .eq("id", bsSchoollessEventId)
          .select("id");

        // RLS hides the row rather than throwing: 0 rows affected.
        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("user A cannot DELETE user B's school-less event", async () => {
        const { data, error } = await userAClient
          .from("events")
          .delete()
          .eq("id", bsSchoollessEventId)
          .select("id");

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("user B (the owner) can still SELECT their own school-less event", async () => {
        const { data, error } = await userBClient
          .from("events")
          .select("id")
          .eq("id", bsSchoollessEventId);

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      // Positive regression for Phase 10a's RLS consolidation: the
      // negative test above ("user A cannot DELETE user B's event") would
      // pass equally well if events had NO delete policy at all. This
      // proves the ownership DELETE policy ("Users can delete own events",
      // user_id = auth.uid()) survived consolidation and an owner can
      // still delete their own row. Uses a dedicated fixture (seeded and
      // torn down entirely within this test) so it doesn't disturb
      // bsSchoollessEventId, which other tests in this file still depend on.
      it("user B (the owner) can DELETE their own school-less event", async () => {
        const { data: ownEvent, error: seedErr } = await admin
          .from("events")
          .insert({
            user_id: userBId,
            type: "game",
            name: `[e2e-rls-${RUN_ID}] B's own-delete event`,
            start_date: "2026-08-02",
            school_id: null,
          })
          .select("id")
          .single();
        if (seedErr || !ownEvent) {
          throw new Error(`seed own-delete event failed: ${seedErr?.message}`);
        }

        const { data, error } = await userBClient
          .from("events")
          .delete()
          .eq("id", ownEvent.id as string)
          .select("id");

        expect(error).toBeNull();
        expect(data).toHaveLength(1);

        const { data: check } = await admin
          .from("events")
          .select("id")
          .eq("id", ownEvent.id as string);
        expect(check ?? []).toHaveLength(0);
      });
    });

    describe("(b) get_athlete_status RPC access", () => {
      it("fails for an unauthenticated (anon) caller", async () => {
        const anon = createClient(SUPABASE_URL as string, ANON_KEY as string, {
          auth: { autoRefreshToken: false, persistSession: false },
          realtime: realtimeOptions,
        });
        const { error } = await anon.rpc("get_athlete_status", {
          p_user_id: userBId,
        });
        expect(error).not.toBeNull();
      });

      it("fails for an authenticated caller with no family relation to the target", async () => {
        const { error } = await userAClient.rpc("get_athlete_status", {
          p_user_id: userBId,
        });
        expect(error).not.toBeNull();
      });
    });

    describe("(c) family_units_update: created_by_user_id immutability", () => {
      it("a family member cannot reassign created_by_user_id", async () => {
        const { data, error } = await userBClient
          .from("family_units")
          .update({ created_by_user_id: userBId })
          .eq("id", familyUnitId)
          .select("id");

        // WITH CHECK rejects the new row: either an explicit RLS error, or
        // (depending on driver error surfacing) zero rows affected — either
        // way the reassignment must not succeed.
        if (error) {
          expect(error).not.toBeNull();
        } else {
          expect(data ?? []).toHaveLength(0);
        }

        const { data: current } = await admin
          .from("family_units")
          .select("created_by_user_id")
          .eq("id", familyUnitId)
          .single();
        expect(current?.created_by_user_id).toBe(userAId);
      });

      it("a family member can still update other columns", async () => {
        const { data, error } = await userBClient
          .from("family_units")
          .update({ family_name: "Renamed Fam" })
          .eq("id", familyUnitId)
          .select("id");

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(1);
      });
    });

    describe("(d) interactions insert: logged_by attribution", () => {
      it("rejects an insert with a forged logged_by", async () => {
        const { data, error } = await userAClient
          .from("interactions")
          .insert({
            school_id: aSchoolId,
            logged_by: userBId,
            type: "email",
            direction: "outbound",
            occurred_at: new Date().toISOString(),
          })
          .select("id");

        expect(error).not.toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("accepts an insert attributed to the authenticated user", async () => {
        const { data, error } = await userAClient
          .from("interactions")
          .insert({
            school_id: aSchoolId,
            logged_by: userAId,
            type: "email",
            direction: "outbound",
            occurred_at: new Date().toISOString(),
          })
          .select("id");

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(1);

        if (data?.[0]?.id) {
          await admin.from("interactions").delete().eq("id", data[0].id as string);
        }
      });
    });
  },
);
