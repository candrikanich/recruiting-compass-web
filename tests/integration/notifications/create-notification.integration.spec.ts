/**
 * Real-Postgres integration test for POST /api/notifications/create
 * (planning/audit-2026-07-27-findings.md, "4. Correctness / bugs":
 * `server/api/notifications/create.post.ts:13-33,55-66`).
 *
 * A mocked Supabase client can't prove this bug: the failure is a genuine
 * Postgres enum/CHECK constraint violation ('offer'/'event' were missing
 * from the notification_type enum; 'action_url' column didn't exist at all)
 * that a mock insert() always "succeeds" past. This exercises the real
 * handler against local Postgres to prove every zod-accepted payload
 * actually inserts.
 *
 * Requires (same convention as tests/integration/tasks/athlete-tasks-athlete-id.integration.spec.ts):
 * NUXT_PUBLIC_SUPABASE_URL (or TEST_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
 * Skips (with reason) when unset.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { H3Event } from "h3";

vi.unmock("@supabase/supabase-js");

import {
  createClient,
  type SupabaseClient,
  type RealtimeClientOptions,
} from "@supabase/supabase-js";
import ws from "ws";

const SUPABASE_URL =
  process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasLiveSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

const adminClient = (): SupabaseClient =>
  createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: vi.fn(),
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage: string;
    }) => Error & { statusCode: number };
  }
).createError = (config: { statusCode: number; statusMessage: string }) => {
  const err = new Error(config.statusMessage) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

const RUN_ID = Date.now();
const fakeEvent = { context: {}, node: { req: {}, res: {} } } as H3Event;

describe.skipIf(!hasLiveSupabase)(
  "POST /api/notifications/create — real Postgres schema constraints",
  () => {
    const admin = hasLiveSupabase ? adminClient() : (null as never);
    let userId: string;

    beforeAll(async () => {
      if (!hasLiveSupabase) return;
      const email = `e2e-notif-create-${RUN_ID}@example.com`;
      const { data: authUser, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password: "NotifCreateTest123!",
          email_confirm: true,
        });
      if (authError || !authUser.user) {
        throw new Error(`Failed to create auth user: ${authError?.message}`);
      }
      userId = authUser.user.id;
      const { error: userInsertError } = await admin
        .from("users")
        .insert({ id: userId, email, role: "player" });
      if (userInsertError) {
        throw new Error(
          `Failed to insert public.users row: ${userInsertError.message}`,
        );
      }
    });

    afterAll(async () => {
      if (!hasLiveSupabase) return;
      await admin.from("notifications").delete().eq("user_id", userId);
      await admin.from("users").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    });

    async function callCreate(body: Record<string, unknown>) {
      const { requireAuth } = await import("~/server/utils/auth");
      const { createServerSupabaseClient } =
        await import("~/server/utils/supabase");
      const { readBody } = await import("h3");
      vi.mocked(requireAuth).mockResolvedValue({
        id: userId,
        email: "player@example.com",
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(admin);
      vi.mocked(readBody).mockResolvedValue(body);

      const handler = (await import("~/server/api/notifications/create.post"))
        .default;
      return handler(fakeEvent);
    }

    it("AC2: every zod-accepted notification type inserts successfully against the real DB enum", async () => {
      const types = [
        "follow_up_reminder",
        "deadline_alert",
        "daily_digest",
        "inbound_interaction",
        "offer",
        "event",
      ] as const;

      for (const type of types) {
        const title = `RUN-${RUN_ID}-${type}`;
        const result = (await callCreate({ type, title })) as {
          success: boolean;
        };
        expect(result.success).toBe(true);

        const { data, error } = await admin
          .from("notifications")
          .select("id, type")
          .eq("user_id", userId)
          .eq("title", title)
          .single();
        expect(error).toBeNull();
        expect((data as { type: string } | null)?.type).toBe(type);
      }
    });

    it("AC2: accepts action_url and persists it on the row", async () => {
      const title = `RUN-${RUN_ID}-action-url`;
      const result = (await callCreate({
        type: "offer",
        title,
        priority: "high",
        action_url: "/schools/123",
      })) as { success: boolean };
      expect(result.success).toBe(true);

      const { data, error } = await admin
        .from("notifications")
        .select("action_url, priority")
        .eq("user_id", userId)
        .eq("title", title)
        .single();
      expect(error).toBeNull();
      expect((data as { action_url: string }).action_url).toBe("/schools/123");
      expect((data as { priority: string }).priority).toBe("high");
    });

    it("AC2: accepts priority 'normal' against the real CHECK constraint", async () => {
      const title = `RUN-${RUN_ID}-normal-priority`;
      const result = (await callCreate({
        type: "deadline_alert",
        title,
        priority: "normal",
      })) as { success: boolean };
      expect(result.success).toBe(true);

      const { data, error } = await admin
        .from("notifications")
        .select("priority")
        .eq("user_id", userId)
        .eq("title", title)
        .single();
      expect(error).toBeNull();
      expect((data as { priority: string }).priority).toBe("normal");
    });
  },
);
