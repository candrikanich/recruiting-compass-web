import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
  requireAdmin: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
}));

const mockFrom = vi.fn();
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

describe("GET /api/admin/pending-invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
        };
      }
      if (table === "account_links") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "inv-1",
                invited_email: "guest@example.com",
                status: "pending",
                initiator_role: "parent",
                created_at: "2025-01-01T00:00:00Z",
              },
            ],
          }),
        };
      }
      return {};
    });
  });

  it("exports a valid event handler", async () => {
    const mod = await import("~/server/api/admin/pending-invitations.get");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("PendingInvitationsResponse shape: invitations array, optional error", () => {
    const response: {
      invitations: {
        id: string;
        invited_email: string;
        status: string;
        initiator_role: string;
        created_at: string | null;
      }[];
      error?: string;
    } = {
      invitations: [],
    };
    expect(response).toHaveProperty("invitations");
    expect(Array.isArray(response.invitations)).toBe(true);

    const withError = { ...response, error: "Table not available" };
    expect(withError.error).toBe("Table not available");
  });

  it("handler returns invitations array when account_links returns data", async () => {
    const mod = await import("~/server/api/admin/pending-invitations.get");
    const handler = mod.default;
    const mockEvent = { node: { req: { headers: {} } }, context: {} };

    const result = await handler(mockEvent as any);
    expect(result).toHaveProperty("invitations");
    expect(Array.isArray(result.invitations)).toBe(true);
    expect(result.invitations.length).toBe(1);
    expect(result.invitations[0]).toHaveProperty("id");
    expect(result.invitations[0]).toHaveProperty("invited_email");
    expect(result.invitations[0]).toHaveProperty("status");
    expect(result.invitations[0]).toHaveProperty("initiator_role");
    expect(result.invitations[0].invited_email).toBe("guest@example.com");
  });

  it("handler returns empty invitations and error when account_links query errors", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
        };
      }
      if (table === "account_links") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "relation does not exist" },
          }),
        };
      }
      return {};
    });

    const mod = await import("~/server/api/admin/pending-invitations.get");
    const handler = mod.default;
    const mockEvent = { node: { req: { headers: {} } }, context: {} };

    const result = await handler(mockEvent as any);
    expect(result).toHaveProperty("invitations");
    expect(result.invitations).toEqual([]);
    expect(result).toHaveProperty("error");
    expect(result.error).toBe("Invitations table not available");
  });
});
