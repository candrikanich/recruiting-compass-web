import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock debounce to pass-through so tests don't need fake timers
vi.mock("~/utils/debounce", () => ({
  debounce: (fn: Function) => fn,
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const suggestion = {
  label: "1428 Elm Street, Springfield, IL 62701",
  address: "1428 Elm Street",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  latitude: 39.8,
  longitude: -89.64,
};

describe("useAddressAutocomplete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty suggestions initially", async () => {
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { suggestions } = useAddressAutocomplete();
    expect(suggestions.value).toEqual([]);
  });

  it("does not search for queries shorter than 3 chars", async () => {
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search } = useAddressAutocomplete();
    await search("El");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches suggestions for queries of 3+ chars", async () => {
    mockFetch.mockResolvedValue([suggestion]);
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search, suggestions } = useAddressAutocomplete();
    await search("1428");
    expect(suggestions.value).toEqual([suggestion]);
  });

  it("selectSuggestion returns full HomeLocation with lat/lng", async () => {
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { selectSuggestion } = useAddressAutocomplete();
    const loc = selectSuggestion(suggestion);
    expect(loc).toEqual({
      address: "1428 Elm Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      latitude: 39.8,
      longitude: -89.64,
    });
  });

  it("returns empty suggestions on API error (graceful fallback)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search, suggestions } = useAddressAutocomplete();
    await search("1428 Elm");
    expect(suggestions.value).toEqual([]);
  });

  it("clears suggestions on empty query", async () => {
    mockFetch.mockResolvedValue([suggestion]);
    const { useAddressAutocomplete } = await import("~/composables/useAddressAutocomplete");
    const { search, suggestions } = useAddressAutocomplete();
    await search("1428");
    expect(suggestions.value).toHaveLength(1);
    await search("");
    expect(suggestions.value).toEqual([]);
  });
});
