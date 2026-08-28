import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resetSingleflight,
  type KvCache,
} from "~/server/utils/readThroughCache";
import {
  getPublicProfile,
  invalidatePublicProfileForUser,
  loadPublicProfileOrigin,
  publicProfileCacheKey,
  type PublicProfileReadDeps,
} from "~/server/utils/publicProfileRead";
import type { PublicProfileData } from "~/types/models";

vi.mock("~/server/utils/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockState = {
  profileRow: null as Record<string, unknown> | null,
  userRow: null as {
    full_name: string;
    profile_photo_url: string | null;
  } | null,
  playerPrefsData: null as Record<string, unknown> | null,
  schoolsRows: [] as Array<{ id: string; name: string }>,
  videoLinksRows: [] as Array<{
    platform: string;
    url: string;
    title: string | null;
  }>,
  metricsRows: [] as Array<Record<string, unknown>>,
  snapshot: new Map<
    string,
    { payload: PublicProfileData; etag: string; expires_at: string }
  >(),
};

function createMockSupabase() {
  return {
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
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: mockState.videoLinksRows,
                  error: null,
                }),
            }),
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
      return {};
    },
  };
}

function memoryRedis(): KvCache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(...keys) {
      for (const key of keys) store.delete(key);
    },
  };
}

function makeDeps(redis = memoryRedis()): PublicProfileReadDeps & {
  redis: ReturnType<typeof memoryRedis>;
} {
  const r = redis;
  return {
    supabase: createMockSupabase() as never,
    redis: r,
    snapshot: {
      async get(key) {
        return mockState.snapshot.get(key) ?? null;
      },
      async put(key, _ns, payload, etag, ttlSeconds) {
        mockState.snapshot.set(key, {
          payload,
          etag,
          expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        });
      },
      async del(keys) {
        for (const key of keys) mockState.snapshot.delete(key);
      },
    },
  };
}

const publishedProfile = {
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
  header_color: "slate",
  banner_url: null,
  commitment_status: "uncommitted",
  looking_for: null,
  values_tags: [],
  awards: [],
  updated_at: "2026-08-28T00:00:00.000Z",
};

describe("getPublicProfile", () => {
  beforeEach(() => {
    resetSingleflight();
    mockState.profileRow = null;
    mockState.userRow = null;
    mockState.playerPrefsData = null;
    mockState.schoolsRows = [];
    mockState.videoLinksRows = [];
    mockState.metricsRows = [];
    mockState.snapshot = new Map();
  });

  it("returns not_found when slug is missing", async () => {
    const result = await getPublicProfile("abc123", makeDeps());
    expect(result).toEqual({ kind: "not_found" });
  });

  it("returns gone for unpublished and deletes any cached payload", async () => {
    mockState.profileRow = { ...publishedProfile, is_published: false };
    const deps = makeDeps();
    const key = publicProfileCacheKey("u1");
    await deps.redis.set(
      key,
      { data: { playerName: "stale" }, etag: '"x"' },
      {
        ex: 60,
      },
    );
    mockState.snapshot.set(key, {
      payload: { playerName: "stale" } as PublicProfileData,
      etag: '"x"',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    const result = await getPublicProfile("abc123", deps);
    expect(result.kind).toBe("gone");
    expect(await deps.redis.get(key)).toBeNull();
    expect(mockState.snapshot.has(key)).toBe(false);
  });

  it("assembles from origin on miss and fills both cache layers", async () => {
    mockState.profileRow = publishedProfile;
    mockState.userRow = { full_name: "John Smith", profile_photo_url: null };
    mockState.playerPrefsData = { gpa: 3.9, graduation_year: 2026 };
    const deps = makeDeps();

    const result = await getPublicProfile("abc123", deps);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.source).toBe("origin");
    expect(result.data.playerName).toBe("John Smith");
    expect(result.data.bio).toBe("Future D1 pitcher");
    expect(result.etag.startsWith('"')).toBe(true);

    const key = publicProfileCacheKey("u1");
    expect(await deps.redis.get(key)).toMatchObject({
      data: { playerName: "John Smith" },
    });
    expect(mockState.snapshot.get(key)?.payload.playerName).toBe("John Smith");
  });

  it("returns L1 hit without touching origin film/metrics", async () => {
    mockState.profileRow = publishedProfile;
    const cached: PublicProfileData = {
      playerName: "Cached",
      photoUrl: null,
      headerColor: "slate",
      bio: "from-l1",
      academics: null,
      athletic: null,
      film: null,
      schools: null,
      social: null,
      bannerUrl: null,
      jerseyNumber: null,
      commitmentStatus: "uncommitted",
      committedSchoolName: null,
      lookingFor: null,
      valuesTags: [],
      awards: [],
      metrics: null,
      teamHistory: null,
      updatedAt: null,
      sections: [],
    };
    const deps = makeDeps();
    await deps.redis.set(
      publicProfileCacheKey("u1"),
      { data: cached, etag: '"hit"' },
      { ex: 60 },
    );

    const result = await getPublicProfile("abc123", deps);
    expect(result).toMatchObject({
      kind: "ok",
      source: "l1",
      etag: '"hit"',
      data: { bio: "from-l1" },
    });
  });

  it("promotes L2 hit into L1", async () => {
    mockState.profileRow = publishedProfile;
    const cached = {
      playerName: "From L2",
      photoUrl: null,
      headerColor: "slate",
      bio: "l2",
      academics: null,
      athletic: null,
      film: null,
      schools: null,
      social: null,
      bannerUrl: null,
      jerseyNumber: null,
      commitmentStatus: "uncommitted" as const,
      committedSchoolName: null,
      lookingFor: null,
      valuesTags: [],
      awards: [],
      metrics: null,
      teamHistory: null,
      updatedAt: null,
      sections: [],
    };
    const key = publicProfileCacheKey("u1");
    mockState.snapshot.set(key, {
      payload: cached,
      etag: '"l2"',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const deps = makeDeps();

    const result = await getPublicProfile("abc123", deps);
    expect(result).toMatchObject({ kind: "ok", source: "l2" });
    expect(await deps.redis.get(key)).toMatchObject({
      data: { bio: "l2" },
      etag: '"l2"',
    });
  });

  it("invalidatePublicProfileForUser removes L1 and L2", async () => {
    const deps = makeDeps();
    const key = publicProfileCacheKey("u1");
    await deps.redis.set(key, { data: { n: 1 }, etag: '"x"' }, { ex: 60 });
    mockState.snapshot.set(key, {
      payload: { playerName: "x" } as PublicProfileData,
      etag: '"x"',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    await invalidatePublicProfileForUser("u1", deps);
    expect(await deps.redis.get(key)).toBeNull();
    expect(mockState.snapshot.has(key)).toBe(false);
  });
});

describe("loadPublicProfileOrigin", () => {
  beforeEach(() => {
    mockState.userRow = { full_name: "Jane", profile_photo_url: null };
    mockState.playerPrefsData = { gpa: 4.0 };
    mockState.schoolsRows = [];
    mockState.videoLinksRows = [];
    mockState.metricsRows = [];
  });

  it("does not query video_links when film is hidden", async () => {
    const supabase = createMockSupabase();
    const fromSpy = vi.spyOn(supabase, "from");
    await loadPublicProfileOrigin(supabase as never, {
      ...publishedProfile,
      show_film: false,
      section_config: [{ key: "film", visible: false }],
    });
    const tables = fromSpy.mock.calls.map((c) => c[0]);
    expect(tables).not.toContain("video_links");
  });
});
