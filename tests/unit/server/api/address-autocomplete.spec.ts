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
    defineEventHandler: vi.fn((handler: (event: unknown) => unknown) => handler),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);
vi.stubGlobal("useRuntimeConfig", () => ({ radarApiKey: "test-radar-key" }));

const mockEvent = { context: {}, node: { req: { headers: {} }, res: {} } } as never;

import { getQuery } from "h3";

const radarResponse = {
  addresses: [
    {
      formattedAddress: "1428 Elm Street, Springfield, IL 62701",
      addressLabel: "1428 Elm Street",
      city: "Springfield",
      stateCode: "IL",
      postalCode: "62701",
      latitude: 39.8,
      longitude: -89.64,
    },
  ],
};

describe("GET /api/address/autocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("useRuntimeConfig", () => ({ radarApiKey: "test-radar-key" }));
  });

  it("returns [] when q is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns [] when q is shorter than 3 chars", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "El" });
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls Radar API with correct params and returns shaped results", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockResolvedValue(radarResponse);
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.radar.io/v1/autocomplete",
      expect.objectContaining({ params: expect.objectContaining({ country: "US" }) })
    );
    expect(result).toEqual([{
      label: "1428 Elm Street, Springfield, IL 62701",
      address: "1428 Elm Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      latitude: 39.8,
      longitude: -89.64,
    }]);
  });

  it("returns [] gracefully when Radar throws (401, 429, network error)", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockRejectedValue(new Error("401 Unauthorized"));
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("returns [] when radarApiKey is not configured", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ radarApiKey: "" }));
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
