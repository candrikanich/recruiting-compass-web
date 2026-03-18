import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

const mockFetchFn = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchFn }),
}));

const mockProfileData = {
  id: "p1",
  hash_slug: "abc123",
  is_published: false,
  bio: null,
  show_academics: true,
  show_athletic: true,
  show_film: true,
  show_schools: true,
  vanity_slug: null,
};

const { usePlayerProfileStore } = await import("~/stores/playerProfile");

describe("usePlayerProfileStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockFetchFn.mockReset();
  });

  it("initializes with null profile and not loading", () => {
    const store = usePlayerProfileStore();
    expect(store.profile).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("fetchProfile populates profile on success", async () => {
    mockFetchFn.mockResolvedValueOnce(mockProfileData);
    const store = usePlayerProfileStore();
    await store.fetchProfile();
    expect(store.profile?.hash_slug).toBe("abc123");
    expect(store.loading).toBe(false);
  });

  it("updateProfile merges changes into state optimistically", async () => {
    mockFetchFn
      .mockResolvedValueOnce(mockProfileData) // fetchProfile
      .mockResolvedValueOnce({ success: true }); // updateProfile
    const store = usePlayerProfileStore();
    await store.fetchProfile();
    await store.updateProfile({ bio: "New bio", is_published: true });
    expect(store.profile?.bio).toBe("New bio");
    expect(store.profile?.is_published).toBe(true);
  });

  it("sets error when fetchProfile throws", async () => {
    mockFetchFn.mockRejectedValueOnce(new Error("Network error"));
    const store = usePlayerProfileStore();
    await store.fetchProfile();
    expect(store.error).toBe("Network error");
    expect(store.loading).toBe(false);
  });
});
