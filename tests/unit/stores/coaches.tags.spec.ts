import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useCoachStore } from "~/stores/coaches";
import { useUserStore } from "~/stores/user";
import type { Coach } from "~/types/models";

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: (html: string) => html.replace(/<[^>]*>/g, ""),
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    activeFamilyId: { value: "family-123" },
  })),
}));

describe("useCoachStore - updateCoachTags", () => {
  let coachStore: ReturnType<typeof useCoachStore>;
  let userStore: ReturnType<typeof useUserStore>;
  let mockQuery: any;

  const createMockCoach = (overrides = {}): Coach =>
    ({
      id: "coach-1",
      school_id: "school-123",
      user_id: "user-123",
      role: "head",
      first_name: "John",
      last_name: "Smith",
      email: "john@example.com",
      phone: "555-1234",
      twitter_handle: "@coach",
      instagram_handle: "coach",
      notes: "Head coach",
      tags: [],
      last_contact_date: "2024-01-01",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      ...overrides,
    }) as Coach;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    coachStore = useCoachStore();
    userStore = useUserStore();
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
    };

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  it("issues an update with the new tags payload and returns the updated coach", async () => {
    coachStore.coaches = [createMockCoach()];

    const updatedCoach = createMockCoach({ tags: ["A"] });
    mockQuery.single.mockResolvedValue({ data: updatedCoach, error: null });

    const result = await coachStore.updateCoachTags("coach-1", ["A"]);

    expect(mockSupabase.from).toHaveBeenCalledWith("coaches");
    expect(mockQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["A"] }),
    );
    expect(mockQuery.eq).toHaveBeenCalledWith("id", "coach-1");
    expect(result).toEqual(updatedCoach);
    expect(coachStore.coaches[0]).toEqual(updatedCoach);
  });
});
