/**
 * RLS regression test for #916 (supabase/migrations/
 * 20260928000016_drop_loose_family_members_insert_policy.sql): a stranger
 * with no invitation and no ownership relationship to a family must not be
 * able to INSERT themselves into it.
 *
 * Hits a REAL Supabase Postgres instance — not mocks — same convention as
 * rls-security-hotfix.integration.spec.ts.
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
const PASSWORD = "TestFixtureAaa111!";

describe.skipIf(!hasLiveSupabase)(
  "family_members INSERT policy — no loose self-join hole — live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    let ownerId: string;
    let strangerId: string;
    let strangerClient: SupabaseClient;
    let targetId: string;
    let familyId: string;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const makeUser = async (tag: string) => {
        const email = `e2e-rls-fminsert-${RUN_ID}-${tag}@example.com`;
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { role: "player" },
        });
        if (error || !data.user) {
          throw new Error(`createUser(${tag}) failed: ${error?.message}`);
        }
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

      const [owner, stranger, target] = await Promise.all([
        makeUser("owner"),
        makeUser("stranger"),
        makeUser("target"),
      ]);
      ownerId = owner.id;
      strangerId = stranger.id;
      targetId = target.id;
      strangerClient = await signIn(stranger.email, PASSWORD);

      const { data: family, error: familyErr } = await admin
        .from("family_units")
        .insert({ created_by_user_id: ownerId, family_name: "F1" })
        .select("id")
        .single();
      if (familyErr || !family) {
        throw new Error(`seed family failed: ${familyErr?.message}`);
      }
      familyId = family.id as string;

      const { error: memberErr } = await admin.from("family_members").insert({
        family_unit_id: familyId,
        user_id: ownerId,
        role: "parent",
      });
      if (memberErr) {
        throw new Error(`seed owner's family_members row failed: ${memberErr.message}`);
      }
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("family_members").delete().eq("family_unit_id", familyId);
      await admin.from("family_units").delete().eq("id", familyId);
      for (const id of [ownerId, strangerId, targetId]) {
        await admin.auth.admin.deleteUser(id).catch(() => null);
      }
    });

    it("a stranger with no invitation and no ownership cannot INSERT themselves into the family", async () => {
      const { data, error } = await strangerClient
        .from("family_members")
        .insert({ family_unit_id: familyId, user_id: strangerId, role: "parent" })
        .select("id");

      expect(error).not.toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: stillAbsent } = await admin
        .from("family_members")
        .select("id")
        .eq("family_unit_id", familyId)
        .eq("user_id", strangerId);
      expect(stillAbsent ?? []).toHaveLength(0);
    });

    it("a stranger cannot spoof a different (not-yet-a-member) user's identity into the family either", async () => {
      // targetId has no prior family_members row anywhere, so a rejection
      // here can only come from the WITH CHECK's user-identity/ownership
      // clause -- not the (family_unit_id, user_id) uniqueness constraint
      // that owner's already-seeded row would otherwise also explain.
      const { data, error } = await strangerClient
        .from("family_members")
        .insert({ family_unit_id: familyId, user_id: targetId, role: "parent" })
        .select("id");

      expect(error).not.toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: stillAbsent } = await admin
        .from("family_members")
        .select("id")
        .eq("family_unit_id", familyId)
        .eq("user_id", targetId);
      expect(stillAbsent ?? []).toHaveLength(0);
    });
  },
);
