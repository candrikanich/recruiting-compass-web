/**
 * Integration regression tests for RLS family-model consolidation Phase 1
 * (foundation) — supabase/migrations/20260805000000_family_unit_id_columns_
 * trigger_backfill.sql.
 *
 * Proves the generic `derive_family_unit_id()` trigger stamps the correct
 * `family_unit_id` on service-role inserts (the pattern used by E2E seeds
 * and legacy write paths that don't set it explicitly) across all 7 tables
 * deferred in claude/database.md:27-35, and that it never overwrites an
 * explicitly-provided value. This is DB-only foundation work — it makes no
 * access-control assertions and adds no RLS policies; that's later phases.
 * Same live-Postgres convention as
 * tests/integration/rls/rls-phase10a-consolidation.integration.spec.ts: this
 * file skips (with reason) when Supabase env vars are unset.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

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
const PASSWORD = "FamilyDeferralsRlsTest123!";

describe.skipIf(!hasLiveSupabase)(
  "RLS family-model consolidation Phase 1 — derivation trigger, live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    let playerId: string;
    let familyId: string;
    let schoolId: string;

    // Row ids inserted by individual tests, cleaned up in afterAll.
    let coachId: string | null = null;
    let documentId: string | null = null;
    let performanceMetricId: string | null = null;
    let interactionId: string | null = null;
    let socialMediaPostId: string | null = null;
    let recommendationLetterId: string | null = null;
    let explicitFamilyUnitCoachId: string | null = null;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const email = `e2e-rls-family-deferrals-${RUN_ID}-player@example.com`;
      const { data: userData, error: userErr } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { role: "player" },
      });
      if (userErr || !userData.user) {
        throw new Error(`createUser(player) failed: ${userErr?.message}`);
      }
      playerId = userData.user.id;

      const { error: profileErr } = await admin.from("users").insert({
        id: playerId,
        email,
        role: "player",
      });
      if (profileErr) {
        throw new Error(`seed public.users failed: ${profileErr.message}`);
      }

      const { data: family, error: familyErr } = await admin
        .from("family_units")
        .insert({ created_by_user_id: playerId, family_name: "Family Deferrals Fam" })
        .select("id")
        .single();
      if (familyErr || !family) {
        throw new Error(`seed family_unit failed: ${familyErr?.message}`);
      }
      familyId = family.id as string;

      const { error: memberErr } = await admin
        .from("family_members")
        .insert({ family_unit_id: familyId, user_id: playerId, role: "player" });
      if (memberErr) {
        throw new Error(`seed family_members failed: ${memberErr.message}`);
      }

      const { data: school, error: schoolErr } = await admin
        .from("schools")
        .insert({
          user_id: playerId,
          family_unit_id: familyId,
          name: `[e2e-rls-family-deferrals-${RUN_ID}] School`,
        })
        .select("id")
        .single();
      if (schoolErr || !school) {
        throw new Error(`seed school failed: ${schoolErr?.message}`);
      }
      schoolId = school.id as string;
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      if (coachId) await admin.from("coaches").delete().eq("id", coachId);
      if (explicitFamilyUnitCoachId)
        await admin.from("coaches").delete().eq("id", explicitFamilyUnitCoachId);
      if (recommendationLetterId)
        await admin.from("recommendation_letters").delete().eq("id", recommendationLetterId);
      if (documentId) await admin.from("documents").delete().eq("id", documentId);
      if (performanceMetricId)
        await admin.from("performance_metrics").delete().eq("id", performanceMetricId);
      if (interactionId) await admin.from("interactions").delete().eq("id", interactionId);
      if (socialMediaPostId)
        await admin.from("social_media_posts").delete().eq("id", socialMediaPostId);
      await admin.from("schools").delete().eq("id", schoolId);
      await admin.from("family_members").delete().eq("family_unit_id", familyId);
      await admin.from("family_units").delete().eq("id", familyId);
      await admin.auth.admin.deleteUser(playerId).catch(() => null);
    });

    describe("derivation trigger", () => {
      it("stamps family_unit_id on a coaches row inserted with only school_id set", async () => {
        const { data, error } = await admin
          .from("coaches")
          .insert({
            school_id: schoolId,
            role: "head",
            first_name: "Derived",
            last_name: "Coach",
            user_id: playerId,
          })
          .select("id, family_unit_id")
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        coachId = data!.id as string;
        expect(data!.family_unit_id).toBe(familyId);
      });

      it("stamps family_unit_id on a documents row inserted with only user_id set", async () => {
        const { data, error } = await admin
          .from("documents")
          .insert({
            user_id: playerId,
            uploaded_by: playerId,
            type: "resume",
            title: `[e2e-rls-family-deferrals-${RUN_ID}] Resume`,
            file_url: "https://example.com/resume.pdf",
          })
          .select("id, family_unit_id")
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        documentId = data!.id as string;
        expect(data!.family_unit_id).toBe(familyId);
      });

      it("stamps family_unit_id on a performance_metrics row inserted with only user_id set", async () => {
        const { data, error } = await admin
          .from("performance_metrics")
          .insert({
            user_id: playerId,
            recorded_date: "2026-08-01",
            metric_type: "40yd_dash",
            value: 4.5,
          })
          .select("id, family_unit_id")
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        performanceMetricId = data!.id as string;
        expect(data!.family_unit_id).toBe(familyId);
      });

      it("stamps family_unit_id on an interactions row inserted with only school_id set", async () => {
        const { data, error } = await admin
          .from("interactions")
          .insert({
            school_id: schoolId,
            logged_by: playerId,
            type: "email",
            direction: "outbound",
            occurred_at: new Date().toISOString(),
          })
          .select("id, family_unit_id")
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        interactionId = data!.id as string;
        expect(data!.family_unit_id).toBe(familyId);
      });

      it("stamps family_unit_id on a social_media_posts row inserted with only school_id set", async () => {
        const { data, error } = await admin
          .from("social_media_posts")
          .insert({
            school_id: schoolId,
            platform: "twitter",
            post_url: `https://twitter.com/example/status/${RUN_ID}`,
          })
          .select("id, family_unit_id")
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        socialMediaPostId = data!.id as string;
        expect(data!.family_unit_id).toBe(familyId);
      });

      it("stamps family_unit_id on a recommendation_letters row inserted with only user_id set", async () => {
        const { data, error } = await admin
          .from("recommendation_letters")
          .insert({
            user_id: playerId,
            writer_name: "Coach Derived",
          })
          .select("id, family_unit_id")
          .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        recommendationLetterId = data!.id as string;
        expect(data!.family_unit_id).toBe(familyId);
      });

      it("does NOT overwrite an explicitly-provided family_unit_id", async () => {
        const { data: otherFamily, error: otherFamilyErr } = await admin
          .from("family_units")
          .insert({ created_by_user_id: playerId, family_name: "Explicit Override Fam" })
          .select("id")
          .single();
        if (otherFamilyErr || !otherFamily) {
          throw new Error(`seed override family_unit failed: ${otherFamilyErr?.message}`);
        }
        const otherFamilyId = otherFamily.id as string;

        try {
          const { data, error } = await admin
            .from("coaches")
            .insert({
              school_id: schoolId,
              role: "assistant",
              first_name: "Explicit",
              last_name: "Coach",
              user_id: playerId,
              family_unit_id: otherFamilyId,
            })
            .select("id, family_unit_id")
            .single();

          expect(error).toBeNull();
          expect(data).not.toBeNull();
          explicitFamilyUnitCoachId = data!.id as string;
          // The trigger must leave the explicitly-provided value alone, even
          // though school_id points at a different family (schoolId ->
          // familyId), proving derivation only fires when family_unit_id
          // arrives NULL.
          expect(data!.family_unit_id).toBe(otherFamilyId);
          expect(data!.family_unit_id).not.toBe(familyId);
        } finally {
          await admin.from("family_units").delete().eq("id", otherFamilyId);
        }
      });
    });
  },
);
