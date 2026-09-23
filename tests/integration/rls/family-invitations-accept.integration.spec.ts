/**
 * RLS regression tests for the family_invitations invitee-accept policies
 * (supabase/migrations/20260928000014_family_invitations_invitee_accept.sql),
 * part of the #912 service-role migration.
 *
 * The invitee never gets a raw table-level UPDATE/INSERT grant for these
 * writes -- both go through the accept_family_invitation SECURITY DEFINER
 * RPC, which reads the invitation's own `role` column rather than trusting
 * any client input (closing a qodo-code-review finding on an earlier
 * revision of this migration: a raw WITH CHECK policy couldn't stop an
 * invitee from rewriting the issued role before accepting).
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
const PASSWORD = "RlsInviteAcceptTest123!";

describe.skipIf(!hasLiveSupabase)(
  "family_invitations invitee-accept policies — live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    // Family F1 created by A. Invitation targets the invitee's email, role
    // 'parent' -- the common case, and the one a role-escalation attempt
    // would target (player invitee trying to become a parent).
    let userAId: string;
    let inviteeId: string;
    let inviteeEmail: string;
    let strangerId: string;
    let inviteeClient: SupabaseClient;
    let strangerClient: SupabaseClient;
    let familyF1Id: string;
    let invitationId: string;

    // Family F2 created by C, a separate player-role invitation -- proves
    // the RPC always uses the invitation's own role, not something client
    // -supplied (there's no role parameter on the RPC at all, but this
    // confirms end-to-end that the resulting membership matches what was
    // actually issued).
    let userCId: string;
    let invitee2Id: string;
    let invitee2Email: string;
    let invitee2Client: SupabaseClient;
    let familyF2Id: string;
    let invitation2Id: string;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;

      const makeUser = async (tag: string) => {
        const email = `e2e-rls-fiaccept-${RUN_ID}-${tag}@example.com`;
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

      const [a, invitee, stranger, c, invitee2] = await Promise.all([
        makeUser("a"),
        makeUser("invitee"),
        makeUser("stranger"),
        makeUser("c"),
        makeUser("invitee2"),
      ]);
      userAId = a.id;
      inviteeId = invitee.id;
      inviteeEmail = invitee.email;
      strangerId = stranger.id;
      userCId = c.id;
      invitee2Id = invitee2.id;
      invitee2Email = invitee2.email;

      inviteeClient = await signIn(invitee.email, PASSWORD);
      strangerClient = await signIn(stranger.email, PASSWORD);
      invitee2Client = await signIn(invitee2.email, PASSWORD);

      const { data: f1, error: f1Err } = await admin
        .from("family_units")
        .insert({ created_by_user_id: userAId, family_name: "F1" })
        .select("id")
        .single();
      if (f1Err || !f1) throw new Error(`seed F1 failed: ${f1Err?.message}`);
      familyF1Id = f1.id as string;

      const { error: memberErr } = await admin.from("family_members").insert({
        family_unit_id: familyF1Id,
        user_id: userAId,
        role: "parent",
      });
      if (memberErr) {
        throw new Error(`seed A's family_members row failed: ${memberErr.message}`);
      }

      const { data: invitation, error: invErr } = await admin
        .from("family_invitations")
        .insert({
          family_unit_id: familyF1Id,
          invited_email: inviteeEmail,
          invited_by: userAId,
          role: "parent",
          status: "pending",
          token: `fixture-${RUN_ID}-a`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (invErr || !invitation) {
        throw new Error(`seed invitation failed: ${invErr?.message}`);
      }
      invitationId = invitation.id as string;

      const { data: f2, error: f2Err } = await admin
        .from("family_units")
        .insert({ created_by_user_id: userCId, family_name: "F2" })
        .select("id")
        .single();
      if (f2Err || !f2) throw new Error(`seed F2 failed: ${f2Err?.message}`);
      familyF2Id = f2.id as string;

      const { error: member2Err } = await admin.from("family_members").insert({
        family_unit_id: familyF2Id,
        user_id: userCId,
        role: "parent",
      });
      if (member2Err) {
        throw new Error(`seed C's family_members row failed: ${member2Err.message}`);
      }

      const { data: invitation2, error: inv2Err } = await admin
        .from("family_invitations")
        .insert({
          family_unit_id: familyF2Id,
          invited_email: invitee2Email,
          invited_by: userCId,
          role: "player",
          status: "pending",
          token: `fixture-${RUN_ID}-b`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();
      if (inv2Err || !invitation2) {
        throw new Error(`seed invitation2 failed: ${inv2Err?.message}`);
      }
      invitation2Id = invitation2.id as string;
    }, 30000);

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("family_members").delete().eq("family_unit_id", familyF1Id);
      await admin.from("family_members").delete().eq("family_unit_id", familyF2Id);
      await admin.from("family_invitations").delete().eq("id", invitationId);
      await admin.from("family_invitations").delete().eq("id", invitation2Id);
      await admin.from("family_units").delete().eq("id", familyF1Id);
      await admin.from("family_units").delete().eq("id", familyF2Id);
      for (const id of [userAId, inviteeId, strangerId, userCId, invitee2Id]) {
        await admin.auth.admin.deleteUser(id).catch(() => null);
      }
    });

    it("a stranger cannot SELECT the invitation by id, even knowing it", async () => {
      const { data, error } = await strangerClient
        .from("family_invitations")
        .select("id")
        .eq("id", invitationId);

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("the invitee CAN SELECT their own pending invitation before joining the family", async () => {
      const { data, error } = await inviteeClient
        .from("family_invitations")
        .select("id")
        .eq("id", invitationId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("a stranger cannot UPDATE the invitation to accepted via raw table access", async () => {
      const { data, error } = await strangerClient
        .from("family_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)
        .select("id");

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: stillPending } = await admin
        .from("family_invitations")
        .select("status")
        .eq("id", invitationId)
        .single();
      expect(stillPending?.status).toBe("pending");
    });

    it("the invitee ALSO cannot UPDATE the invitation via raw table access -- not even to their own role", async () => {
      // family_invitations_update was deliberately NOT widened to the invitee
      // (see migration comment): a raw UPDATE grant would let them rewrite
      // `role` before accepting. Acceptance only happens through the RPC.
      const { data, error } = await inviteeClient
        .from("family_invitations")
        .update({ role: "parent" })
        .eq("id", invitationId)
        .select("id");

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);

      const { data: unchanged } = await admin
        .from("family_invitations")
        .select("role, status")
        .eq("id", invitationId)
        .single();
      expect(unchanged?.role).toBe("parent");
      expect(unchanged?.status).toBe("pending");
    });

    it("a stranger cannot call accept_family_invitation for someone else's invitation", async () => {
      const { error } = await strangerClient.rpc("accept_family_invitation", {
        p_invitation_id: invitationId,
      });

      expect(error).not.toBeNull();

      const { data: memberRow } = await admin
        .from("family_members")
        .select("id")
        .eq("family_unit_id", familyF1Id)
        .eq("user_id", strangerId);
      expect(memberRow ?? []).toHaveLength(0);

      const { data: stillPending } = await admin
        .from("family_invitations")
        .select("status")
        .eq("id", invitationId)
        .single();
      expect(stillPending?.status).toBe("pending");
    });

    it("the invitee accepts via the RPC: family_members role always matches the invitation's issued role, not any client input", async () => {
      const { error } = await invitee2Client.rpc("accept_family_invitation", {
        p_invitation_id: invitation2Id,
      });
      expect(error).toBeNull();

      const { data: memberRow } = await admin
        .from("family_members")
        .select("role")
        .eq("family_unit_id", familyF2Id)
        .eq("user_id", invitee2Id)
        .single();
      expect(memberRow?.role).toBe("player");

      const { data: invitationRow } = await admin
        .from("family_invitations")
        .select("status")
        .eq("id", invitation2Id)
        .single();
      expect(invitationRow?.status).toBe("accepted");
    });

    it("the invitee accepts F1's parent invitation via the RPC", async () => {
      const { error } = await inviteeClient.rpc("accept_family_invitation", {
        p_invitation_id: invitationId,
      });
      expect(error).toBeNull();

      const { data: memberRow } = await admin
        .from("family_members")
        .select("role")
        .eq("family_unit_id", familyF1Id)
        .eq("user_id", inviteeId)
        .single();
      expect(memberRow?.role).toBe("parent");

      const { data: invitationRow } = await admin
        .from("family_invitations")
        .select("status")
        .eq("id", invitationId)
        .single();
      expect(invitationRow?.status).toBe("accepted");
    });

    it("re-calling the RPC after acceptance is idempotent (no duplicate membership row)", async () => {
      const { error } = await inviteeClient.rpc("accept_family_invitation", {
        p_invitation_id: invitationId,
      });
      // Already accepted (status !== 'pending') -- the RPC raises, matching
      // the route's own pre-check for a non-pending invitation.
      expect(error).not.toBeNull();

      const { data: memberRows } = await admin
        .from("family_members")
        .select("id")
        .eq("family_unit_id", familyF1Id)
        .eq("user_id", inviteeId);
      expect(memberRows).toHaveLength(1);
    });
  },
);
