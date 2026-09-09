import { describe, it, expect, vi } from "vitest";

vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3");
  return { ...actual, getQuery: vi.fn() };
});
vi.mock("~/server/utils/auth", () => ({ requireAuth: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("~/server/utils/schoolMetadataLookup", () => ({
  lookupSchoolMetadata: vi.fn(() => ({
    mascot: "Tigers",
    athleticsUrl: "https://example.edu/athletics",
    colors: ["#FF0000"],
    conferenceUrl: null,
  })),
}));

import { getQuery } from "h3";
import handler from "~/server/api/schools/metadata-lookup.get";
import { lookupSchoolMetadata } from "~/server/utils/schoolMetadataLookup";

describe("GET /api/schools/metadata-lookup", () => {
  it("returns the lookup result for a valid name", async () => {
    vi.mocked(getQuery).mockReturnValue({ name: "Test U" });
    const result = await handler({} as any);
    expect(result).toEqual({
      success: true,
      data: {
        mascot: "Tigers",
        athleticsUrl: "https://example.edu/athletics",
        colors: ["#FF0000"],
        conferenceUrl: null,
      },
    });
    expect(lookupSchoolMetadata).toHaveBeenCalledWith("Test U");
  });

  it("400s when name is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({});
    await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 400 });
  });
});
