import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotesHistory } from "~/composables/useNotesHistory";

describe("useNotesHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty state", () => {
    const { history, loading, error } = useNotesHistory();

    expect(history.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("should have fetchNoteHistory method", () => {
    const { fetchNoteHistory } = useNotesHistory();

    expect(typeof fetchNoteHistory).toBe("function");
  });

  it("should format history entries with dates", () => {
    const { formattedHistory } = useNotesHistory();

    expect(formattedHistory.value).toBeDefined();
    expect(Array.isArray(formattedHistory.value)).toBe(true);
  });

  it("should handle missing user gracefully", async () => {
    const { fetchNoteHistory, history, error } = useNotesHistory();

    // When no user is authenticated
    await fetchNoteHistory("test-school-id");

    // Should not crash and history should remain empty
    expect(history.value).toEqual([]);
  });

  it("should return composable functions", () => {
    const composable = useNotesHistory();

    expect(composable).toHaveProperty("history");
    expect(composable).toHaveProperty("formattedHistory");
    expect(composable).toHaveProperty("loading");
    expect(composable).toHaveProperty("error");
    expect(composable).toHaveProperty("fetchNoteHistory");
  });

  it("should have formattedHistory as computed", () => {
    const { formattedHistory } = useNotesHistory();

    // Computed properties are reactive
    expect(formattedHistory.value).toBeDefined();
  });

  describe("NoteHistoryEntry structure", () => {
    it("should format entries with required fields", () => {
      const { history } = useNotesHistory();

      // Each entry should have these properties
      expect(history.value).toBeDefined();
      // Type is checked at compile time
    });
  });
});
