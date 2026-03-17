import { describe, it, expect, vi, beforeEach } from "vitest";

// Controls which slug the handler sees
const mockSlugState = { slug: "abc123" };

// Per-test controls for sequential slug resolution
const mockProfileState = {
  hashSlugRow: null as { id: string } | null,
  vanitySlugRow: null as { id: string } | null,
  hashSlugError: null as object | null,
  vanitySlugError: null as object | null,
  // Tracking link ref token lookup controls
  linkRow: null as { id: string } | null,
  linkError: null as object | null,
  // profile_id supplied in the ref token lookup
  refTokenProfileId: null as string | null,
};

// Tracks calls so we can assert which slug column was queried
const eqCalls: Array<[string, string]> = [];

vi.mock("~/server/utils/supabase", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "player_profiles") {
        return {
          select: () => ({
            eq: (col: string, val: string) => {
              eqCalls.push([col, val]);
              const row =
                col === "hash_slug"
                  ? mockProfileState.hashSlugRow
                  : mockProfileState.vanitySlugRow;
              const error =
                col === "hash_slug"
                  ? mockProfileState.hashSlugError
                  : mockProfileState.vanitySlugError;
              return {
                maybeSingle: () => Promise.resolve({ data: row, error }),
              };
            },
          }),
        };
      }
      if (table === "profile_tracking_links") {
        return {
          select: () => ({
            eq: (col: string, _val: string) => ({
              eq: (col2: string, val2: string) => {
                // Second eq is profile_id — capture it so tests can assert scope
                if (col2 === "profile_id") {
                  mockProfileState.refTokenProfileId = val2;
                }
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: mockProfileState.linkRow,
                      error: mockProfileState.linkError,
                    }),
                };
              },
            }),
          }),
        };
      }
      if (table === "profile_views") {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {};
    },
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    defineEventHandler: (fn: Function) => fn,
    getRouterParam: vi.fn(() => mockSlugState.slug),
    getQuery: vi.fn(() => ({ ref: undefined })),
    getRequestHeader: vi.fn(() => "Mozilla/5.0"),
    createError: (cfg: { statusCode: number; statusMessage?: string }) => {
      const err = new Error(cfg.statusMessage) as Error & { statusCode: number };
      err.statusCode = cfg.statusCode;
      return err;
    },
  };
});

const { default: viewHandler } = await import(
  "~/server/api/public/profile/[slug]/view.post"
);

describe("Sequential slug resolution (view.post)", () => {
  beforeEach(() => {
    mockSlugState.slug = "abc123";
    mockProfileState.hashSlugRow = null;
    mockProfileState.vanitySlugRow = null;
    mockProfileState.hashSlugError = null;
    mockProfileState.vanitySlugError = null;
    mockProfileState.linkRow = null;
    mockProfileState.linkError = null;
    mockProfileState.refTokenProfileId = null;
    eqCalls.length = 0;
  });

  it("resolves via hash_slug when it matches — does not fall through to vanity_slug", async () => {
    mockProfileState.hashSlugRow = { id: "p1" };

    const result = await viewHandler({} as any);

    expect(result.ok).toBe(true);
    const hashCall = eqCalls.find(([col]) => col === "hash_slug");
    const vanityCall = eqCalls.find(([col]) => col === "vanity_slug");
    expect(hashCall).toBeDefined();
    // vanity_slug query should NOT have been issued since hash_slug matched
    expect(vanityCall).toBeUndefined();
  });

  it("falls back to vanity_slug when hash_slug returns no row", async () => {
    mockProfileState.hashSlugRow = null;
    mockProfileState.vanitySlugRow = { id: "p2" };

    const result = await viewHandler({} as any);

    expect(result.ok).toBe(true);
    const hashCall = eqCalls.find(([col]) => col === "hash_slug");
    const vanityCall = eqCalls.find(([col]) => col === "vanity_slug");
    expect(hashCall).toBeDefined();
    expect(vanityCall).toBeDefined();
  });

  it("throws 404 when neither hash_slug nor vanity_slug matches", async () => {
    mockProfileState.hashSlugRow = null;
    mockProfileState.vanitySlugRow = null;

    await expect(viewHandler({} as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("throws 500 when hash_slug query returns a database error", async () => {
    mockProfileState.hashSlugError = { message: "db error" };

    await expect(viewHandler({} as any)).rejects.toMatchObject({ statusCode: 500 });
    // vanity_slug should NOT be attempted after an error
    expect(eqCalls.find(([col]) => col === "vanity_slug")).toBeUndefined();
  });
});

describe("Ref token scoped to profile (view.post)", () => {
  beforeEach(() => {
    mockSlugState.slug = "abc123";
    mockProfileState.hashSlugRow = { id: "profile-owner" };
    mockProfileState.vanitySlugRow = null;
    mockProfileState.hashSlugError = null;
    mockProfileState.vanitySlugError = null;
    mockProfileState.linkRow = null;
    mockProfileState.linkError = null;
    mockProfileState.refTokenProfileId = null;
    eqCalls.length = 0;
  });

  it("includes profile_id in the ref token lookup so foreign tokens are rejected", async () => {
    const { getQuery } = await import("h3");
    vi.mocked(getQuery).mockReturnValueOnce({ ref: "some-ref-token" });

    mockProfileState.linkRow = null; // token not found for this profile

    const result = await viewHandler({} as any);

    expect(result.ok).toBe(true);
    // The second eq filter must have been the profile_id = profile-owner scope
    expect(mockProfileState.refTokenProfileId).toBe("profile-owner");
  });

  it("returns trackingLinkId=null when ref token exists but belongs to a different profile", async () => {
    const { getQuery } = await import("h3");
    vi.mocked(getQuery).mockReturnValueOnce({ ref: "foreign-token" });

    // linkRow is null: the scoped query (ref_token + profile_id) finds nothing
    mockProfileState.linkRow = null;

    const result = await viewHandler({} as any);

    // View is still recorded — just without a tracking link association
    expect(result.ok).toBe(true);
    // profile_id filter was applied
    expect(mockProfileState.refTokenProfileId).toBe("profile-owner");
  });

  it("resolves trackingLinkId when ref token belongs to this profile", async () => {
    const { getQuery } = await import("h3");
    vi.mocked(getQuery).mockReturnValueOnce({ ref: "correct-token" });

    mockProfileState.linkRow = { id: "link-99" };

    const result = await viewHandler({} as any);

    expect(result.ok).toBe(true);
    expect(mockProfileState.refTokenProfileId).toBe("profile-owner");
  });
});
