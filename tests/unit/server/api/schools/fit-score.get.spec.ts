import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable state — read at call time by mock factories
const mockState = {
  school: null as {
    id: string;
    user_id: string;
    name?: string;
    family_unit_id?: string | null;
  } | null,
  accountLink: null as { id: string } | null,
  familyMembership: null as { id: string } | null,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({
    id: "caller-id",
    email: "caller@example.com",
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

function makeChain(getResult: () => { data: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(getResult())),
  };
  return chain;
}

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "schools") {
        return makeChain(() => ({ data: mockState.school }));
      }
      if (table === "account_links") {
        return makeChain(() => ({ data: mockState.accountLink }));
      }
      if (table === "family_members") {
        return makeChain(() => ({ data: mockState.familyMembership }));
      }
      return makeChain(() => ({ data: null }));
    }),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "11111111-1111-1111-1111-111111111111"),
    createError: (config: { statusCode: number; statusMessage: string }) => {
      const err = new Error(config.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = config.statusCode;
      return err;
    },
  };
});

const mockEvent = {
  context: { params: { id: "11111111-1111-1111-1111-111111111111" } },
} as any;

describe("GET /api/schools/[id]/fit-score authz", () => {
  beforeEach(() => {
    mockState.school = null;
    mockState.accountLink = null;
    mockState.familyMembership = null;
  });

  const getHandler = async () => {
    const { default: handler } = await import(
      "~/server/api/schools/[id]/fit-score.get"
    );
    return handler;
  };

  it("allows the direct owner", async () => {
    mockState.school = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "caller-id",
      name: "Owner School",
      family_unit_id: null,
    };

    const handler = await getHandler();
    const result = await handler(mockEvent);

    expect(result.success).toBe(true);
    expect(result.data.schoolName).toBe("Owner School");
  });

  it("allows a parent linked via account_links", async () => {
    mockState.school = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "athlete-id",
      name: "Linked School",
      family_unit_id: null,
    };
    mockState.accountLink = { id: "link-1" };

    const handler = await getHandler();
    const result = await handler(mockEvent);

    expect(result.success).toBe(true);
    expect(result.data.schoolName).toBe("Linked School");
  });

  it("allows a family-model parent with no account_links row (family membership only)", async () => {
    mockState.school = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "athlete-id",
      name: "Family School",
      family_unit_id: "family-unit-1",
    };
    mockState.accountLink = null;
    mockState.familyMembership = { id: "membership-1" };

    const handler = await getHandler();
    const result = await handler(mockEvent);

    expect(result.success).toBe(true);
    expect(result.data.schoolName).toBe("Family School");
  });

  it("rejects a user in a different family with 404", async () => {
    mockState.school = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "athlete-id",
      name: "Other Family School",
      family_unit_id: "family-unit-2",
    };
    mockState.accountLink = null;
    mockState.familyMembership = null;

    const handler = await getHandler();

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 404,
      message: "School not found",
    });
  });

  it("rejects an unrelated caller with 404", async () => {
    mockState.school = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "athlete-id",
      name: "Unrelated School",
      family_unit_id: null,
    };
    mockState.accountLink = null;
    mockState.familyMembership = null;

    const handler = await getHandler();

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 404,
      message: "School not found",
    });
  });
});
