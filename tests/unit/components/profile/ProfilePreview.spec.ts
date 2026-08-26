import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import ProfilePreview from "~/components/profile/ProfilePreview.vue";
import ProfilePublicProfileCard from "~/components/profile/PublicProfileCard.vue";
import { useVideoLinks } from "~/composables/useVideoLinks";
import { useUserStore } from "~/stores/user";
import type { PlayerProfile, VideoLinkRow } from "~/types/models";

vi.mock("~/composables/useVideoLinks");
vi.mock("~/stores/user");

const mockVideoLinkRows: VideoLinkRow[] = [
  {
    id: "vl-1",
    user_id: "user-1",
    family_unit_id: null,
    platform: "hudl",
    url: "https://hudl.com/video/1",
    title: "Fall Highlights",
    position: 0,
    health_status: "healthy",
    last_health_check: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "vl-2",
    user_id: "user-1",
    family_unit_id: null,
    platform: "youtube",
    url: "https://youtube.com/watch?v=abc",
    title: null,
    position: 1,
    health_status: "unknown",
    last_health_check: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const createSettings = (
  overrides: Partial<PlayerProfile> = {},
): PlayerProfile => ({
  id: "profile-1",
  user_id: "user-1",
  family_unit_id: "family-1",
  hash_slug: "abc123",
  vanity_slug: null,
  is_published: true,
  bio: null,
  header_color: "slate",
  show_academics: true,
  show_athletic: true,
  show_film: true,
  show_schools: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const mountPreview = (settingsOverrides: Partial<PlayerProfile> = {}) =>
  mount(ProfilePreview, {
    props: {
      settings: createSettings(settingsOverrides),
      playerName: "Jane Athlete",
      // No JSONB video_links here — the field was dropped from PlayerDetails.
      details: { gpa: 3.8 },
      schools: [],
    },
    global: {
      components: { ProfilePublicProfileCard },
    },
  });

describe("ProfilePreview.vue", () => {
  beforeEach(() => {
    vi.mocked(useUserStore).mockReturnValue({
      user: { profile_photo_url: null },
    } as ReturnType<typeof useUserStore>);
  });

  it("loads video links from the video_links table on mount", () => {
    const load = vi.fn();
    vi.mocked(useVideoLinks).mockReturnValue({
      links: ref(mockVideoLinkRows),
      isLoading: ref(false),
      error: ref(null),
      load,
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    mountPreview();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("renders film from the video_links table (not the JSONB details field)", async () => {
    vi.mocked(useVideoLinks).mockReturnValue({
      links: ref(mockVideoLinkRows),
      isLoading: ref(false),
      error: ref(null),
      load: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    const wrapper = mountPreview({ show_film: true });
    await nextTick();

    expect(wrapper.text()).toContain("Fall Highlights");
    expect(wrapper.text()).toContain("Hudl");
  });

  it("shows no film section when show_film is false, even with links loaded", async () => {
    vi.mocked(useVideoLinks).mockReturnValue({
      links: ref(mockVideoLinkRows),
      isLoading: ref(false),
      error: ref(null),
      load: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    const wrapper = mountPreview({ show_film: false });
    await nextTick();

    expect(wrapper.text()).not.toContain("Fall Highlights");
  });

  it("shows no film section when the video_links table is empty", async () => {
    vi.mocked(useVideoLinks).mockReturnValue({
      links: ref([]),
      isLoading: ref(false),
      error: ref(null),
      load: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    const wrapper = mountPreview({ show_film: true });
    await nextTick();

    expect(wrapper.text()).not.toContain("Film");
  });

  it("resolves sections via resolveSections: empty section_config + show_academics true still shows Academics", async () => {
    vi.mocked(useVideoLinks).mockReturnValue({
      links: ref([]),
      isLoading: ref(false),
      error: ref(null),
      load: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    // Bug reproduction: an empty/absent section_config used to be passed
    // straight to normalizeSectionConfig, which defaults every section
    // (including academics) to hidden — even with show_academics: true.
    const wrapper = mountPreview({
      section_config: [],
      show_academics: true,
    });
    await nextTick();

    expect(wrapper.text()).toContain("Academics");
    expect(wrapper.text()).toContain("GPA");
  });

  it("resolves sections via resolveSections: show_academics false overrides a stale section_config entry", async () => {
    vi.mocked(useVideoLinks).mockReturnValue({
      links: ref([]),
      isLoading: ref(false),
      error: ref(null),
      load: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    // A stored section_config marking academics visible=true is stale once
    // the owner toggles show_academics off — resolveSections' show_* override
    // must win over the persisted config entry.
    const wrapper = mountPreview({
      section_config: [
        { key: "academics", visible: true },
        { key: "metrics", visible: false },
        { key: "film", visible: false },
        { key: "values", visible: true },
        { key: "team_history", visible: true },
        { key: "awards", visible: true },
      ],
      show_academics: false,
    });
    await nextTick();

    expect(wrapper.text()).not.toContain("Academics");
  });
});
