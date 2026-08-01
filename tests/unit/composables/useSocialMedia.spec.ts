import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSocialMedia } from "~/composables/useSocialMedia";

const mockSupabase = { from: vi.fn() };
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ user: { id: "user-123", email: "test@example.com" } }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

let mockActiveFamilyId: string | null = "family-123";
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    get activeFamilyId() {
      return { value: mockActiveFamilyId };
    },
  })),
}));

const makeMockQuery = () => {
  const q: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return q;
};

describe("useSocialMedia.createPost", () => {
  let mockQuery: any;

  const postData = {
    school_id: "school-1",
    platform: "twitter" as const,
    post_url: "https://twitter.com/coach/status/123",
    post_content: "Great practice today!",
    post_date: "2026-01-01T00:00:00Z",
    author_handle: "coach",
    author_name: "Coach Smith",
    is_recruiting_related: true,
    flagged_for_review: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveFamilyId = "family-123";
    mockQuery = makeMockQuery();
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  it("stamps family_unit_id from active family context on insert", async () => {
    mockQuery.single.mockResolvedValue({
      data: { id: "post-1", ...postData },
      error: null,
    });
    const { createPost } = useSocialMedia();

    await createPost(postData);

    const insertCall = mockQuery.insert.mock.calls[0][0][0];
    expect(insertCall.family_unit_id).toBe("family-123");
  });

  it("throws when no family context is loaded", async () => {
    mockActiveFamilyId = null;
    const { createPost } = useSocialMedia();

    await expect(createPost(postData)).rejects.toThrow(
      "Family context not loaded",
    );
    expect(mockQuery.insert).not.toHaveBeenCalled();
  });
});
