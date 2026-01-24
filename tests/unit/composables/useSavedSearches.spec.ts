import { describe, it, expect, beforeEach } from "vitest";
import { useSavedSearches } from "~/composables/useSavedSearches";

describe("useSavedSearches", () => {
  let composable: ReturnType<typeof useSavedSearches>;

  beforeEach(() => {
    composable = useSavedSearches();
  });

  it("should initialize", () => {
    expect(composable).toBeDefined();
  });

  it("should have required state", () => {
    expect(composable.savedSearches).toBeDefined();
    expect(composable.searchHistory).toBeDefined();
  });
});
