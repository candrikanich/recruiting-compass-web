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
  createLogger: () => ({
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
}: {
  lookupData?: { id: string } | null;
  lookupError?: object | null;
  deleteUserError?: object | null;
} = {}) {
  const deleteUserMock = vi.fn().mockResolvedValue({
    error: deleteUserError ?? null,
  });

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: lookupData ?? { id: "target-uuid" },
        error: lookupError ?? null,
      }),
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: {
      admin: { deleteUser: deleteUserMock },
    },
    _deleteUserMock: deleteUserMock,
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

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 400 when emails is not an array", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>);
    mockReadBody.mockResolvedValue({ emails: "not-an-array" });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when emails array is empty", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>);
    mockReadBody.mockResolvedValue({ emails: [] });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when an email has invalid format", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>);
    mockReadBody.mockResolvedValue({ emails: ["valid@example.com", "not-an-email"] });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when admin tries to delete their own account", async () => {
    const adminEmail = "admin@example.com";
    mockRequireAdmin.mockResolvedValue(makeAdminUser(adminEmail));
    mockUseSupabaseAdmin.mockReturnValue(makeSupabaseMock() as ReturnType<typeof useSupabaseAdmin>);
    mockReadBody.mockResolvedValue({ emails: [adminEmail] });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("records failed result when user email is not found in database", async () => {
    mockRequireAdmin.mockResolvedValue(makeAdminUser());
    mockUseSupabaseAdmin.mockReturnValue(
      makeSupabaseMock({ lookupData: null, lookupError: { code: "PGRST116" } }) as ReturnType<typeof useSupabaseAdmin>,
    );
    mockReadBody.mockResolvedValue({ emails: ["ghost@example.com"] });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

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
    const supabaseMock = makeSupabaseMock({ lookupData: { id: "target-uuid" } });
    mockUseSupabaseAdmin.mockReturnValue(supabaseMock as ReturnType<typeof useSupabaseAdmin>);
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

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
    mockUseSupabaseAdmin.mockReturnValue(supabaseMock as ReturnType<typeof useSupabaseAdmin>);
    mockReadBody.mockResolvedValue({ emails: ["user@example.com"] });

    const { default: handler } = await import(
      "~/server/api/admin/bulk-delete-users.post"
    );

    const result = await handler(mockEvent);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0].reason).toBe("User not found in auth");
  });
});
