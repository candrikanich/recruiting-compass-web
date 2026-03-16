import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useRecommendationLetters } from "~/composables/useRecommendationLetters";

const mockSupabase = { from: vi.fn() };
vi.mock("~/composables/useSupabase", () => ({ useSupabase: () => mockSupabase }));

let mockUserId = "user-123";
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ get user() { return { id: mockUserId }; } }),
}));

const makeMockQuery = () => {
  const q: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return q;
};

describe("useRecommendationLetters", () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockQuery = makeMockQuery();
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("fetchLetters", () => {
    it("fetches letters for the current user ordered by requested_date desc", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });
      const { fetchLetters, letters } = useRecommendationLetters();
      await fetchLetters();
      expect(mockSupabase.from).toHaveBeenCalledWith("recommendation_letters");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(mockQuery.order).toHaveBeenCalledWith("requested_date", { ascending: false });
      expect(letters.value).toEqual([]);
    });

    it("sets error state on fetch failure", async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: { message: "DB down" } });
      const { fetchLetters, error } = useRecommendationLetters();
      await fetchLetters();
      expect(error.value).toBeTruthy();
    });

    it("sets loading to false after fetch completes", async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });
      const { fetchLetters, loading } = useRecommendationLetters();
      await fetchLetters();
      expect(loading.value).toBe(false);
    });
  });

  describe("saveLetter", () => {
    const formData = {
      writer_name: "Dr. Smith",
      writer_email: "smith@uni.edu",
      writer_title: "Professor",
      status: "requested",
      requested_date: "2026-01-01",
      due_date: "",
      received_date: "",
      relationship: "teacher",
      schools_submitted_to: [],
      notes: "",
    };

    it("inserts a new letter when no id provided", async () => {
      const insertSelectMock = vi.fn().mockResolvedValue({ data: [{ id: "new-id" }], error: null });
      const insertMock = { select: insertSelectMock };
      mockQuery.insert.mockReturnValue(insertMock);
      mockQuery.order.mockResolvedValue({ data: [], error: null });
      const { saveLetter } = useRecommendationLetters();
      await saveLetter(formData);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ writer_name: "Dr. Smith", user_id: "user-123" })]),
      );
    });

    it("updates an existing letter when id provided", async () => {
      mockQuery.eq
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({ data: null, error: null });
      const { saveLetter } = useRecommendationLetters();
      await saveLetter(formData, "letter-abc");
      expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({ writer_name: "Dr. Smith" }));
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "letter-abc");
    });

    it("sets error state on save failure", async () => {
      const insertSelectMock = vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } });
      const insertMock = { select: insertSelectMock };
      mockQuery.insert.mockReturnValue(insertMock);
      const { saveLetter, error } = useRecommendationLetters();
      await saveLetter(formData).catch(() => {});
      expect(error.value).toBeTruthy();
    });
  });

  describe("deleteLetter", () => {
    it("deletes by id and refreshes the list", async () => {
      mockQuery.eq
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({ error: null });
      mockQuery.order.mockResolvedValue({ data: [], error: null });
      const { deleteLetter } = useRecommendationLetters();
      await deleteLetter("letter-xyz");
      expect(mockSupabase.from).toHaveBeenCalledWith("recommendation_letters");
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "letter-xyz");
    });

    it("sets error state on delete failure", async () => {
      mockQuery.eq
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({ error: { message: "delete failed" } });
      const { deleteLetter, error } = useRecommendationLetters();
      await deleteLetter("letter-xyz").catch(() => {});
      expect(error.value).toBeTruthy();
    });
  });
});
