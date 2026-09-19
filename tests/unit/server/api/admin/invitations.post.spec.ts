/**
 * POST /api/admin/invitations — mints per-invitation admin registration
 * tokens (issue #854). requireAdmin-gated; inserts a scoped
 * admin_invitations row; audits the mint.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createError } from "h3";

const { requireAdmin, logAdminAction } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async (e: any) => {
    e.context.adminUserId = "admin-1";
    return { id: "admin-1", email: "admin@example.com" };
  }),
  logAdminAction: vi.fn(async () => {}),
}));
vi.mock("~/server/utils/auth", () => ({ requireAdmin }));
vi.mock("~/server/utils/adminAudit", () => ({ logAdminAction }));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return { ...actual, readBody: async (e: any) => e._body };
});

import handler from "~/server/api/admin/invitations.post";

const mkEvent = (body: any) => ({ context: {}, _body: body }) as any;

beforeEach(() => {
  requireAdmin.mockClear();
  requireAdmin.mockImplementation(async (e: any) => {
    e.context.adminUserId = "admin-1";
    return { id: "admin-1", email: "admin@example.com" };
  });
  logAdminAction.mockClear();
  mockInsert.mockClear();
  mockInsert.mockImplementation(() => Promise.resolve({ error: null }));
  mockFrom.mockClear();
});

describe("POST /api/admin/invitations", () => {
  it("403s when the caller is not an admin", async () => {
    requireAdmin.mockImplementation(async () => {
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    });

    await expect(
      handler(mkEvent({ email: "newadmin@example.com" })),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email", async () => {
    await expect(
      handler(mkEvent({ email: "not-an-email" })),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("mints a token scoped to the inviting admin and an ~24h expiry", async () => {
    const result = await handler(mkEvent({ email: "newadmin@example.com" }));

    expect(result).toMatchObject({ success: true });
    expect(result.token).toEqual(expect.any(String));
    expect(mockFrom).toHaveBeenCalledWith("admin_invitations");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        token: result.token,
        invited_email: "newadmin@example.com",
        invited_by: "admin-1",
      }),
    );
    const insertedExpiry = new Date(
      mockInsert.mock.calls[0][0].expires_at,
    ).getTime();
    const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
    expect(Math.abs(insertedExpiry - expectedExpiry)).toBeLessThan(5000);
  });

  it("audits the mint via logAdminAction", async () => {
    await handler(mkEvent({ email: "newadmin@example.com" }));

    expect(logAdminAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "admin.invite",
        meta: { invitedEmail: "newadmin@example.com" },
      }),
    );
  });

  it("returns 500 and never audits when the insert fails", async () => {
    mockInsert.mockImplementation(() =>
      Promise.resolve({ error: { message: "boom" } }),
    );

    await expect(
      handler(mkEvent({ email: "newadmin@example.com" })),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(logAdminAction).not.toHaveBeenCalled();
  });
});
