/**
 * RLS regression tests for the family_members DELETE policy
 * (supabase/migrations/20260928000013_family_members_delete_policy.sql),
 * part of the #912 service-role migration.
 *
 * Hits a REAL Supabase Postgres instance — not mocks — same convention as
 * rls-security-hotfix.integration.spec.ts. See that file for the pattern
 * this one follows.
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
const PASSWORD = "RlsFamilyMembersDeleteTest123!";

describe.skipIf(!hasLiveSupabase)(
  "family_members DELETE policy — live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    // F1: created by A. A is seeded as a *parent* member of their own family
    // (not just family_units.created_by_user_id) so the self-removal clause
    // has a real row to deny. B (parent) and E (player) are also F1 members.
    let userAId: string;
    let userBId: string;
    let userEId: string;
    let userAClient: SupabaseClient;
    let familyF1Id: string;
    let memberAId: string; // A's own family_members row in F1
    let memberBId: string; // B's parent row in F1
    let memberEId: string; // E's player row in F1

    // F2: created by C, member D (parent) — cross-tenant target, A has no
    // relationship to this family at all.
    let userCId: string;
    let userDId: string;
    let familyF2Id: string;
    let memberDId: string;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const makeUser = async (tag: string) => {
        const email = `e2e-rls-fmdel-${RUN_ID}-${tag}@example.com`;
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

      const [a, b, e, c, d] = await Promise.all([
        makeUser("a"),
        makeUser("b"),
        makeUser("e"),
        makeUser("c"),
        makeUser("d"),
      ]);
      userAId = a.id;
      userBId = b.id;
      userEId = e.id;
      userCId = c.id;
      userDId = d.id;

      userAClient = await signIn(a.email, PASSWORD);

      const { data: f1, error: f1Err } = await admin
        .from("family_units")
        .insert({ created_by_user_id: userAId, family_name: "F1" })
        .select("id")
        .single();
      if (f1Err || !f1) throw new Error(`seed F1 failed: ${f1Err?.message}`);
      familyF1Id = f1.id as string;

      const { data: f1Members, error: f1MembersErr } = await admin
        .from("family_members")
        .insert([
          { family_unit_id: familyF1Id, user_id: userAId, role: "parent" },
          { family_unit_id: familyF1Id, user_id: userBId, role: "parent" },
          { family_unit_id: familyF1Id, user_id: userEId, role: "player" },
        ])
        .select("id, user_id");
      if (f1MembersErr || !f1Members) {
        throw new Error(`seed F1 members failed: ${f1MembersErr?.message}`);
      }
      memberAId = f1Members.find((m) => m.user_id === userAId)!.id as string;
      memberBId = f1Members.find((m) => m.user_id === userBId)!.id as string;
      memberEId = f1Members.find((m) => m.user_id === userEId)!.id as string;

      const { data: f2, error: f2Err } = await admin
        .from("family_units")
        .insert({ created_by_user_id: userCId, family_name: "F2" })
        .select("id")
        .single();
      if (f2Err || !f2) throw new Error(`seed F2 failed: ${f2Err?.message}`);
      familyF2Id = f2.id as string;

      const { data: f2Member, error: f2MemberErr } = await admin
        .from("family_members")
        .insert({ family_unit_id: familyF2Id, user_id: userDId, role: "parent" })
        .select("id")
        .single();
      if (f2MemberErr || !f2Member) {
        throw new Error(`seed F2 member failed: ${f2MemberErr?.message}`);
      }
      memberDId = f2Member.id as string;
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("family_members").delete().eq("family_unit_id", familyF1Id);
      await admin.from("family_members").delete().eq("family_unit_id", familyF2Id);
      await admin.from("family_units").delete().eq("id", familyF1Id);
      await admin.from("family_units").delete().eq("id", familyF2Id);
      for (const id of [userAId, userBId, userEId, userCId, userDId]) {
        await admin.auth.admin.deleteUser(id).catch(() => null);
      }
    });

    it("A (creator of F1) cannot DELETE D's row (D belongs to F2, not F1)", async () => {
      const { data, error } = await userAClient
        .from("family_members")
        .delete()
        .eq("id", memberDId)
        .select("id");

      // RLS hides the row rather than throwing: 0 rows affected.
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: stillThere } = await admin
        .from("family_members")
        .select("id")
        .eq("id", memberDId);
      expect(stillThere).toHaveLength(1);
    });

    it("A cannot DELETE E's row (E is role='player', not 'parent')", async () => {
      const { data, error } = await userAClient
        .from("family_members")
        .delete()
        .eq("id", memberEId)
        .select("id");

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: stillThere } = await admin
        .from("family_members")
        .select("id")
        .eq("id", memberEId);
      expect(stillThere).toHaveLength(1);
    });

    it("A cannot DELETE their own row (user_id = auth.uid() is excluded)", async () => {
      const { data, error } = await userAClient
        .from("family_members")
        .delete()
        .eq("id", memberAId)
        .select("id");

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: stillThere } = await admin
        .from("family_members")
        .select("id")
        .eq("id", memberAId);
      expect(stillThere).toHaveLength(1);
    });

    it("A (creator of F1) CAN DELETE B's row (parent, same family, not self)", async () => {
      const { data, error } = await userAClient
        .from("family_members")
        .delete()
        .eq("id", memberBId)
        .select("id");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      const { data: stillThere } = await admin
        .from("family_members")
        .select("id")
        .eq("id", memberBId);
      expect(stillThere ?? []).toHaveLength(0);
    });
  },
);
