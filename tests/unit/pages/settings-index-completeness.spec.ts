import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";

// Regression: the Settings "Athlete Profile" badge used a cheap presence
// check (grad_year OR positions.length) instead of the canonical weighted
// completeness score. A player with only grad_year + sport set (30% per
// the shared formula in utils/profileCompletenessCalculation.ts) saw
// "complete" on /settings but "30%" on /settings/player-details.

const partialPlayerDetails = {
  graduation_year: 2028,
  primary_sport: "Basketball",
  // Everything the canonical formula weights beyond this is unset.
};

const mockGetPlayerDetails = vi.fn(() => partialPlayerDetails);
const mockLoadAllPreferences = vi.fn(async () => {});

vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    getHomeLocation: ref(null),
    getPlayerDetails: mockGetPlayerDetails,
    getSchoolPreferences: () => null,
    loadAllPreferences: mockLoadAllPreferences,
  }),
}));

vi.mock("~/composables/useEntitlement", () => ({
  useEntitlement: () => ({
    planLabel: ref("Plan unavailable"),
    load: vi.fn(async () => {}),
  }),
}));

vi.mock("~/composables/useVideoLinks", () => ({
  useVideoLinks: () => ({
    links: ref([]),
    load: vi.fn(async () => {}),
  }),
}));

import SettingsIndexPage from "~/pages/settings/index.vue";

describe("pages/settings/index — Athlete Profile completeness badge", () => {
  beforeEach(() => {
    mockGetPlayerDetails.mockClear();
    mockLoadAllPreferences.mockClear();
  });

  it("shows incomplete, not complete, for a 30%-complete profile", async () => {
    const wrapper = mount(SettingsIndexPage);
    await flushPromises();

    const athleteCard = wrapper
      .findAll('[class*="rounded-xl"]')
      .find((el) => el.text().includes("Athlete Profile"));

    expect(athleteCard?.text()).toContain("incomplete");
    expect(athleteCard?.text()).not.toContain("complete\n");
  });
});
