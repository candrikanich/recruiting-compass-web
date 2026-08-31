import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import ProfileSetup from "~/components/profile/ProfileSetup.vue";
import { usePlayerProfile } from "~/composables/usePlayerProfile";
import type { PlayerProfile } from "~/types/models";

vi.mock("~/composables/usePlayerProfile");

const createProfile = (overrides: Partial<PlayerProfile> = {}): PlayerProfile =>
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
    banner_url: null,
    looking_for: null,
    commitment_status: "uncommitted",
    committed_school_id: null,
    awards: [],
    values_tags: [],
    section_config: [],
    show_metrics: true,
    ...overrides,
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
  const wrapper = mount(ProfileSetup, {
    props: {
      details: {},
      schools: [{ id: "school-1", name: "State U" }],
    } as never,
  });
  return { wrapper, updateProfile };
};

describe("ProfileSetup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not crash rendering the char counter when bio is cleared to empty", async () => {
    // Regression: clearing the bio then saving persisted `bio: null` back
    // into the local draft, and `draft.bio.length` threw
    // "Cannot read properties of null (reading 'length')". Bio persistence
    // is now debounced (ProfileContentEditor emits update:bio on @input).
    vi.useFakeTimers();
    try {
      const { wrapper, updateProfile } = mountSetup(createProfile());

      const textarea = wrapper.find("[data-test='bio-textarea']");
      await textarea.setValue("");
      await vi.advanceTimersByTimeAsync(600);

      expect(updateProfile).toHaveBeenCalledWith({ bio: null });
      expect(wrapper.text()).toContain("0/300");
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the four numbered setup sections plus the live preview rail", () => {
    const { wrapper } = mountSetup(createProfile());

    expect(wrapper.text()).toMatch(/appearance/i);
    expect(wrapper.text()).toMatch(/content/i);
    expect(wrapper.text()).toMatch(/section configuration/i);
    expect(wrapper.text()).toMatch(/recruitment status/i);
    expect(wrapper.text()).toMatch(/live preview/i);
  });

  it("renders ShareProfilePanel with the public profile url", () => {
    const { wrapper } = mountSetup(createProfile());
    expect(wrapper.find("[data-test='copy-link']").exists()).toBe(true);
    expect(wrapper.text()).toContain("https://recruitingcompass.com/p/abc123");
  });

  it("toggling a section's visibility persists a section_config payload via updateProfile", async () => {
    const { wrapper, updateProfile } = mountSetup(createProfile());

    const toggle = wrapper.find("[data-test='section-visibility']");
    expect(toggle.exists()).toBe(true);
    await toggle.trigger("click");
    await nextTick();

    const call = updateProfile.mock.calls.find((c) => "section_config" in c[0]);
    expect(call).toBeTruthy();
    expect(Array.isArray(call![0].section_config)).toBe(true);
  });

  it("changing recruitment status to committed persists commitment_status", async () => {
    const { wrapper, updateProfile } = mountSetup(createProfile());

    const select = wrapper.find("[data-test='status-select']");
    await select.setValue("committed");
    await nextTick();

    expect(updateProfile).toHaveBeenCalledWith({
      commitment_status: "committed",
    });
  });

  it("changing header color persists header_color via updateProfile", async () => {
    const { wrapper, updateProfile } = mountSetup(createProfile());

    await wrapper.find("[data-test='header-color-blue']").trigger("click");
    await nextTick();

    expect(updateProfile).toHaveBeenCalledWith({ header_color: "blue" });
  });
});
