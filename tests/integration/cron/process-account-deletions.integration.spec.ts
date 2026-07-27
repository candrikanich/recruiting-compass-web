/**
 * Integration tests for the GDPR account-deletion cron
 * (server/api/cron/process-account-deletions.get.ts) against a REAL
 * Supabase Postgres instance — not mocks. The bug this cron had (audit
 * finding, planning/audit-2026-07-27-findings.md "SQL / Supabase" row):
 * every delete step's error was ignored and the `deleted` counter was
 * incremented regardless, so a blocked FK meant the GDPR deletion request
 * silently never completed while reporting success. FK constraints alone
 * can't be proven with a mocked client, so this suite exercises the real
 * `deleteUserAccount` step function directly against local Postgres.
 *
 * Requires (same convention as tests/e2e/seed/helpers and
 * tests/integration/rls/rls-security-hotfix.integration.spec.ts):
 * NUXT_PUBLIC_SUPABASE_URL (or TEST_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Skips (with reason) when unset.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// tests/setup.ts globally mocks @supabase/supabase-js for unit specs.
// This suite needs a real client against local Postgres to prove FK
// behavior, so it opts out for itself only (same precedent as the phase 1
// RLS integration spec).
vi.unmock("@supabase/supabase-js");

import { createClient, type RealtimeClientOptions } from "@supabase/supabase-js";
import ws from "ws";
import { execFileSync } from "child_process";
import { deleteUserAccount, DATA_TABLES } from "~/server/api/cron/process-account-deletions.get";

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

/**
 * The Phase 3 migration (20260727000001_gdpr_deletion_fk_cleanup.sql)
 * closes every currently-known NO ACTION FK blocker, so there is no
 * naturally-occurring blocked path left to exercise against local
 * Postgres. To prove the cron's *abort contract* — any application-data
 * step failing must stop the run before the users/auth deletes — this
 * test installs a temporary BEFORE DELETE trigger that raises for one
 * tagged row, exactly reproducing the shape of a real FK/constraint
 * violation (a thrown Postgres error on a DELETE), then removes it.
 * Requires local Docker (same container `supabase start` creates); skips
 * gracefully if the container isn't reachable under this name.
 */
const DB_CONTAINER = "supabase_db_recruiting-compass-web";

const runSql = (sql: string): boolean => {
  try {
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        DB_CONTAINER,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
      ],
      { stdio: "pipe" },
    );
    return true;
  } catch {
    return false;
  }
};

const hasDockerDb = hasLiveSupabase ? runSql("SELECT 1;") : false;

describe.skipIf(!hasLiveSupabase)(
  "process-account-deletions cron — live Postgres",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);

    const makeUser = async (tag: string, role: "player" | "parent" = "player") => {
      const email = `e2e-gdpr-cron-${RUN_ID}-${tag}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: "GdprCronTest123!",
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`createUser(${tag}) failed: ${error?.message}`);
      }
      // No DB trigger creates public.users from auth.users in this schema —
      // profile rows are created app-side (stores/user.ts). Insert directly.
      const { error: profileErr } = await admin.from("users").insert({
        id: data.user.id,
        email,
        role,
      });
      if (profileErr) {
        throw new Error(`seed public.users(${tag}) failed: ${profileErr.message}`);
      }
      return { id: data.user.id as string, email };
    };

    /** Assert every owned/audit row referencing userId is gone or nulled, and
     * that the auth.users record no longer exists. */
    const assertNoOrphans = async (userId: string) => {
      const { data: profile } = await admin
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      expect(profile).toBeNull();

      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      expect(authUser?.user).toBeNull();

      for (const { table, column } of DATA_TABLES) {
        const { data, error } = await admin
          .from(table)
          .select("id")
          .eq(column, userId);
        // Tables absent in this environment are not a failure.
        if (error && error.code === "42P01") continue;
        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
      }

      const { data: deviceTokens } = await admin
        .from("device_tokens")
        .select("id")
        .eq("user_id", userId);
      expect(deviceTokens ?? []).toHaveLength(0);

      const { data: notifPrefs } = await admin
        .from("notification_preferences")
        .select("id")
        .eq("user_id", userId);
      expect(notifPrefs ?? []).toHaveLength(0);

      const { data: deadlines } = await admin
        .from("user_deadlines")
        .select("id")
        .eq("user_id", userId);
      expect(deadlines ?? []).toHaveLength(0);

      const { data: familyMembers } = await admin
        .from("family_members")
        .select("id")
        .eq("user_id", userId);
      expect(familyMembers ?? []).toHaveLength(0);
    };

    describe("(a) solo user", () => {
      let userId: string;

      beforeAll(async () => {
        if (!hasLiveSupabase) return;
        const u = await makeUser("solo");
        userId = u.id;

        await admin.from("schools").insert({
          user_id: userId,
          name: `[gdpr-cron-${RUN_ID}] solo school`,
        });
        await admin.from("device_tokens").insert({
          user_id: userId,
          token: `tok-${RUN_ID}-solo`,
        });
        await admin
          .from("user_deadlines")
          .insert({
            user_id: userId,
            label: "test deadline",
            deadline_date: "2027-01-01",
            category: "application",
          });

        await admin
          .from("users")
          .update({
            deletion_requested_at: new Date(
              Date.now() - 31 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", userId);
      }, 30000);

      it("completes fully with no orphaned rows and no orphaned auth record", async () => {
        const outcome = await deleteUserAccount(admin, {
          id: userId,
          email: `e2e-gdpr-cron-${RUN_ID}-solo@example.com`,
        });

        expect(outcome.status).toBe("deleted");
        await assertNoOrphans(userId);
      });
    });

    describe("(b) family creator with other members remaining", () => {
      let creatorId: string;
      let memberId: string;
      let familyUnitId: string;

      beforeAll(async () => {
        if (!hasLiveSupabase) return;
        const creator = await makeUser("creator", "parent");
        const member = await makeUser("member", "player");
        creatorId = creator.id;
        memberId = member.id;

        const { data: family, error: familyErr } = await admin
          .from("family_units")
          .insert({
            created_by_user_id: creatorId,
            family_name: `[gdpr-cron-${RUN_ID}] fam`,
          })
          .select("id")
          .single();
        if (familyErr || !family) {
          throw new Error(`seed family_unit failed: ${familyErr?.message}`);
        }
        familyUnitId = family.id as string;

        await admin.from("family_members").insert([
          { family_unit_id: familyUnitId, user_id: creatorId, role: "parent" },
          { family_unit_id: familyUnitId, user_id: memberId, role: "player" },
        ]);
      }, 30000);

      afterAll(async () => {
        if (!hasLiveSupabase) return;
        await admin.from("family_members").delete().eq("family_unit_id", familyUnitId);
        await admin.from("family_units").delete().eq("id", familyUnitId);
        await admin.auth.admin.deleteUser(memberId).catch(() => null);
        await admin.from("users").delete().eq("id", memberId);
      });

      it("deletes the creator, sets created_by_user_id to NULL, and leaves the family/other member intact", async () => {
        const outcome = await deleteUserAccount(admin, {
          id: creatorId,
          email: `e2e-gdpr-cron-${RUN_ID}-creator@example.com`,
        });

        expect(outcome.status).toBe("deleted");
        await assertNoOrphans(creatorId);

        const { data: family } = await admin
          .from("family_units")
          .select("id, created_by_user_id")
          .eq("id", familyUnitId)
          .single();
        expect(family).not.toBeNull();
        expect(family?.created_by_user_id).toBeNull();

        const { data: remainingMembers } = await admin
          .from("family_members")
          .select("user_id")
          .eq("family_unit_id", familyUnitId);
        expect(remainingMembers?.map((m) => m.user_id)).toEqual([memberId]);
      });
    });

    describe("(c) invited/member user (non-creator)", () => {
      let creatorId: string;
      let memberId: string;
      let familyUnitId: string;

      beforeAll(async () => {
        if (!hasLiveSupabase) return;
        const creator = await makeUser("creator2", "parent");
        const member = await makeUser("member2", "player");
        creatorId = creator.id;
        memberId = member.id;

        const { data: family, error: familyErr } = await admin
          .from("family_units")
          .insert({
            created_by_user_id: creatorId,
            family_name: `[gdpr-cron-${RUN_ID}] fam2`,
          })
          .select("id")
          .single();
        if (familyErr || !family) {
          throw new Error(`seed family_unit failed: ${familyErr?.message}`);
        }
        familyUnitId = family.id as string;

        await admin.from("family_members").insert([
          { family_unit_id: familyUnitId, user_id: creatorId, role: "parent" },
          { family_unit_id: familyUnitId, user_id: memberId, role: "player" },
        ]);
      }, 30000);

      afterAll(async () => {
        if (!hasLiveSupabase) return;
        await admin.from("family_members").delete().eq("family_unit_id", familyUnitId);
        await admin.from("family_units").delete().eq("id", familyUnitId);
        await admin.auth.admin.deleteUser(creatorId).catch(() => null);
        await admin.from("users").delete().eq("id", creatorId);
      });

      it("detaches the member, deletes their account, and leaves the family unit and creator untouched", async () => {
        const outcome = await deleteUserAccount(admin, {
          id: memberId,
          email: `e2e-gdpr-cron-${RUN_ID}-member2@example.com`,
        });

        expect(outcome.status).toBe("deleted");
        await assertNoOrphans(memberId);

        const { data: family } = await admin
          .from("family_units")
          .select("id, created_by_user_id")
          .eq("id", familyUnitId)
          .single();
        expect(family?.created_by_user_id).toBe(creatorId);

        const { data: remainingMembers } = await admin
          .from("family_members")
          .select("user_id")
          .eq("family_unit_id", familyUnitId);
        expect(remainingMembers?.map((m) => m.user_id)).toEqual([creatorId]);
      });
    });

    describe.skipIf(!hasDockerDb)(
      "(d) blocked deletion is reported as failed, not swallowed as success",
      () => {
        let userId: string;
        const blockedSchoolName = `[gdpr-cron-${RUN_ID}] undeletable school`;
        const triggerFnName = `test_block_delete_${RUN_ID}`;

        beforeAll(async () => {
          if (!hasLiveSupabase || !hasDockerDb) return;
          const u = await makeUser("blocked");
          userId = u.id;

          await admin.from("schools").insert({
            user_id: userId,
            name: blockedSchoolName,
          });

          // The Phase 3 migration closes every currently-known NO ACTION FK
          // blocker, so there's no naturally-occurring blocked path left.
          // Install a temporary trigger that raises on DELETE for this one
          // tagged row — this reproduces the exact shape of a real
          // FK/constraint violation (a thrown Postgres error mid-DELETE)
          // so the abort contract is proven against a real thrown DB error,
          // not a mock.
          const created = runSql(`
            CREATE OR REPLACE FUNCTION ${triggerFnName}() RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'simulated FK/constraint violation for %', OLD.id;
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER ${triggerFnName}_trg
              BEFORE DELETE ON public.schools
              FOR EACH ROW
              WHEN (OLD.name = '${blockedSchoolName.replace(/'/g, "''")}')
              EXECUTE FUNCTION ${triggerFnName}();
          `);
          if (!created) {
            throw new Error("failed to install test blocking trigger");
          }
        }, 30000);

        afterAll(async () => {
          if (!hasLiveSupabase || !hasDockerDb) return;
          runSql(
            `DROP TRIGGER IF EXISTS ${triggerFnName}_trg ON public.schools; DROP FUNCTION IF EXISTS ${triggerFnName}();`,
          );
          await admin.from("schools").delete().eq("user_id", userId);
          await admin.from("users").delete().eq("id", userId);
          await admin.auth.admin.deleteUser(userId).catch(() => null);
        });

        it("aborts on the blocked data-table delete and never deletes the users or auth record", async () => {
          const outcome = await deleteUserAccount(admin, {
            id: userId,
            email: `e2e-gdpr-cron-${RUN_ID}-blocked@example.com`,
          });

          expect(outcome.status).toBe("failed");
          if (outcome.status === "failed") {
            expect(outcome.step).toBe("data:schools");
            expect(outcome.reason.toLowerCase()).toContain(
              "simulated fk/constraint violation",
            );
          }

          // public.users row must still exist (delete never reached) — retry-safe.
          const { data: profile } = await admin
            .from("users")
            .select("id")
            .eq("id", userId)
            .maybeSingle();
          expect(profile).not.toBeNull();

          // auth.users must NOT have been deleted despite the app-data failure.
          const { data: authUser } = await admin.auth.admin.getUserById(userId);
          expect(authUser?.user).not.toBeNull();

          // The blocked school row itself must still exist too — nothing
          // silently succeeded around the failure.
          const { data: school } = await admin
            .from("schools")
            .select("id")
            .eq("user_id", userId);
          expect(school ?? []).toHaveLength(1);

          // Drop the trigger before teardown deletes the row for real.
          runSql(
            `DROP TRIGGER IF EXISTS ${triggerFnName}_trg ON public.schools; DROP FUNCTION IF EXISTS ${triggerFnName}();`,
          );
        });
      },
    );
  },
);
