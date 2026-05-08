import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  profileRow: null as Record<string, unknown> | null,
  userRow: null as { full_name: string } | null,
  playerPrefsData: null as Record<string, unknown> | null,
  schoolsRows: [] as Array<{ id: string; name: string }>,
};

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "player_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.profileRow, error: null }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: mockState.userRow, error: null }),
            }),
          }),
        };
      }
      if (table === "user_preferences") {
        const chain = {
          eq: () => chain,
          maybeSingle: () =>
            Promise.resolve({
              data: mockState.playerPrefsData
                ? { data: mockState.playerPrefsData }
                : null,
              error: null,
            }),
        };
        return { select: () => chain };
      }
      if (table === "schools") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({ data: mockState.schoolsRows, error: null }),
          }),
        };
      }
      return {};
    },
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => "abc123"),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & {
        statusCode: number;
      };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

const { default: handler } =
  await import("~/server/api/public/profile/[slug].get");

describe("GET /api/public/profile/[slug]", () => {
  beforeEach(() => {
    mockState.profileRow = null;
    mockState.userRow = null;
    mockState.playerPrefsData = null;
    mockState.schoolsRows = [];
  });

  it("throws 404 when slug not found", async () => {
    mockState.profileRow = null;
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 410 when profile exists but is unpublished", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: false,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: true,
      show_athletic: true,
      show_film: true,
      show_schools: true,
      bio: null,
    };
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 410 });
  });

  it("returns profile data for a published profile", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: true,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: true,
      show_athletic: false,
      show_film: false,
      show_schools: false,
      bio: "Future D1 pitcher",
    };
    mockState.userRow = { full_name: "John Smith" };
    mockState.playerPrefsData = { gpa: 3.9, graduation_year: 2026 };

    const result = await handler({} as any);

    expect(result.playerName).toBe("John Smith");
    expect(result.bio).toBe("Future D1 pitcher");
    expect(result.academics).toMatchObject({ gpa: 3.9, graduation_year: 2026 });
    expect(result.athletic).toBeNull(); // show_athletic is false
    expect(result.film).toBeNull();
    expect(result.schools).toBeNull();
  });

  it("returns film links when show_film is true", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: true,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: false,
      show_athletic: false,
      show_film: true,
      show_schools: false,
      bio: null,
    };
    mockState.userRow = { full_name: "Jane Doe" };
    mockState.playerPrefsData = {
      video_links: [
        {
          platform: "hudl",
          url: "https://hudl.com/video/123",
          title: "Highlights",
        },
      ],
    };

    const result = await handler({} as any);

    expect(result.film).toHaveLength(1);
    expect(result.film![0].platform).toBe("hudl");
    expect(result.academics).toBeNull();
  });

  it("returns schools array when show_schools is true", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: true,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: false,
      show_athletic: false,
      show_film: false,
      show_schools: true,
      bio: null,
    };
    mockState.userRow = { full_name: "Jane Doe" };
    mockState.schoolsRows = [
      { id: "s1", name: "State University" },
      { id: "s2", name: "Tech College" },
    ];

    const result = await handler({} as any);

    expect(result.schools).toHaveLength(2);
    expect(result.schools![0].name).toBe("State University");
  });
});
