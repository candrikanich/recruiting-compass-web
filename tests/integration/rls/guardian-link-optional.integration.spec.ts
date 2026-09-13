/**
 * Regression coverage for supabase/migrations/20260927000000_guardian_link_optional.sql.
 *
 * Proves a 13-17 player's public.users row can now be inserted with no family
 * membership, no family_invitations row, and no guardian_claims row — the state a
 * player produces by skipping the guardian step in the signup wizard. Pre-migration,
 * trg_enforce_minor_requires_invite rejects this insert with a check_violation.
 *
 * Same live-Postgres convention as
 * tests/integration/rls/rls-family-deferrals.integration.spec.ts: this file skips
 * (with reason) when Supabase env vars are unset.
 */
import { describe, it, expect, vi } from "vitest";

vi.unmock("@supabase/supabase-js");

import { createClient, type RealtimeClientOptions } from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = () =>
  createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

const RUN_ID = Date.now();
const yearsAgo = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};

describe.skipIf(!hasLiveSupabase)("guardian link is optional at insert", () => {
  it("allows a 13-17 public.users row with no family/invitation/claim proof", async () => {
    const supabase = adminClient();
    const email = `guardian-optional-${RUN_ID}@example.com`;

    // Mirrors handle_new_user()'s write shape without going through auth.signUp —
    // this test is about the trigger on public.users, not the auth layer.
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: "TestPass123!",
        email_confirm: true,
      });
    expect(authError).toBeNull();
    const userId = authUser!.user!.id;

    try {
      const { error: insertError } = await supabase.from("users").upsert({
        id: userId,
        email,
        full_name: "Guardian Optional Test",
        role: "player",
        date_of_birth: yearsAgo(15),
      });

      expect(insertError).toBeNull();
    } finally {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
    }
  });
});
