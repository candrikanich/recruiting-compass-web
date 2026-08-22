import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import ProfileSetup from "~/components/profile/ProfileSetup.vue";
import { usePlayerProfile } from "~/composables/usePlayerProfile";
import type { PlayerProfile } from "~/types/models";

vi.mock("~/composables/usePlayerProfile");

const createProfile = (
  overrides: Partial<PlayerProfile> = {},
): PlayerProfile =>
  ({
    id: "profile-1",
    user_id: "user-1",
    family_unit_id: "family-1",
    hash_slug: "abc123",
    vanity_slug: null,
    bio: "Starting bio",
    is_published: true,
    show_academics: true,
    show_athletic: true,
    show_film: true,
    show_schools: true,
    header_color: "slate",
  }) as unknown as PlayerProfile;

const mountSetup = (profile: PlayerProfile) => {
  const updateProfile = vi.fn().mockResolvedValue(undefined);
  vi.mocked(usePlayerProfile).mockReturnValue({
    profile: ref(profile),
    loading: ref(false),
    error: ref(null),
    isPublished: ref(profile.is_published),
    publicUrl: ref("https://recruitingcompass.com/p/abc123"),
    fetchProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile,
  } as unknown as ReturnType<typeof usePlayerProfile>);
  return { wrapper: mount(ProfileSetup), updateProfile };
};

describe("ProfileSetup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not crash rendering the char counter when bio is cleared to empty", async () => {
    // Regression: clearing the bio then blurring saved `bio: null` back into
    // the local draft, and `draft.bio.length` threw
    // "Cannot read properties of null (reading 'length')".
    const { wrapper, updateProfile } = mountSetup(createProfile());

    const textarea = wrapper.find("textarea");
    await textarea.setValue("");
    await textarea.trigger("blur");
    await nextTick();
    await nextTick();

    expect(updateProfile).toHaveBeenCalledWith({ bio: null });
    expect(wrapper.text()).toContain("0/300");
  });
});
