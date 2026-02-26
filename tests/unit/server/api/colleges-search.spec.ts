import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getQuery: vi.fn(),
    createError: vi.fn(
      (opts: { statusCode: number; statusMessage: string }) => {
        const err = new Error(opts.statusMessage) as Error & {
          statusCode: number;
        };
        err.statusCode = opts.statusCode;
        return err;
      },
    ),
    defineEventHandler: vi.fn(
      (handler: (event: unknown) => unknown) => handler,
    ),
  };
});

vi.stubGlobal("useRuntimeConfig", () => ({
  collegeScorecardApiKey: "test-api-key",
}));

const mockEvent = {
  context: {},
  node: { req: { headers: {} }, res: {} },
} as never;

describe("GET /api/colleges/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("useRuntimeConfig", () => ({
      collegeScorecardApiKey: "test-api-key",
    }));
  });

  it("rejects unauthenticated requests with 401", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("returns 400 when neither q nor id is provided", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({});

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when q is shorter than 3 characters", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "ab" });

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns College Scorecard results when query is valid", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "Florida", per_page: "5" });

    const mockResults = {
      metadata: { total: 1, page: 0, per_page: 5 },
      results: [
        {
          id: 1,
          "school.name": "University of Florida",
          "school.city": "Gainesville",
          "school.state": "FL",
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    const result = await handler(mockEvent);

    expect(result).toEqual(mockResults);
    const fetchCall = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("school.name=Florida");
    expect(fetchCall).toContain("api_key=test-api-key");
  });

  it("does not expose the API key in the response", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "Florida" });

    const mockResults = {
      metadata: { total: 0, page: 0, per_page: 10 },
      results: [],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    const result = await handler(mockEvent);

    expect(JSON.stringify(result)).not.toContain("test-api-key");
  });

  it("returns 429 when College Scorecard rate limits", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "Florida" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 429 });
  });

  it("returns 502 when College Scorecard returns an auth error", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "Florida" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 502 });
  });

  it("returns 503 when College Scorecard is unreachable", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "Florida" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 503 });
  });

  it("supports lookup by ID", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ id: "228723" });

    const mockResults = {
      metadata: { total: 1, page: 0, per_page: 1 },
      results: [{ id: 228723, "school.name": "University of Florida" }],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResults),
      }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    const result = await handler(mockEvent);

    expect(result).toEqual(mockResults);
    const fetchCall = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("id=228723");
  });

  it("caps per_page at 20", async () => {
    const { requireAuth } = await import("~/server/utils/auth");
    const h3 = await import("h3");
    vi.mocked(requireAuth).mockResolvedValue(undefined);
    vi.mocked(h3.getQuery).mockReturnValue({ q: "Florida", per_page: "100" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ metadata: { total: 0 }, results: [] }),
      }),
    );

    const { default: handler } = await import(
      "~/server/api/colleges/search.get"
    );
    await handler(mockEvent);

    const fetchCall = vi.mocked(global.fetch).mock.calls[0][0] as string;
    expect(fetchCall).toContain("per_page=20");
    expect(fetchCall).not.toContain("per_page=100");
  });
});
