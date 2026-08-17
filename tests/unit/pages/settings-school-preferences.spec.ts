import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import type { SchoolPreferences } from "~/types/models";

// Regression: usePreferenceManager creates fresh, empty per-component preference
// refs. Reading school preferences before an explicit server load yields nothing,
// so the page rendered blank even though the athlete had saved preferences (the
// settings-index completion badge, which DID load, correctly showed "complete").
// The mock returns saved data ONLY after loadAllPreferences resolves — mirroring
// the real load ordering — so the page renders the row solely because it awaits
// the load in onMounted.

const savedPreferences: SchoolPreferences = {
  preferences: [
    {
      id: "pref-1",
      category: "location",
      type: "max_distance_miles",
      value: 300,
      priority: 1,
      is_dealbreaker: false,
    },
  ],
  template_used: "Close to Home",
  last_updated: "2026-08-07T20:49:31Z",
};

let loaded = false;
const mockLoadAllPreferences = vi.fn(async () => {
  loaded = true;
});
const mockGetSchoolPreferences = vi.fn(() =>
  loaded ? savedPreferences : null,
);

vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    isLoading: ref(false),
    error: ref(null),
    getSchoolPreferences: mockGetSchoolPreferences,
    setSchoolPreferences: vi.fn(),
    loadAllPreferences: mockLoadAllPreferences,
  }),
}));

vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

import SchoolPreferencesPage from "~/pages/settings/school-preferences.vue";

describe("pages/settings/school-preferences", () => {
  beforeEach(() => {
    loaded = false;
    mockLoadAllPreferences.mockClear();
    mockGetSchoolPreferences.mockClear();
  });

  it("loads saved preferences from the server before rendering", async () => {
    const wrapper = mount(SchoolPreferencesPage);
    await flushPromises();

    expect(mockLoadAllPreferences).toHaveBeenCalledOnce();
    // Read must happen AFTER the load resolves, or the row never appears.
    expect(wrapper.text()).not.toContain("No preferences set yet.");
    // The saved location preference row is what only renders post-load.
    expect(wrapper.text()).toContain("Maximum Distance (miles)");
    expect(wrapper.text()).toContain("300 miles");
  });
});
