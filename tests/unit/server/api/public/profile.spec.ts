import { describe, it, expect, vi, beforeEach } from "vitest";

const mockState = {
  profileRow: null as Record<string, unknown> | null,
  userRow: null as { full_name: string } | null,
  playerPrefsData: null as Record<string, unknown> | null,
  schoolsRows: [] as Array<{ id: string; name: string }>,
  videoLinksRows: [] as Array<{
    platform: string;
    url: string;
    title: string | null;
  }>,
  metricsRows: [] as Array<Record<string, unknown>>,
};

const videoLinksEqSpy = vi.fn();

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
      if (table === "video_links") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              videoLinksEqSpy(column, value);
              return {
                order: () =>
                  Promise.resolve({
                    data: mockState.videoLinksRows,
                    error: null,
                  }),
              };
            },
          }),
        };
      }
      if (table === "performance_metrics") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({ data: mockState.metricsRows, error: null }),
          }),
        };
      }
      if (table === "cache_snapshots") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
          delete: () => ({
            in: () => Promise.resolve({ error: null }),
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
  createLogger: () => ({
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
    setHeader: vi.fn(),
    getRequestHeader: vi.fn(() => undefined),
    setResponseStatus: vi.fn(),
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
  beforeEach(async () => {
    mockState.profileRow = null;
    mockState.userRow = null;
    mockState.playerPrefsData = null;
    mockState.schoolsRows = [];
    mockState.videoLinksRows = [];
    mockState.metricsRows = [];
    videoLinksEqSpy.mockClear();
    const h3 = await import("h3");
    vi.mocked(h3.getRequestHeader).mockReturnValue(undefined);
    vi.mocked(h3.setHeader).mockClear();
    vi.mocked(h3.setResponseStatus).mockClear();
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
      section_config: [{ key: "academics", visible: true }],
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
      section_config: [{ key: "film", visible: true }],
      bio: null,
    };
    mockState.userRow = { full_name: "Jane Doe" };
    mockState.videoLinksRows = [
      {
        platform: "hudl",
        url: "https://hudl.com/video/123",
        title: "Highlights",
      },
    ];

    const result = await handler({} as any);

    expect(result.film).toHaveLength(1);
    expect(result.film![0].platform).toBe("hudl");
    expect(result.academics).toBeNull();
  });

  it("scopes the video_links query to this profile's athlete (user_id), not the whole family", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: true,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: false,
      show_athletic: false,
      show_film: true,
      show_schools: false,
      section_config: [{ key: "film", visible: true }],
      bio: null,
    };
    mockState.userRow = { full_name: "Jane Doe" };
    mockState.videoLinksRows = [];

    await handler({} as any);

    expect(videoLinksEqSpy).toHaveBeenCalledWith("user_id", "u1");
  });

  it("returns null film when show_film is false, without querying video_links", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: true,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: false,
      show_athletic: false,
      show_film: false,
      show_schools: false,
      bio: null,
    };
    mockState.userRow = { full_name: "Jane Doe" };

    const result = await handler({} as any);

    expect(result.film).toBeNull();
    expect(videoLinksEqSpy).not.toHaveBeenCalled();
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

  it("sets private no-cache + ETag and returns 304 on If-None-Match", async () => {
    mockState.profileRow = {
      id: "p1",
      is_published: true,
      user_id: "u1",
      family_unit_id: "f1",
      show_academics: false,
      show_athletic: false,
      show_film: false,
      show_schools: false,
      bio: "etag-me",
    };
    mockState.userRow = { full_name: "Jane Doe" };

    const h3 = await import("h3");
    vi.mocked(h3.getRequestHeader).mockReturnValue(undefined);
    vi.mocked(h3.setHeader).mockClear();
    vi.mocked(h3.setResponseStatus).mockClear();

    await handler({} as any);

    const etagCall = vi
      .mocked(h3.setHeader)
      .mock.calls.find((call) => call[1] === "ETag");
    expect(etagCall?.[2]).toEqual(expect.stringMatching(/^"[0-9a-f]+"$/));
    expect(h3.setHeader).toHaveBeenCalledWith(
      expect.anything(),
      "Cache-Control",
      "private, no-cache",
    );

    vi.mocked(h3.getRequestHeader).mockReturnValue(etagCall![2] as string);
    const second = await handler({} as any);
    expect(second).toBeNull();
    expect(h3.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 304);
  });
});
