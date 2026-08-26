import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileLivePreview from "~/components/profile/setup/ProfileLivePreview.vue";

describe("ProfileLivePreview", () => {
  it("hides a section in the preview when its config visibility is false", () => {
    const draft = {
      section_config: [{ key: "awards", visible: false }],
      show_academics: false,
      show_film: false,
      show_metrics: false,
      awards: [{ title: "All-Conference", year: 2025 }],
      bio: "x",
      header_color: "slate",
    };
    const w = mount(ProfileLivePreview, {
      props: { draft, details: {} } as never,
    });
    expect(w.text()).not.toContain("All-Conference");
  });

  it("renders a visible section, proving the hidden case above is meaningful", () => {
    const draft = {
      section_config: [{ key: "awards", visible: true }],
      show_academics: false,
      show_film: false,
      show_metrics: false,
      awards: [{ title: "All-Conference", year: 2025 }],
      bio: "x",
      header_color: "slate",
    };
    const w = mount(ProfileLivePreview, {
      props: { draft, details: {} } as never,
    });
    expect(w.text()).toContain("All-Conference");
  });
});
