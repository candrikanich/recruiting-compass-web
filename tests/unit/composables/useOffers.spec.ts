import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUserStore } from "~/stores/user";

// Mock useSupabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

describe("useOffers", () => {
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    userStore = useUserStore();
    userStore.user = { id: "user-123", email: "test@example.com" } as any;
    userStore.isAuthenticated = true;

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: [{ id: "test-offer", status: "pending" }],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    vi.clearAllMocks();
  });

  it("should import and return basic structure", async () => {
    const { useOffers } = await import("~/composables/useOffers");

    expect(typeof useOffers).toBe("function");

    const result = useOffers();
    expect(result).toHaveProperty("offers");
    expect(result).toHaveProperty("fetchOffers");
  });
});
