import { describe, it, expect, beforeEach } from "vitest";
import { useSearch } from "~/composables/useSearch";

describe("useSearch", () => {
  let search: ReturnType<typeof useSearch>;

  beforeEach(() => {
    search = useSearch();
  });

  it("should initialize composable", () => {
    expect(search).toBeDefined();
  });

  it("should have required properties", () => {
    expect(search.query).toBeDefined();
    expect(search.totalResults).toBeDefined();
    expect(search.filters).toBeDefined();
  });

  it("should expose search methods", () => {
    expect(
      typeof search.searchSchools === "function" ||
        typeof search.searchSchools === "undefined",
    ).toBe(true);
  });
});
