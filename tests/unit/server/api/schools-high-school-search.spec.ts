import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getQuery: vi.fn(),
    createError: vi.fn((opts: { statusCode: number; statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number };
      err.statusCode = opts.statusCode;
      return err;
    }),
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

const mockSchools = [
  { nces_id: "100001", name: "Lincoln High School", city: "Des Moines", state: "IA" },
  { nces_id: "100002", name: "Lincoln-Way East High School", city: "Frankfort", state: "IL" },
];

const mockSelect = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockFrom = vi.fn();

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("~/server/utils/redis", () => ({
  redis: null,
  CACHE_KEYS: { NCES_SEARCH: (q: string, s: string) => `nces:search:${q}:${s}` },
  TTL: { ONE_HOUR: 3600 },
}));

const mockEvent = { context: {}, node: { req: { headers: {} }, res: {} } } as never;

import { getQuery, createError } from "h3";

describe("GET /api/schools/high-school-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Chain: .select().ilike().order().order().limit() or .select().ilike().order().limit()
    // order() can be called twice (state bias), so it must return itself
    mockLimit.mockResolvedValue({ data: mockSchools, error: null });
    mockOrder.mockReturnValue({ order: mockOrder, limit: mockLimit });
    mockIlike.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ ilike: mockIlike });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("returns [] when q is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("returns [] when q is empty string", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("throws 400 when q is 1 character", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "L" });
    vi.mocked(createError).mockImplementation((opts) => {
      const err = new Error(opts.statusMessage!) as any;
      err.statusCode = opts.statusCode;
      return err;
    });
    const handler = await import("~/server/api/schools/high-school-search.get");
    await expect(handler.default(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns schools matching query", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "Lincoln" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual(mockSchools);
    expect(mockIlike).toHaveBeenCalledWith("name", "%Lincoln%");
  });

  it("returns [] for query with no results", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    vi.mocked(getQuery).mockReturnValue({ q: "xqzpwv" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("biases matching-state schools to front of results", async () => {
    const schools = [
      { nces_id: "1", name: "Lincoln HS", city: "Columbus", state: "OH" },
      { nces_id: "2", name: "Lincoln Academy", city: "Athens", state: "OH" },
      { nces_id: "3", name: "Lincoln High", city: "Chicago", state: "IL" },
    ];
    mockLimit.mockResolvedValue({ data: schools, error: null });
    vi.mocked(getQuery).mockReturnValue({ q: "Lincoln", state: "IL" });
    const handler = await import("~/server/api/schools/high-school-search.get");
    const result = await handler.default(mockEvent);
    // IL school should be first
    expect(result[0].state).toBe("IL");
    expect(result).toHaveLength(3);
  });
});
