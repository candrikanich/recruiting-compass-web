import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

// vi.mock factories are hoisted — declare mocks with vi.hoisted so they're
// available both inside the factory and in tests
const { mockReadBody } = vi.hoisted(() => ({ mockReadBody: vi.fn() }));

vi.mock("h3", async (importOriginal) => {
  const original = await importOriginal<typeof import("h3")>();
  return { ...original, readBody: mockReadBody };
});

// Mock server utilities before importing the handler
vi.mock("~/server/utils/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { requireAdmin } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockUseSupabaseAdmin = vi.mocked(useSupabaseAdmin);

const mockEvent = {} as Parameters<typeof import("h3").defineEventHandler>[0];

function makeAdminUser(email = "admin@example.com") {
  return { id: "admin-uuid", email };
}

function makeSupabaseMock({
  lookupData,
  lookupError,
  deleteUserError,
  // IDs that remain in `users` after the bulk delete — reproduces the NO
  // ACTION FK block (guardian_claims.claimed_by / users.guardian_consent_by)
  // the old code never cleared. Empty by default (clean delete).
  survivorIds = [],
  usersDeleteError,
}: {
  lookupData?: { id: string } | null;
  lookupError?: object | null;
  deleteUserError?: object | null;
  survivorIds?: string[];
  usersDeleteError?: object | null;
} = {}) {
  const deleteUserMock = vi.fn().mockResolvedValue({
    error: deleteUserError ?? null,
  });
  const updateCalls: Array<{ table: string }> = [];

  return {
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: lookupData ?? { id: "target-uuid" },
            error: lookupError ?? null,
          }),
        }),
        // The post-delete survivors check: .from("users").select("id").in("id", ids)
        in: vi.fn().mockResolvedValue({
          data:
            table === "users" ? survivorIds.map((id) => ({ id })) : [],
          error: null,
        }),
      }),
      delete: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          error: table === "users" ? (usersDeleteError ?? null) : null,
        }),
      }),
      update: vi.fn().mockImplementation(() => {
        updateCalls.push({ table });
        return { in: vi.fn().mockResolvedValue({ error: null }) };
      }),
    })),
    auth: {
      admin: { deleteUser: deleteUserMock },
    },
    _deleteUserMock: deleteUserMock,
    _updateCalls: updateCalls,
  };
}

describe("POST /api/admin/bulk-delete-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });
  });

  it("returns 403 when caller is not an admin", async () => {
    mockRequireAdmin.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: "Forbidden" }),
    );

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 400 when emails is not an array", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(
      makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: "not-an-array" });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when emails array is empty", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(
      makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: [] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when an email has invalid format", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(
      makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({
      emails: ["valid@example.com", "not-an-email"],
    });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when admin tries to delete their own account", async () => {
    const adminEmail = "admin@example.com";
    mockRequireAdmin.mockResolvedValue(makeAdminUser(adminEmail));
    mockUseSupabaseAdmin.mockReturnValue(
      makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: [adminEmail] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("records failed result when user email is not found in database", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(
      makeSupabaseMock({
        lookupData: null,
        lookupError: { code: "PGRST116" },
      }) as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: ["ghost@example.com"] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    const result = await handler(mockEvent);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toMatchObject({
      email: "ghost@example.com",
      reason: "User not found",
    });
  });

  it("deletes user and returns success", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    const supabaseMock = makeSupabaseMock({
      lookupData: { id: "target-uuid" },
    });
    mockUseSupabaseAdmin.mockReturnValue(
      supabaseMock as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    const result = await handler(mockEvent);

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.deletedEmails).toContain("user@example.com");
    expect(supabaseMock._deleteUserMock).toHaveBeenCalledWith("target-uuid");
  });

  it("records partial failure when auth deletion fails", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    const supabaseMock = makeSupabaseMock({
      lookupData: { id: "target-uuid" },
      deleteUserError: { message: "User not found in auth" },
    });
    mockUseSupabaseAdmin.mockReturnValue(
      supabaseMock as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    const result = await handler(mockEvent);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].reason).toBe("User not found in auth");
  });

  it("reports failure, not success, when the users row survives the bulk delete", async () => {
    // Reproduces the exact bug found live on QA (delete-user.post.ts, the
    // single-user sibling of this endpoint): a NO ACTION FK
    // (guardian_claims.claimed_by / users.guardian_consent_by) silently blocks
    // the users-row delete. This endpoint used to count the user as deleted
    // based solely on the auth-record delete succeeding, never checking
    // whether the users row itself was actually gone.
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    const supabaseMock = makeSupabaseMock({
      lookupData: { id: "target-uuid" },
      survivorIds: ["target-uuid"],
    });
    mockUseSupabaseAdmin.mockReturnValue(
      supabaseMock as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    const result = await handler(mockEvent);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toMatchObject({ email: "user@example.com" });
    // The still-present user must not reach the auth-delete step at all.
    expect(supabaseMock._deleteUserMock).not.toHaveBeenCalled();
  });

  it("clears guardian_consent_by via UPDATE before the users delete", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    const supabaseMock = makeSupabaseMock({ lookupData: { id: "target-uuid" } });
    mockUseSupabaseAdmin.mockReturnValue(
      supabaseMock as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });

    const { default: handler } =
      await import("~/server/api/admin/bulk-delete-users.post");

    await handler(mockEvent);

    expect(supabaseMock._updateCalls).toContainEqual({ table: "users" });
  });
});
