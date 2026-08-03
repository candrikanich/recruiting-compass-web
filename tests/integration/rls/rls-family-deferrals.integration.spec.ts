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
      const { data: userData, error: userErr } =
        await admin.auth.admin.createUser({
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
        .insert({
          created_by_user_id: playerId,
          family_name: "Family Deferrals Fam",
        })
        .select("id")
        .single();
      if (familyErr || !family) {
        throw new Error(`seed family_unit failed: ${familyErr?.message}`);
      }
      familyId = family.id as string;

      const { error: memberErr } = await admin
        .from("family_members")
        .insert({
          family_unit_id: familyId,
          user_id: playerId,
          role: "player",
        });
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
        await admin
          .from("coaches")
          .delete()
          .eq("id", explicitFamilyUnitCoachId);
      if (recommendationLetterId)
        await admin
          .from("recommendation_letters")
          .delete()
          .eq("id", recommendationLetterId);
      if (documentId)
        await admin.from("documents").delete().eq("id", documentId);
      if (performanceMetricId)
        await admin
          .from("performance_metrics")
          .delete()
          .eq("id", performanceMetricId);
      if (interactionId)
        await admin.from("interactions").delete().eq("id", interactionId);
      if (socialMediaPostId)
        await admin
          .from("social_media_posts")
          .delete()
          .eq("id", socialMediaPostId);
      await admin.from("schools").delete().eq("id", schoolId);
      await admin
        .from("family_members")
        .delete()
        .eq("family_unit_id", familyId);
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
          .insert({
            created_by_user_id: playerId,
            family_name: "Explicit Override Fam",
          })
          .select("id")
          .single();
        if (otherFamilyErr || !otherFamily) {
          throw new Error(
            `seed override family_unit failed: ${otherFamilyErr?.message}`,
          );
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

/**
 * Phase 3 — additive family-model policies
 * (supabase/migrations/20260808000000_family_policies_additive.sql).
 *
 * These assertions go GREEN only once BOTH the Phase 1 migration
 * (20260805000000_family_unit_id_columns_trigger_backfill.sql — adds
 * family_unit_id + derivation trigger to social_media_posts and
 * recommendation_letters) AND the Phase 3 migration in this PR
 * (20260808000000_family_policies_additive.sql — the new family
 * SELECT/INSERT/UPDATE/DELETE policies themselves) have been applied to the
 * live DB by a human (this repo forbids agent-run migrations against the
 * single prod/non-prod DB — see task brief). Run once immediately after
 * writing this file, against a DB still at migration head 20260801000000:
 * expected RED, and specifically column-does-not-exist errors on
 * family_unit_id for social_media_posts/recommendation_letters inserts
 * (Phase 1 not yet applied), not policy-violation errors — those would mean
 * a stale/misleading pass. Document the actual failure shape in the PR.
 */
describe.skipIf(!hasLiveSupabase)(
  "RLS family-model consolidation Phase 3 — additive family policies, live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    let alphaPlayerId: string;
    let betaPlayerId: string;
    let alphaFamilyId: string;
    let betaFamilyId: string;
    let alphaSchoolId: string;
    let alphaClient: SupabaseClient;
    let betaClient: SupabaseClient;

    // Read-fixture rows, seeded once in beforeAll, read-only in the positive
    // and negative-control assertions below.
    let alphaPostId: string;
    let alphaLetterId: string;

    // Dedicated per-verb DELETE-target rows, one set per table, so DELETE
    // assertions never touch a row another assertion still depends on.
    let deletableSchoolId: string;
    let deletableCoachId: string;
    let deletableDocumentId: string;
    let deletablePerformanceMetricId: string;
    let deletablePostId: string;
    let deletableLetterId: string;

    // Rows created by the INSERT/UPDATE assertions themselves, cleaned up in
    // afterAll as a safety net (the DELETE assertion within the same `it`
    // already removes them on the happy path).
    let insertedPostId: string | null = null;
    let insertedLetterId: string | null = null;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const alphaEmail = `e2e-rls-phase3-${RUN_ID}-alpha@example.com`;
      const betaEmail = `e2e-rls-phase3-${RUN_ID}-beta@example.com`;

      const { data: alphaUser, error: alphaUserErr } =
        await admin.auth.admin.createUser({
          email: alphaEmail,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { role: "player" },
        });
      if (alphaUserErr || !alphaUser.user) {
        throw new Error(`createUser(alpha) failed: ${alphaUserErr?.message}`);
      }
      alphaPlayerId = alphaUser.user.id;

      const { data: betaUser, error: betaUserErr } =
        await admin.auth.admin.createUser({
          email: betaEmail,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { role: "player" },
        });
      if (betaUserErr || !betaUser.user) {
        throw new Error(`createUser(beta) failed: ${betaUserErr?.message}`);
      }
      betaPlayerId = betaUser.user.id;

      const { error: alphaProfileErr } = await admin
        .from("users")
        .insert({ id: alphaPlayerId, email: alphaEmail, role: "player" });
      if (alphaProfileErr) {
        throw new Error(
          `seed public.users(alpha) failed: ${alphaProfileErr.message}`,
        );
      }
      const { error: betaProfileErr } = await admin
        .from("users")
        .insert({ id: betaPlayerId, email: betaEmail, role: "player" });
      if (betaProfileErr) {
        throw new Error(
          `seed public.users(beta) failed: ${betaProfileErr.message}`,
        );
      }

      // Family-model-only members — deliberately NO account_links row for
      // either user, so any access these tests observe can only come from
      // the family-model policies under test, not the legacy path.
      const { data: alphaFamily, error: alphaFamilyErr } = await admin
        .from("family_units")
        .insert({
          created_by_user_id: alphaPlayerId,
          family_name: "Phase 3 Family Alpha",
        })
        .select("id")
        .single();
      if (alphaFamilyErr || !alphaFamily) {
        throw new Error(
          `seed family_unit(alpha) failed: ${alphaFamilyErr?.message}`,
        );
      }
      alphaFamilyId = alphaFamily.id as string;

      const { data: betaFamily, error: betaFamilyErr } = await admin
        .from("family_units")
        .insert({
          created_by_user_id: betaPlayerId,
          family_name: "Phase 3 Family Beta",
        })
        .select("id")
        .single();
      if (betaFamilyErr || !betaFamily) {
        throw new Error(
          `seed family_unit(beta) failed: ${betaFamilyErr?.message}`,
        );
      }
      betaFamilyId = betaFamily.id as string;

      const { error: alphaMemberErr } = await admin
        .from("family_members")
        .insert({
          family_unit_id: alphaFamilyId,
          user_id: alphaPlayerId,
          role: "player",
        });
      if (alphaMemberErr) {
        throw new Error(
          `seed family_members(alpha) failed: ${alphaMemberErr.message}`,
        );
      }
      const { error: betaMemberErr } = await admin
        .from("family_members")
        .insert({
          family_unit_id: betaFamilyId,
          user_id: betaPlayerId,
          role: "player",
        });
      if (betaMemberErr) {
        throw new Error(
          `seed family_members(beta) failed: ${betaMemberErr.message}`,
        );
      }

      const { data: alphaSchool, error: alphaSchoolErr } = await admin
        .from("schools")
        .insert({
          user_id: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          name: `[e2e-rls-phase3-${RUN_ID}] Alpha School`,
        })
        .select("id")
        .single();
      if (alphaSchoolErr || !alphaSchool) {
        throw new Error(
          `seed school(alpha) failed: ${alphaSchoolErr?.message}`,
        );
      }
      alphaSchoolId = alphaSchool.id as string;

      // Read fixtures — visible-to-alpha, hidden-from-beta rows exercised by
      // the SELECT assertions.
      const { data: post, error: postErr } = await admin
        .from("social_media_posts")
        .insert({
          school_id: alphaSchoolId,
          family_unit_id: alphaFamilyId,
          platform: "twitter",
          post_url: `https://twitter.com/example/status/phase3-read-${RUN_ID}`,
        })
        .select("id")
        .single();
      if (postErr || !post) {
        throw new Error(
          `seed social_media_posts(read fixture) failed: ${postErr?.message}`,
        );
      }
      alphaPostId = post.id as string;

      const { data: letter, error: letterErr } = await admin
        .from("recommendation_letters")
        .insert({
          user_id: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          writer_name: "Phase 3 Read Fixture Writer",
        })
        .select("id")
        .single();
      if (letterErr || !letter) {
        throw new Error(
          `seed recommendation_letters(read fixture) failed: ${letterErr?.message}`,
        );
      }
      alphaLetterId = letter.id as string;

      // DELETE-target fixtures — one dedicated row per table under test, so
      // the negative-control (beta no-op delete) and positive (alpha real
      // delete) assertions never race over the same row.
      const { data: delSchool, error: delSchoolErr } = await admin
        .from("schools")
        .insert({
          user_id: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          name: `[e2e-rls-phase3-${RUN_ID}] Deletable School`,
        })
        .select("id")
        .single();
      if (delSchoolErr || !delSchool) {
        throw new Error(
          `seed schools(delete fixture) failed: ${delSchoolErr?.message}`,
        );
      }
      deletableSchoolId = delSchool.id as string;

      const { data: delCoach, error: delCoachErr } = await admin
        .from("coaches")
        .insert({
          school_id: alphaSchoolId,
          family_unit_id: alphaFamilyId,
          user_id: alphaPlayerId,
          role: "assistant",
          first_name: "Deletable",
          last_name: "Coach",
        })
        .select("id")
        .single();
      if (delCoachErr || !delCoach) {
        throw new Error(
          `seed coaches(delete fixture) failed: ${delCoachErr?.message}`,
        );
      }
      deletableCoachId = delCoach.id as string;

      const { data: delDocument, error: delDocumentErr } = await admin
        .from("documents")
        .insert({
          user_id: alphaPlayerId,
          uploaded_by: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          type: "resume",
          title: `[e2e-rls-phase3-${RUN_ID}] Deletable Resume`,
          file_url: "https://example.com/deletable-resume.pdf",
        })
        .select("id")
        .single();
      if (delDocumentErr || !delDocument) {
        throw new Error(
          `seed documents(delete fixture) failed: ${delDocumentErr?.message}`,
        );
      }
      deletableDocumentId = delDocument.id as string;

      const { data: delMetric, error: delMetricErr } = await admin
        .from("performance_metrics")
        .insert({
          user_id: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          recorded_date: "2026-08-01",
          metric_type: "40yd_dash",
          value: 4.6,
        })
        .select("id")
        .single();
      if (delMetricErr || !delMetric) {
        throw new Error(
          `seed performance_metrics(delete fixture) failed: ${delMetricErr?.message}`,
        );
      }
      deletablePerformanceMetricId = delMetric.id as string;

      const { data: delPost, error: delPostErr } = await admin
        .from("social_media_posts")
        .insert({
          school_id: alphaSchoolId,
          family_unit_id: alphaFamilyId,
          platform: "twitter",
          post_url: `https://twitter.com/example/status/phase3-delete-${RUN_ID}`,
        })
        .select("id")
        .single();
      if (delPostErr || !delPost) {
        throw new Error(
          `seed social_media_posts(delete fixture) failed: ${delPostErr?.message}`,
        );
      }
      deletablePostId = delPost.id as string;

      const { data: delLetter, error: delLetterErr } = await admin
        .from("recommendation_letters")
        .insert({
          user_id: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          writer_name: "Phase 3 Delete Fixture Writer",
        })
        .select("id")
        .single();
      if (delLetterErr || !delLetter) {
        throw new Error(
          `seed recommendation_letters(delete fixture) failed: ${delLetterErr?.message}`,
        );
      }
      deletableLetterId = delLetter.id as string;

      alphaClient = await signIn(alphaEmail, PASSWORD);
      betaClient = await signIn(betaEmail, PASSWORD);
    }, 60000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      if (insertedPostId)
        await admin
          .from("social_media_posts")
          .delete()
          .eq("id", insertedPostId);
      if (insertedLetterId)
        await admin
          .from("recommendation_letters")
          .delete()
          .eq("id", insertedLetterId);
      // DELETE-fixture rows: no-op if the positive assertion already removed
      // them (empty match, no error).
      await admin.from("social_media_posts").delete().eq("id", deletablePostId);
      await admin
        .from("recommendation_letters")
        .delete()
        .eq("id", deletableLetterId);
      await admin
        .from("performance_metrics")
        .delete()
        .eq("id", deletablePerformanceMetricId);
      await admin.from("documents").delete().eq("id", deletableDocumentId);
      await admin.from("coaches").delete().eq("id", deletableCoachId);
      await admin.from("schools").delete().eq("id", deletableSchoolId);
      await admin.from("social_media_posts").delete().eq("id", alphaPostId);
      await admin
        .from("recommendation_letters")
        .delete()
        .eq("id", alphaLetterId);
      await admin.from("schools").delete().eq("id", alphaSchoolId);
      await admin
        .from("family_members")
        .delete()
        .eq("family_unit_id", alphaFamilyId);
      await admin
        .from("family_members")
        .delete()
        .eq("family_unit_id", betaFamilyId);
      await admin.from("family_units").delete().eq("id", alphaFamilyId);
      await admin.from("family_units").delete().eq("id", betaFamilyId);
      await admin.auth.admin.deleteUser(alphaPlayerId).catch(() => null);
      await admin.auth.admin.deleteUser(betaPlayerId).catch(() => null);
    });

    // Beta's negative-control block runs FIRST, before Alpha's positive
    // DELETE assertions consume the shared deletable-* fixtures — otherwise
    // a 0-row delete result from Beta would prove nothing (the row would
    // already be gone from Alpha's own delete, not RLS).
    describe("Family Beta member — negative control, no access to Alpha's rows", () => {
      it("cannot SELECT Alpha's social_media_posts or recommendation_letters rows", async () => {
        const { data: posts, error: postsErr } = await betaClient
          .from("social_media_posts")
          .select("id")
          .eq("id", alphaPostId);
        expect(postsErr).toBeNull();
        expect(posts).toHaveLength(0);

        const { data: letters, error: lettersErr } = await betaClient
          .from("recommendation_letters")
          .select("id")
          .eq("id", alphaLetterId);
        expect(lettersErr).toBeNull();
        expect(letters).toHaveLength(0);
      });

      it("cannot DELETE Alpha's social_media_posts or recommendation_letters rows (no-op)", async () => {
        const { data: postDelete, error: postDeleteErr } = await betaClient
          .from("social_media_posts")
          .delete()
          .eq("id", deletablePostId)
          .select("id");
        expect(postDeleteErr).toBeNull();
        expect(postDelete).toHaveLength(0);

        const { data: letterDelete, error: letterDeleteErr } = await betaClient
          .from("recommendation_letters")
          .delete()
          .eq("id", deletableLetterId)
          .select("id");
        expect(letterDeleteErr).toBeNull();
        expect(letterDelete).toHaveLength(0);

        // Prove the rows genuinely survived the no-op delete, not that the
        // fixture happened to already be gone.
        const { data: postStillThere } = await admin
          .from("social_media_posts")
          .select("id")
          .eq("id", deletablePostId);
        expect(postStillThere).toHaveLength(1);
        const { data: letterStillThere } = await admin
          .from("recommendation_letters")
          .select("id")
          .eq("id", deletableLetterId);
        expect(letterStillThere).toHaveLength(1);
      });

      it("cannot DELETE Alpha's school, coach, document, or performance_metrics rows (no-op)", async () => {
        const { data: schoolDelete, error: schoolErr } = await betaClient
          .from("schools")
          .delete()
          .eq("id", deletableSchoolId)
          .select("id");
        expect(schoolErr).toBeNull();
        expect(schoolDelete).toHaveLength(0);

        const { data: coachDelete, error: coachErr } = await betaClient
          .from("coaches")
          .delete()
          .eq("id", deletableCoachId)
          .select("id");
        expect(coachErr).toBeNull();
        expect(coachDelete).toHaveLength(0);

        const { data: documentDelete, error: documentErr } = await betaClient
          .from("documents")
          .delete()
          .eq("id", deletableDocumentId)
          .select("id");
        expect(documentErr).toBeNull();
        expect(documentDelete).toHaveLength(0);

        const { data: metricDelete, error: metricErr } = await betaClient
          .from("performance_metrics")
          .delete()
          .eq("id", deletablePerformanceMetricId)
          .select("id");
        expect(metricErr).toBeNull();
        expect(metricDelete).toHaveLength(0);

        // Prove the rows genuinely survived the no-op deletes.
        const { data: schoolStillThere } = await admin
          .from("schools")
          .select("id")
          .eq("id", deletableSchoolId);
        expect(schoolStillThere).toHaveLength(1);
        const { data: coachStillThere } = await admin
          .from("coaches")
          .select("id")
          .eq("id", deletableCoachId);
        expect(coachStillThere).toHaveLength(1);
        const { data: documentStillThere } = await admin
          .from("documents")
          .select("id")
          .eq("id", deletableDocumentId);
        expect(documentStillThere).toHaveLength(1);
        const { data: metricStillThere } = await admin
          .from("performance_metrics")
          .select("id")
          .eq("id", deletablePerformanceMetricId);
        expect(metricStillThere).toHaveLength(1);
      });
    });

    describe("Family Alpha member — positive access via new family policies", () => {
      it("can SELECT a social_media_posts row in their own family", async () => {
        const { data, error } = await alphaClient
          .from("social_media_posts")
          .select("id")
          .eq("id", alphaPostId);

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("can INSERT, UPDATE, and DELETE a social_media_posts row in their own family", async () => {
        const { data: inserted, error: insertErr } = await alphaClient
          .from("social_media_posts")
          .insert({
            school_id: alphaSchoolId,
            family_unit_id: alphaFamilyId,
            platform: "twitter",
            post_url: `https://twitter.com/example/status/phase3-crud-${RUN_ID}`,
          })
          .select("id")
          .single();
        expect(insertErr).toBeNull();
        expect(inserted).not.toBeNull();
        insertedPostId = inserted!.id as string;

        const { data: updated, error: updateErr } = await alphaClient
          .from("social_media_posts")
          .update({ notes: "updated by alpha" })
          .eq("id", insertedPostId)
          .select("id, notes")
          .single();
        expect(updateErr).toBeNull();
        expect(updated?.notes).toBe("updated by alpha");

        const { data: deleted, error: deleteErr } = await alphaClient
          .from("social_media_posts")
          .delete()
          .eq("id", insertedPostId)
          .select("id");
        expect(deleteErr).toBeNull();
        expect(deleted).toHaveLength(1);
        insertedPostId = null;
      });

      it("can SELECT a recommendation_letters row in their own family", async () => {
        const { data, error } = await alphaClient
          .from("recommendation_letters")
          .select("id")
          .eq("id", alphaLetterId);

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("can INSERT, UPDATE, and DELETE a recommendation_letters row in their own family", async () => {
        const { data: inserted, error: insertErr } = await alphaClient
          .from("recommendation_letters")
          .insert({
            user_id: alphaPlayerId,
            family_unit_id: alphaFamilyId,
            writer_name: "Phase 3 CRUD Writer",
          })
          .select("id")
          .single();
        expect(insertErr).toBeNull();
        expect(inserted).not.toBeNull();
        insertedLetterId = inserted!.id as string;

        const { data: updated, error: updateErr } = await alphaClient
          .from("recommendation_letters")
          .update({ notes: "updated by alpha" })
          .eq("id", insertedLetterId)
          .select("id, notes")
          .single();
        expect(updateErr).toBeNull();
        expect(updated?.notes).toBe("updated by alpha");

        const { data: deleted, error: deleteErr } = await alphaClient
          .from("recommendation_letters")
          .delete()
          .eq("id", insertedLetterId)
          .select("id");
        expect(deleteErr).toBeNull();
        expect(deleted).toHaveLength(1);
        insertedLetterId = null;
      });

      it("can DELETE a school in their own family", async () => {
        const { data, error } = await alphaClient
          .from("schools")
          .delete()
          .eq("id", deletableSchoolId)
          .select("id");
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("can DELETE a coach in their own family", async () => {
        const { data, error } = await alphaClient
          .from("coaches")
          .delete()
          .eq("id", deletableCoachId)
          .select("id");
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("can DELETE a document in their own family", async () => {
        const { data, error } = await alphaClient
          .from("documents")
          .delete()
          .eq("id", deletableDocumentId)
          .select("id");
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("can DELETE a performance_metrics row in their own family", async () => {
        const { data, error } = await alphaClient
          .from("performance_metrics")
          .delete()
          .eq("id", deletablePerformanceMetricId)
          .select("id");
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });
    });
  },
);
