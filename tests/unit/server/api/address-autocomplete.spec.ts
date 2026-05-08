import { describe, it, expect, vi, beforeEach } from "vitest";

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
    defineEventHandler: vi.fn(
      (handler: (event: unknown) => unknown) => handler,
    ),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const mockEvent = {
  context: {},
  node: { req: { headers: {} }, res: {} },
} as never;

import { getQuery } from "h3";

const nominatimResponse = [
  {
    display_name:
      "1428 Elm Street, Springfield, Sangamon County, Illinois, 62701, United States",
    lat: "39.7817",
    lon: "-89.6501",
    address: {
      house_number: "1428",
      road: "Elm Street",
      city: "Springfield",
      state: "Illinois",
      postcode: "62701",
      "ISO3166-2-lvl4": "US-IL",
    },
  },
];

describe("GET /api/address/autocomplete", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("calls Nominatim with correct params and returns shaped results", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockResolvedValue(nominatimResponse);
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://nominatim.openstreetmap.org/search",
      expect.objectContaining({
        params: expect.objectContaining({ countrycodes: "us", format: "json" }),
      }),
    );
    expect(result).toEqual([
      {
        label:
          "1428 Elm Street, Springfield, Sangamon County, Illinois, 62701, United States",
        address: "1428 Elm Street",
        city: "Springfield",
        state: "IL",
        zip: "62701",
        latitude: 39.7817,
        longitude: -89.6501,
      },
    ]);
  });

  it("extracts 2-letter state code from ISO3166-2-lvl4", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockResolvedValue(nominatimResponse);
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = (await handler.default(mockEvent)) as Array<{
      state: string;
    }>;
    expect(result[0].state).toBe("IL");
  });

  it("returns [] gracefully when Nominatim throws", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "1428 Elm" });
    mockFetch.mockRejectedValue(new Error("Network error"));
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = await handler.default(mockEvent);
    expect(result).toEqual([]);
  });

  it("handles missing address subfields gracefully", async () => {
    vi.mocked(getQuery).mockReturnValue({ q: "Springfield" });
    mockFetch.mockResolvedValue([
      {
        display_name: "Springfield, Illinois, United States",
        lat: "39.7817",
        lon: "-89.6501",
        address: {
          city: "Springfield",
          state: "Illinois",
          "ISO3166-2-lvl4": "US-IL",
        },
      },
    ]);
    const handler = await import("~/server/api/address/autocomplete.get");
    const result = (await handler.default(mockEvent)) as Array<{
      address: string;
    }>;
    expect(result[0].address).toBe(""); // no house_number or road
  });
});
