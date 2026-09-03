/**
 * Integration tests for family entitlement plumbing (Phase 0) —
 * supabase/migrations/20260916000000_family_subscriptions.sql.
 *
 * Proves the family_units insert trigger stamps a founding subscription row,
 * that family_subscriptions is readable only by family members and never
 * writable by them, and that family_can_write() correctly gates writes on
 * family content tables via the restrictive policies added by that
 * migration. Same live-Postgres convention as the other specs in this
 * directory: this file skips (with reason) when Supabase env vars are
 * unset.
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
const PASSWORD = "FamilySubsRlsTest123!";

describe.skipIf(!hasLiveSupabase)(
  "family_subscriptions — trigger, family_can_write, restrictive write gate",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);
    let playerId: string;
    let familyId: string;
    let email: string;

    const setStatus = async (
      status: string,
      extra: Record<string, unknown> = {},
    ) => {
      const { error } = await admin
        .from("family_subscriptions")
        .update({ status, ...extra })
        .eq("family_unit_id", familyId);
      if (error) throw new Error(`setStatus(${status}): ${error.message}`);
    };

    const insertSchoolAsPlayer = async () => {
      const client = await signIn(email, PASSWORD);
      return client
        .from("schools")
        .insert({
          user_id: playerId,
          family_unit_id: familyId,
          name: `[e2e-subs-${RUN_ID}] ${Math.random()}`,
        })
        .select("id")
        .single();
    };

    beforeAll(async () => {
      if (!hasLiveSupabase) return;
      email = `e2e-rls-subs-${RUN_ID}-player@example.com`;
      const { data: userData, error: userErr } =
        await admin.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { role: "player" },
        });
      if (userErr || !userData.user) throw new Error(userErr?.message);
      playerId = userData.user.id;
      await admin.from("users").insert({ id: playerId, email, role: "player" });
      const { data: family, error: familyErr } = await admin
        .from("family_units")
        .insert({ created_by_user_id: playerId, family_name: "Subs Fam" })
        .select("id")
        .single();
      if (familyErr || !family) throw new Error(familyErr?.message);
      familyId = family.id as string;
      await admin
        .from("family_members")
        .insert({ family_unit_id: familyId, user_id: playerId, role: "player" });
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("schools").delete().eq("family_unit_id", familyId);
      await admin.from("family_units").delete().eq("id", familyId);
      await admin.auth.admin.deleteUser(playerId);
    });

    it("trigger creates a founding row for a new family (pre-flip)", async () => {
      const { data } = await admin
        .from("family_subscriptions")
        .select("status, source")
        .eq("family_unit_id", familyId)
        .single();
      expect(data).toEqual({ status: "founding", source: "founding" });
    });

    it("member can SELECT own family_subscriptions row", async () => {
      const client = await signIn(email, PASSWORD);
      const { data, error } = await client
        .from("family_subscriptions")
        .select("status")
        .eq("family_unit_id", familyId)
        .single();
      expect(error).toBeNull();
      expect(data?.status).toBe("founding");
    });

    it("member cannot UPDATE family_subscriptions", async () => {
      const client = await signIn(email, PASSWORD);
      const { data } = await client
        .from("family_subscriptions")
        .update({ status: "comp" })
        .eq("family_unit_id", familyId)
        .select("status");
      expect(data ?? []).toHaveLength(0);
    });

    it("family_can_write matrix", async () => {
      const can = async () => {
        const { data, error } = await admin.rpc("family_can_write", {
          p_family_unit_id: familyId,
        });
        if (error) throw new Error(error.message);
        return data as boolean;
      };
      await setStatus("founding");
      expect(await can()).toBe(true);
      await setStatus("active");
      expect(await can()).toBe(true);
      await setStatus("comp");
      expect(await can()).toBe(true);
      await setStatus("read_only");
      expect(await can()).toBe(false);
      await setStatus("trialing", {
        trial_ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      expect(await can()).toBe(true);
      await setStatus("trialing", {
        trial_ends_at: new Date(Date.now() - 86_400_000).toISOString(),
      });
      expect(await can()).toBe(false);
      await setStatus("founding");
    });

    it("read_only family: INSERT denied, SELECT allowed, UPDATE denied", async () => {
      await setStatus("founding");
      const seeded = await insertSchoolAsPlayer();
      expect(seeded.error).toBeNull();
      const schoolId = seeded.data!.id as string;

      await setStatus("read_only");
      const denied = await insertSchoolAsPlayer();
      expect(denied.error).not.toBeNull();

      const client = await signIn(email, PASSWORD);
      const { data: rows } = await client
        .from("schools")
        .select("id")
        .eq("id", schoolId);
      expect(rows).toHaveLength(1);

      const { data: updated } = await client
        .from("schools")
        .update({ name: "renamed" })
        .eq("id", schoolId)
        .select("id");
      expect(updated ?? []).toHaveLength(0);

      await setStatus("founding");
    });
  },
);
