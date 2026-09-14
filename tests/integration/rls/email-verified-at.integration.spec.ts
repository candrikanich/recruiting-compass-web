/**
 * Regression coverage for supabase/migrations/20260928000000_email_verified_at.sql.
 *
 * Proves the backfill left no public.users row with a null email_verified_at,
 * so every pre-existing account is grandfathered as verified and only accounts
 * created after the migration go through the real gate.
 *
 * Same live-Postgres convention as
 * tests/integration/rls/guardian-link-optional.integration.spec.ts: this file
 * skips (with reason) when Supabase env vars are unset — and without vi.unmock
 * the global @supabase/supabase-js mock has no .is(), so it must use the real
 * client.
 */
import { describe, it, expect, vi } from "vitest";

vi.unmock("@supabase/supabase-js");

import { createClient, type RealtimeClientOptions } from "@supabase/supabase-js";
import ws from "ws";
import type { Database } from "~/types/database";

const SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLiveSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = () =>
  createClient<Database>(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

describe.skipIf(!hasLiveSupabase)("email_verified_at backfill", () => {
  it("has no null email_verified_at rows after migration", async () => {
    const supabase = adminClient();
    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("email_verified_at", null);

    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
