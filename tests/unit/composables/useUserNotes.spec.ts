import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Mock useSupabase and useUserStore first
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "note-1", note_content: "Test note" },
        error: null,
      }),
    })),
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user-1", email: "test@example.com" },
  })),
}));

import { useUserNotes } from "~/composables/useUserNotes";

describe("useUserNotes", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("has required methods", () => {
    const userNotes = useUserNotes();
    expect(typeof userNotes.getNote).toBe("function");
    expect(typeof userNotes.saveNote).toBe("function");
    expect(typeof userNotes.deleteNote).toBe("function");
  });

  it("has loading and error refs", () => {
    const { loading, error } = useUserNotes();
    expect(loading).toBeDefined();
    expect(error).toBeDefined();
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it("has additional utility methods", () => {
    const userNotes = useUserNotes();
    expect(typeof userNotes.getNotesByType).toBe("function");
    expect(typeof userNotes.clearCache).toBe("function");
    expect(typeof userNotes.hasNote).toBe("function");
  });

  describe("getNote", () => {
    it("is callable", async () => {
      const { getNote } = useUserNotes();
      expect(typeof getNote).toBe("function");

      const result = getNote("school", "school-1");
      expect(result).toBeInstanceOf(Promise);
    });

    it("accepts valid entity types", () => {
      const { getNote } = useUserNotes();

      const schoolPromise = getNote("school", "id-1");
      const coachPromise = getNote("coach", "id-2");
      const interactionPromise = getNote("interaction", "id-3");

      expect(schoolPromise).toBeInstanceOf(Promise);
      expect(coachPromise).toBeInstanceOf(Promise);
      expect(interactionPromise).toBeInstanceOf(Promise);
    });
  });

  describe("saveNote", () => {
    it("is callable", async () => {
      const { saveNote } = useUserNotes();
      expect(typeof saveNote).toBe("function");

      const result = saveNote("school", "school-1", "My notes");
      expect(result).toBeInstanceOf(Promise);
    });

    it("accepts different content values", () => {
      const { saveNote } = useUserNotes();

      const emptyNote = saveNote("school", "id-1", "");
      const longNote = saveNote("school", "id-2", "A".repeat(1000));
      const specialChars = saveNote(
        "school",
        "id-3",
        "Notes with @#$% special chars",
      );

      expect(emptyNote).toBeInstanceOf(Promise);
      expect(longNote).toBeInstanceOf(Promise);
      expect(specialChars).toBeInstanceOf(Promise);
    });
  });

  describe("deleteNote", () => {
    it("is callable", () => {
      const { deleteNote } = useUserNotes();
      expect(typeof deleteNote).toBe("function");

      const result = deleteNote("school", "school-1");
      expect(result).toBeInstanceOf(Promise);
    });

    it("accepts all entity types", () => {
      const { deleteNote } = useUserNotes();

      const school = deleteNote("school", "id-1");
      const coach = deleteNote("coach", "id-2");
      const interaction = deleteNote("interaction", "id-3");

      expect(school).toBeInstanceOf(Promise);
      expect(coach).toBeInstanceOf(Promise);
      expect(interaction).toBeInstanceOf(Promise);
    });
  });
});
