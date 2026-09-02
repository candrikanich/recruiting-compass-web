import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3Event } from "h3";
import { createDeadlineSchema } from "~/utils/validation/schemas";

describe("Deadline API schema", () => {
  it("accepts valid deadline", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Application Deadline",
      deadline_date: "2026-11-01",
      category: "application",
    });
    expect(result.success).toBe(true);
  });
  it("accepts deadline with optional school_id", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Visit deadline",
      deadline_date: "2026-09-15",
      category: "visit",
      school_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid date format", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Test",
      deadline_date: "November 1",
      category: "application",
    });
    expect(result.success).toBe(false);
  });
  it("rejects unknown category", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Test",
      deadline_date: "2026-11-01",
      category: "birthday",
    });
    expect(result.success).toBe(false);
  });
  it("rejects empty label", () => {
    const result = createDeadlineSchema.safeParse({
      label: "",
      deadline_date: "2026-11-01",
      category: "custom",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Endpoint tests — these hit the service-role Supabase client (bypasses RLS),
// so every query MUST resolve family_unit_id and filter/stamp by it.
// ---------------------------------------------------------------------------

const mockSupabase = { from: vi.fn() };
vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: () => mockSupabase,
}));

const mockRequireAuth = vi.fn(async () => ({ id: "user-1", email: "p@t" }));
vi.mock("~/server/utils/auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const mockReadBody = vi.fn(async () => ({}) as unknown);

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: (event: H3Event) => unknown) => fn,
    readBody: (...args: unknown[]) => mockReadBody(...args),
  };
});

(
  globalThis as unknown as {
    createError: (config: {
      statusCode: number;
      statusMessage?: string;
      message?: string;
    }) => Error & { statusCode: number };
  }
).createError = (config) => {
  const err = new Error(config.statusMessage || config.message) as Error & {
    statusCode: number;
  };
  err.statusCode = config.statusCode;
  return err;
};

function fakeEvent(params: Record<string, string> = {}): H3Event {
  return {
    node: { req: { headers: {} }, res: {} },
    context: { params },
  } as unknown as H3Event;
}

const FAMILY_ID = "fam-1";

function mockFamilyMembership(familyUnitId: string | null) {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({
            data: familyUnitId ? { family_unit_id: familyUnitId } : null,
            error: null,
          }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: "user-1", email: "p@t" });
  mockReadBody.mockResolvedValue({});
});

describe("GET /api/deadlines (family-scoped)", () => {
  it("queries by family_unit_id instead of user_id", async () => {
    const eqSpy = vi.fn(() => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }));
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "family_members") return mockFamilyMembership(FAMILY_ID);
      if (table === "user_deadlines") {
        return { select: () => ({ eq: eqSpy }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/deadlines/index.get"))
      .default;
    await handler(fakeEvent());

    expect(eqSpy).toHaveBeenCalledWith("family_unit_id", FAMILY_ID);
  });

  it("returns 500 when user has no family membership", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "family_members") return mockFamilyMembership(null);
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/deadlines/index.get"))
      .default;
    await expect(handler(fakeEvent())).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe("POST /api/deadlines (family-scoped)", () => {
  it("stamps family_unit_id on insert", async () => {
    mockReadBody.mockResolvedValue({
      label: "Application Deadline",
      deadline_date: "2026-11-01",
      category: "application",
    });

    const insertSpy = vi.fn(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({ data: { id: "d1" }, error: null }),
      }),
    }));
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "family_members") return mockFamilyMembership(FAMILY_ID);
      if (table === "user_deadlines") return { insert: insertSpy };
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/deadlines/index.post"))
      .default;
    await handler(fakeEvent());

    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({ family_unit_id: FAMILY_ID }),
    ]);
  });
});

describe("DELETE /api/deadlines/:id (family-scoped)", () => {
  const VALID_ID = "11111111-1111-1111-1111-111111111111";

  it("verifies ownership via family_unit_id", async () => {
    const eqSpy = vi.fn(() => ({
      eq: eqFamilySpy,
    }));
    const eqFamilySpy = vi.fn(() => ({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    }));
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "family_members") return mockFamilyMembership(FAMILY_ID);
      if (table === "user_deadlines") {
        return { select: () => ({ eq: eqSpy }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const handler = (await import("~/server/api/deadlines/[id].delete"))
      .default;
    await expect(handler(fakeEvent({ id: VALID_ID }))).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(eqFamilySpy).toHaveBeenCalledWith("family_unit_id", FAMILY_ID);
  });
});
