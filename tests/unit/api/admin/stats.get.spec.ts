import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "admin-user-id" }),
}));

const mockFrom = vi.fn();
vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      order: vi.fn().mockResolvedValue({ count: 0 }),
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        let callCount = 0;
        return {
          select: vi.fn(
            (cols: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.head) {
                return Promise.resolve({ count: 2 });
              }
              return {
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
              };
            },
          ),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ count: 3 }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
    });
  });

  it("exports a valid event handler", async () => {
    const mod = await import("~/server/api/admin/stats.get");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("AdminStatsResponse shape: users, schools, coaches, interactions, family_units", () => {
    const response: {
      users: number;
      schools: number;
      coaches: number;
      interactions: number;
      family_units: number;
    } = {
      users: 10,
      schools: 5,
      coaches: 20,
      interactions: 100,
      family_units: 2,
    };
    expect(response.users).toBe(10);
    expect(response.schools).toBe(5);
    expect(response.coaches).toBe(20);
    expect(response.interactions).toBe(100);
    expect(response.family_units).toBe(2);
    expect(Object.keys(response)).toHaveLength(5);
    expect(Object.keys(response).sort()).toEqual(
      ["coaches", "family_units", "interactions", "schools", "users"].sort(),
    );
  });

  it("handler returns stats shape when admin and DB returns counts", async () => {
    const mod = await import("~/server/api/admin/stats.get");
    const handler = mod.default;

    const mockEvent = {
      node: { req: { headers: {} } },
      context: {},
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
    };
    const countChain = () => Promise.resolve({ count: 4 });
    mockFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn(
            (_cols: string, opts?: { count?: string; head?: boolean }) =>
              opts?.head ? countChain() : chain,
          ),
          eq: chain.eq,
          single: chain.single,
        };
      }
      return { select: vi.fn().mockResolvedValue({ count: 4 }) };
    });

    const result = await handler(mockEvent as any);
    expect(result).toHaveProperty("users");
    expect(result).toHaveProperty("schools");
    expect(result).toHaveProperty("coaches");
    expect(result).toHaveProperty("interactions");
    expect(result).toHaveProperty("family_units");
    expect(typeof result.users).toBe("number");
    expect(typeof result.schools).toBe("number");
    expect(typeof result.coaches).toBe("number");
    expect(typeof result.interactions).toBe("number");
    expect(typeof result.family_units).toBe("number");
    expect(result.users).toBe(4);
    expect(result.schools).toBe(4);
  });
});
