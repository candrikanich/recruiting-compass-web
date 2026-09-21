/**
 * POST /api/admin/delete-user — real behavioral tests.
 *
 * planning/audit-2026-07-27-findings.md listed this admin destructive
 * endpoint among the ~35/98 untested API endpoints — notable since it's an
 * irreversible, cross-table user-data deletion gated only by requireAdmin.
 * Covers the admin gate, input validation, self-delete prevention, the
 * not-found paths (public.users vs auth-only), and the happy path's
 * cross-table + auth deletion.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";

vi.mock("~/server/utils/auth", () => ({ requireAdmin: vi.fn() }));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: async (event: H3Event) =>
      (event as unknown as { _body: unknown })._body,
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
    }) => Error & {
      statusCode: number;
    };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage) as Error & { statusCode: number };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(body: Record<string, unknown>): H3Event {
  return { _body: body } as unknown as H3Event;
}

function buildSupabaseAdmin(opts: {
  existingUserId?: string;
  authUsers?: Array<{ id: string; email: string }>;
  deleteError?: { code?: string; message: string } | null;
  authDeleteError?: { message: string } | null;
  // Controls step 6b's own users-row delete specifically, independent of
  // `deleteError` (which only applies to the generic per-table loop, since
  // "users" is no longer part of that loop).
  usersDeleteError?: { message: string } | null;
  // Controls the post-delete verification SELECT: true reproduces the exact
  // ghost-data bug (row still there despite no thrown error).
  usersRowStillExistsAfterDelete?: boolean;
  // Makes the post-delete verification SELECT itself fail (RLS denial,
  // network blip) — must not be treated as proof the row is gone.
  verifyReadError?: { message: string } | null;
}) {
  const deleteCalls: Array<{ table: string; column: string; value: string }> =
    [];
  const updateCalls: Array<{ table: string; column: string; value: string }> =
    [];
  return {
    _deleteCalls: deleteCalls,
    _updateCalls: updateCalls,
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: opts.existingUserId ? { id: opts.existingUserId } : null,
              error: opts.existingUserId ? null : { message: "not found" },
            }),
          maybeSingle: () =>
            Promise.resolve({
              data:
                table === "users" && opts.usersRowStillExistsAfterDelete
                  ? { id: opts.existingUserId }
                  : null,
              error: table === "users" ? (opts.verifyReadError ?? null) : null,
            }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: string) => {
          if (table === "users") {
            // Step 6b's own delete, not the generic per-table loop.
            return Promise.resolve({ error: opts.usersDeleteError ?? null });
          }
          deleteCalls.push({ table, column, value });
          return Promise.resolve({
            error: opts.deleteError ?? null,
          });
        },
      }),
      update: (payload: unknown) => ({
        eq: (column: string, value: string) => {
          updateCalls.push({ table, column, value });
          return Promise.resolve({ error: null, payload });
        },
      }),
    })),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: opts.authUsers ?? [] },
          error: null,
        }),
        deleteUser: vi.fn().mockResolvedValue({
          error: opts.authDeleteError ?? null,
        }),
      },
    },
  };
}

vi.mock("~/server/utils/supabase", () => ({ useSupabaseAdmin: vi.fn() }));

async function loadHandler() {
  return (await import("~/server/api/admin/delete-user.post")).default;
}

describe("POST /api/admin/delete-user", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const { requireAdmin } = await import("~/server/utils/auth");
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    });
  });

  it("propagates requireAdmin's rejection for a non-admin caller", async () => {
    const { requireAdmin } = await import("~/server/utils/auth");
    vi.mocked(requireAdmin).mockRejectedValue(
      Object.assign(new Error("Forbidden"), { statusCode: 403 }),
    );
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "target@example.com" })),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects a missing email with 400", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildSupabaseAdmin({}) as never,
    );
    const handler = await loadHandler();

    await expect(handler(fakeEvent({}))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects a malformed email with 400", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildSupabaseAdmin({}) as never,
    );
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "not-an-email" })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuses to delete the calling admin's own account", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildSupabaseAdmin({}) as never,
    );
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "admin@example.com" })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 404 when the email exists in neither public.users nor auth", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    vi.mocked(useSupabaseAdmin).mockReturnValue(
      buildSupabaseAdmin({ authUsers: [] }) as never,
    );
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "ghost@example.com" })),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("deletes the user's rows across every dependent table and the auth record on the happy path", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const mockAdmin = buildSupabaseAdmin({ existingUserId: "target-1" });
    vi.mocked(useSupabaseAdmin).mockReturnValue(mockAdmin as never);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ email: "target@example.com" }),
    )) as { success: boolean; message: string };

    expect(result.success).toBe(true);
    expect(result.message).toContain("including auth records");
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("target-1");
    // guardian_claims.claimed_by is a NO ACTION FK to users.id — must be
    // cleared before the users row delete, or that delete is silently blocked.
    const tables = mockAdmin._deleteCalls.map((c) => c.table);
    expect(tables).toContain("guardian_claims");
    // admin_invitations.invited_by is also NO ACTION (issue #854 review
    // finding) — an admin who minted any invitation would otherwise leave
    // their own auth.users delete silently blocked by that FK.
    expect(tables).toContain("admin_invitations");
    expect(mockAdmin._deleteCalls.every((c) => c.value === "target-1")).toBe(
      true,
    );
    // users.guardian_consent_by is also NO ACTION and self-referencing — cleared
    // via UPDATE (not DELETE) on any other row naming this user as the guardian.
    expect(mockAdmin._updateCalls).toContainEqual({
      table: "users",
      column: "guardian_consent_by",
      value: "target-1",
    });
  });

  it("reports failure instead of a false success when the users row survives the delete", async () => {
    // Reproduces the exact bug found live on QA: a guardian who had confirmed a
    // claim couldn't actually be deleted (blocked by a NO ACTION FK the old code
    // never cleared), but the endpoint swallowed the error and reported success
    // anyway, leaving the row fully intact with nothing surfaced anywhere.
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const mockAdmin = buildSupabaseAdmin({
      existingUserId: "target-1",
      usersDeleteError: {
        message:
          'update or delete on table "users" violates foreign key constraint',
      },
      usersRowStillExistsAfterDelete: true,
    });
    vi.mocked(useSupabaseAdmin).mockReturnValue(mockAdmin as never);
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "target@example.com" })),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("reports failure when the users row still exists after delete even without an explicit error", async () => {
    // Belt-and-suspenders: some FK violations or RLS denials come back as a
    // silently-no-op delete rather than a populated error object. The
    // post-delete verification SELECT is what actually catches this class.
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const mockAdmin = buildSupabaseAdmin({
      existingUserId: "target-1",
      usersRowStillExistsAfterDelete: true,
    });
    vi.mocked(useSupabaseAdmin).mockReturnValue(mockAdmin as never);
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "target@example.com" })),
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it("reports failure instead of a false success when the verification read itself errors", async () => {
    // qodo finding: a failed verification SELECT (RLS denial, network blip)
    // must not be treated as proof the row is gone. Old code destructured
    // only `data` and ignored `error`, so an errored read (data: undefined)
    // fell through the `if (stillExists)` check as a false success.
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const mockAdmin = buildSupabaseAdmin({
      existingUserId: "target-1",
      verifyReadError: { message: "permission denied for table users" },
    });
    vi.mocked(useSupabaseAdmin).mockReturnValue(mockAdmin as never);
    const handler = await loadHandler();

    await expect(
      handler(fakeEvent({ email: "target@example.com" })),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("falls back to the auth system when the user was already removed from public.users", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const mockAdmin = buildSupabaseAdmin({
      authUsers: [{ id: "auth-only-1", email: "orphan@example.com" }],
    });
    vi.mocked(useSupabaseAdmin).mockReturnValue(mockAdmin as never);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ email: "orphan@example.com" }),
    )) as { success: boolean };

    expect(result.success).toBe(true);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("auth-only-1");
  });

  it("still reports success (data already deleted) when the auth-record delete itself fails", async () => {
    const { useSupabaseAdmin } = await import("~/server/utils/supabase");
    const mockAdmin = buildSupabaseAdmin({
      existingUserId: "target-1",
      authDeleteError: { message: "auth API unavailable" },
    });
    vi.mocked(useSupabaseAdmin).mockReturnValue(mockAdmin as never);
    const handler = await loadHandler();

    const result = (await handler(
      fakeEvent({ email: "target@example.com" }),
    )) as { success: boolean; message: string };

    expect(result.success).toBe(true);
    expect(result.message).not.toContain("including auth records");
  });
});
