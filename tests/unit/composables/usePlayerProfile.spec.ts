import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("~/stores/playerProfile", () => ({
  usePlayerProfileStore: vi.fn(() => ({
    profile: { hash_slug: "abc123", vanity_slug: "john2026", is_published: true },
    loading: false,
    error: null,
    profileUrl: "/p/john2026",
    isPublished: true,
    fetchProfile: vi.fn(),
    updateProfile: vi.fn(),
  })),
}));

const { usePlayerProfile } = await import("~/composables/usePlayerProfile");

describe("usePlayerProfile", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("exposes profile data from store", () => {
    const { profile, isPublished } = usePlayerProfile();
    expect(profile.value?.hash_slug).toBe("abc123");
    expect(isPublished.value).toBe(true);
  });

  it("builds public URL from profile URL", () => {
    const { publicUrl } = usePlayerProfile();
    expect(publicUrl.value).toContain("/p/");
  });

  it("exposes fetchProfile and updateProfile", () => {
    const { fetchProfile, updateProfile } = usePlayerProfile();
    expect(typeof fetchProfile).toBe("function");
    expect(typeof updateProfile).toBe("function");
  });
});
