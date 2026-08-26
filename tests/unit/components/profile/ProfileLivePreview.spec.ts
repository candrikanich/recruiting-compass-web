import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileLivePreview from "~/components/profile/setup/ProfileLivePreview.vue";
import { DEFAULT_SECTION_ORDER } from "~/utils/profile/sectionConfig";

// Mirrors the real draft ProfileSetup.vue seeds from a freshly-loaded
// profile: section_config empty (new profile default) + all show_* flags
// true (DB default), so resolveSections()'s backfill kicks in and every
// section is visible.
function makeRepresentativeDraft(overrides: Record<string, unknown> = {}) {
  return {
    section_config: [],
    show_metrics: true,
    show_athletic: true,
    show_film: true,
    show_academics: true,
    show_schools: true,
    bio: "x",
    header_color: "slate",
    awards: [{ title: "All-Conference", year: 2025 }],
    ...overrides,
  };
}

describe("ProfileLivePreview", () => {
  it("renders athletic, film, and academics sections by default, matching the public page's DB defaults", () => {
    const details = {
      primary_sport: "Baseball",
      primary_position: "SS",
      gpa: 3.8,
    };
    const w = mount(ProfileLivePreview, {
      props: { draft: makeRepresentativeDraft(), details } as never,
    });
    expect(w.text()).toContain("Baseball");
    expect(w.text()).toContain("3.80");
  });

  it("hides a section in the preview when its config visibility is false", () => {
    const draft = makeRepresentativeDraft({
      section_config: DEFAULT_SECTION_ORDER.map((key) => ({
        key,
        visible: key !== "awards",
      })),
    });
    const w = mount(ProfileLivePreview, {
      props: { draft, details: {} } as never,
    });
    expect(w.text()).not.toContain("All-Conference");
  });

  it("renders a visible section, proving the hidden case above is meaningful", () => {
    const draft = makeRepresentativeDraft({
      section_config: DEFAULT_SECTION_ORDER.map((key) => ({
        key,
        visible: true,
      })),
    });
    const w = mount(ProfileLivePreview, {
      props: { draft, details: {} } as never,
    });
    expect(w.text()).toContain("All-Conference");
  });

  it("hides the athletic section when show_athletic is toggled off", () => {
    const details = { primary_sport: "Baseball", primary_position: "SS" };
    const w = mount(ProfileLivePreview, {
      props: {
        draft: makeRepresentativeDraft({ show_athletic: false }),
        details,
      } as never,
    });
    expect(w.text()).not.toContain("Baseball");
  });
});
