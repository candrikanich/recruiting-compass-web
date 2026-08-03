/**
 * RLS regression tests for Phase 10a (account_links-era policy
 * consolidation) — supabase/migrations/20260728000000_rls_account_links_
 * consolidation_phase10a.sql.
 *
 * Proves the family_unit_id/family_members-era policies are, on their own
 * (with NO account_links relationship anywhere in the fixture data),
 * sufficient for every verb where an account_links-era sibling policy was
 * dropped — and that dropping it didn't newly expose data to an unrelated
 * user. Same live-Postgres convention as
 * tests/integration/rls/rls-security-hotfix.integration.spec.ts: this file
 * skips (with reason) when Supabase env vars are unset.
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
const PASSWORD = "Phase10aRlsTest123!";

describe.skipIf(!hasLiveSupabase)(
  "RLS Phase 10a consolidation — live Postgres, family-model-only access",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    // Family Alpha: player + parent, co-members, NO account_links row at all.
    let alphaPlayerId: string;
    let alphaParentId: string;
    let alphaFamilyId: string;
    let alphaSchoolId: string;
    let alphaInteractionId: string;

    // Family Beta: unrelated stranger, no link/family overlap with Alpha.
    let betaUserId: string;
    let betaFamilyId: string;

    let alphaPlayerClient: SupabaseClient;
    let alphaParentClient: SupabaseClient;
    let betaClient: SupabaseClient;

    const makeUser = async (tag: string, role: "player" | "parent") => {
      const email = `e2e-rls-10a-${RUN_ID}-${tag}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { role },
      });
      if (error || !data.user) {
        throw new Error(`createUser(${tag}) failed: ${error?.message}`);
      }
      const { error: profileErr } = await admin.from("users").insert({
        id: data.user.id,
        email,
        role,
      });
      if (profileErr) {
        throw new Error(
          `seed public.users(${tag}) failed: ${profileErr.message}`,
        );
      }
      return { id: data.user.id, email };
    };

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const player = await makeUser("alpha-player", "player");
      const parent = await makeUser("alpha-parent", "parent");
      const stranger = await makeUser("beta", "player");
      alphaPlayerId = player.id;
      alphaParentId = parent.id;
      betaUserId = stranger.id;

      alphaPlayerClient = await signIn(player.email, PASSWORD);
      alphaParentClient = await signIn(parent.email, PASSWORD);
      betaClient = await signIn(stranger.email, PASSWORD);

      // Family Alpha: family_units + family_members ONLY — no account_links row
      // is ever created for this fixture, proving family-model-only coverage.
      const { data: alphaFamily, error: alphaFamilyErr } = await admin
        .from("family_units")
        .insert({
          created_by_user_id: alphaPlayerId,
          family_name: "10a Alpha Fam",
        })
        .select("id")
        .single();
      if (alphaFamilyErr || !alphaFamily) {
        throw new Error(
          `seed alpha family_unit failed: ${alphaFamilyErr?.message}`,
        );
      }
      alphaFamilyId = alphaFamily.id as string;

      const { error: alphaMembersErr } = await admin
        .from("family_members")
        .insert([
          {
            family_unit_id: alphaFamilyId,
            user_id: alphaPlayerId,
            role: "player",
          },
          {
            family_unit_id: alphaFamilyId,
            user_id: alphaParentId,
            role: "parent",
          },
        ]);
      if (alphaMembersErr) {
        throw new Error(
          `seed alpha family_members failed: ${alphaMembersErr.message}`,
        );
      }

      // Family Beta: unrelated single-member family (the stranger).
      const { data: betaFamily, error: betaFamilyErr } = await admin
        .from("family_units")
        .insert({ created_by_user_id: betaUserId, family_name: "10a Beta Fam" })
        .select("id")
        .single();
      if (betaFamilyErr || !betaFamily) {
        throw new Error(
          `seed beta family_unit failed: ${betaFamilyErr?.message}`,
        );
      }
      betaFamilyId = betaFamily.id as string;

      const { error: betaMembersErr } = await admin
        .from("family_members")
        .insert({
          family_unit_id: betaFamilyId,
          user_id: betaUserId,
          role: "player",
        });
      if (betaMembersErr) {
        throw new Error(
          `seed beta family_members failed: ${betaMembersErr.message}`,
        );
      }

      // School owned by the Alpha player, family_unit_id set (as real app code
      // in composables/useSchools.ts always does on insert).
      const { data: school, error: schoolErr } = await admin
        .from("schools")
        .insert({
          user_id: alphaPlayerId,
          family_unit_id: alphaFamilyId,
          name: `[e2e-rls-10a-${RUN_ID}] Alpha School`,
        })
        .select("id")
        .single();
      if (schoolErr || !school) {
        throw new Error(`seed school failed: ${schoolErr?.message}`);
      }
      alphaSchoolId = school.id as string;

      // Interaction logged by the Alpha player, with family_unit_id set (as
      // real app code in composables/useInteractions.ts always does).
      const { data: interaction, error: interactionErr } = await admin
        .from("interactions")
        .insert({
          school_id: alphaSchoolId,
          family_unit_id: alphaFamilyId,
          logged_by: alphaPlayerId,
          type: "email",
          direction: "outbound",
          occurred_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (interactionErr || !interaction) {
        throw new Error(`seed interaction failed: ${interactionErr?.message}`);
      }
      alphaInteractionId = interaction.id as string;
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("interactions").delete().eq("id", alphaInteractionId);
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
      await admin.auth.admin.deleteUser(alphaParentId).catch(() => null);
      await admin.auth.admin.deleteUser(betaUserId).catch(() => null);
    });

    describe("schools: family_unit_id-only SELECT/UPDATE (account_links policies dropped)", () => {
      it("a family member with NO account_links row can SELECT the family's school", async () => {
        const { data, error } = await alphaParentClient
          .from("schools")
          .select("id")
          .eq("id", alphaSchoolId);

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("a family member with NO account_links row can UPDATE the family's school", async () => {
        const { data, error } = await alphaParentClient
          .from("schools")
          .update({ name: "Renamed by parent via family model" })
          .eq("id", alphaSchoolId)
          .select("id");

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("an unrelated user (different family, no link) cannot SELECT the school", async () => {
        const { data, error } = await betaClient
          .from("schools")
          .select("id")
          .eq("id", alphaSchoolId);

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("an unrelated user (different family, no link) cannot UPDATE the school", async () => {
        const { data, error } = await betaClient
          .from("schools")
          .update({ name: "hijacked" })
          .eq("id", alphaSchoolId)
          .select("id");

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });
    });

    describe("users: family_members-only SELECT (account_links policy dropped)", () => {
      it("a family member with NO account_links row can view the other member's profile", async () => {
        const { data, error } = await alphaParentClient
          .from("users")
          .select("id")
          .eq("id", alphaPlayerId);

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("an unrelated user cannot view a stranger's profile via family model", async () => {
        const { data, error } = await betaClient
          .from("users")
          .select("id")
          .eq("id", alphaPlayerId);

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });
    });

    describe("interactions: UPDATE/DELETE via plain ownership after dropping the account_links-era AND'd sibling", () => {
      it("the logging user can UPDATE their own interaction (no schools-ownership chain needed)", async () => {
        const { data, error } = await alphaPlayerClient
          .from("interactions")
          .update({ direction: "inbound" })
          .eq("id", alphaInteractionId)
          .select("id");

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
      });

      it("a different family member (not the logger) cannot UPDATE the interaction via ownership alone", async () => {
        const { data, error } = await alphaParentClient
          .from("interactions")
          .update({ direction: "outbound" })
          .eq("id", alphaInteractionId)
          .select("id");

        // "Users can update own interactions" gates on logged_by = auth.uid();
        // the parent didn't log it, so this must be a no-op, not an error.
        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("an unrelated user cannot DELETE the interaction", async () => {
        const { data, error } = await betaClient
          .from("interactions")
          .delete()
          .eq("id", alphaInteractionId)
          .select("id");

        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      });

      it("the logging user can DELETE their own interaction", async () => {
        const { data, error } = await alphaPlayerClient
          .from("interactions")
          .delete()
          .eq("id", alphaInteractionId)
          .select("id");

        expect(error).toBeNull();
        expect(data).toHaveLength(1);

        // Already deleted — afterAll's cleanup delete becomes a harmless no-op.
      });
    });
  },
);
