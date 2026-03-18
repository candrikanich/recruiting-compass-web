import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  userId: "user-abc",
  membership: { family_unit_id: "family-123" } as { family_unit_id: string } | null,
  profileRow: null as Record<string, unknown> | null,
  updateError: null as { code?: string; message?: string } | null,
  requestBody: {} as Record<string, unknown>,
};

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(async () => ({ id: mockState.userId })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === "family_members") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: mockState.membership, error: null }),
            }),
          }),
        };
      }
      if (table === "player_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.profileRow, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "new-p1",
                    user_id: mockState.userId,
                    family_unit_id: "family-123",
                    hash_slug: "abc123",
                    vanity_slug: null,
                    is_published: false,
                    bio: null,
                    show_academics: true,
                    show_athletic: true,
                    show_film: true,
                    show_schools: true,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: mockState.updateError }),
          }),
        };
      }
      return {};
    },
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    readBody: vi.fn(async () => mockState.requestBody),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & { statusCode: number };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

const { default: getHandler } = await import("~/server/api/player/profile.get");
const { default: putHandler } = await import("~/server/api/player/profile.put");

describe("GET /api/player/profile", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.membership = { family_unit_id: "family-123" };
    mockState.profileRow = null;
  });

  it("returns 403 when user is not a family member", async () => {
    mockState.membership = null;
    await expect(getHandler({} as any)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("creates and returns a new profile if none exists", async () => {
    mockState.profileRow = null;
    const result = await getHandler({} as any);
    expect(result.hash_slug).toBeDefined();
    expect(result.is_published).toBe(false);
  });

  it("returns existing profile when one exists", async () => {
    mockState.profileRow = {
      id: "p1",
      user_id: "user-abc",
      family_unit_id: "family-123",
      hash_slug: "xyz789",
      vanity_slug: null,
      is_published: true,
      bio: "Hello",
      show_academics: true,
      show_athletic: false,
      show_film: true,
      show_schools: true,
    };
    const result = await getHandler({} as any);
    expect(result.hash_slug).toBe("xyz789");
    expect(result.is_published).toBe(true);
  });
});

describe("PUT /api/player/profile", () => {
  beforeEach(() => {
    mockState.userId = "user-abc";
    mockState.membership = { family_unit_id: "family-123" };
    mockState.profileRow = { id: "p1", user_id: "user-abc" };
    mockState.updateError = null;
    mockState.requestBody = { bio: "Hello world", is_published: true };
  });

  it("returns 403 when user is not a family member", async () => {
    mockState.membership = null;
    await expect(putHandler({} as any)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects reserved vanity slugs", async () => {
    mockState.requestBody = { vanity_slug: "api" };
    await expect(putHandler({} as any)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("rejects invalid vanity slug format (uppercase)", async () => {
    mockState.requestBody = { vanity_slug: "UPPERCASE" };
    await expect(putHandler({} as any)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("rejects vanity slugs with invalid characters", async () => {
    mockState.requestBody = { vanity_slug: "my slug!" };
    await expect(putHandler({} as any)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("updates profile and returns success", async () => {
    mockState.requestBody = { bio: "Future D1 pitcher", is_published: true };
    const result = await putHandler({} as any);
    expect(result.success).toBe(true);
  });

  it("returns 409 when vanity slug is already taken", async () => {
    mockState.requestBody = { vanity_slug: "takenslug" };
    mockState.updateError = { code: "23505", message: "unique violation" };
    await expect(putHandler({} as any)).rejects.toMatchObject({ statusCode: 409 });
  });
});
