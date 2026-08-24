import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

const isPublished = ref(false);
const publicUrl = ref<string | null>(null);

vi.mock("~/composables/usePlayerProfile", () => ({
  usePlayerProfile: () => ({ isPublished, publicUrl }),
}));

import PublicProfileLinkCard from "~/components/Dashboard/PublicProfileLinkCard.vue";

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

function mountCard() {
  return mount(PublicProfileLinkCard, {
    global: { stubs: { NuxtLink: NuxtLinkStub } },
  });
}

describe("PublicProfileLinkCard", () => {
  beforeEach(() => {
    isPublished.value = false;
    publicUrl.value = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when the profile is not published", () => {
    it("shows the setup nudge, not a link", () => {
      const wrapper = mountCard();
      expect(wrapper.text()).toContain("Set up public profile");
      expect(
        wrapper.find('[data-testid="public-profile-url"]').exists(),
      ).toBe(false);
    });

    it("links the nudge to the public-profile settings tab", () => {
      const wrapper = mountCard();
      const link = wrapper.find("a");
      expect(link.attributes("href")).toBe(
        "/settings/player-details?tab=public-profile",
      );
    });
  });

  describe("when the profile is published", () => {
    beforeEach(() => {
      isPublished.value = true;
      publicUrl.value = "https://app.example.com/p/jane-doe";
    });

    it("renders the shareable URL", () => {
      const wrapper = mountCard();
      expect(wrapper.find('[data-testid="public-profile-url"]').text()).toBe(
        "https://app.example.com/p/jane-doe",
      );
    });

    it("writes the absolute URL to the clipboard on copy", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      const wrapper = mountCard();
      await wrapper.find('[data-testid="copy-public-profile-link"]').trigger("click");

      expect(writeText).toHaveBeenCalledWith(
        "https://app.example.com/p/jane-doe",
      );
    });

    it("previews via the relative profile path", () => {
      const wrapper = mountCard();
      const previewLink = wrapper
        .findAll("a")
        .find((a) => a.text().includes("Preview"));
      expect(previewLink?.attributes("href")).toBe("/p/jane-doe");
    });
  });
});
