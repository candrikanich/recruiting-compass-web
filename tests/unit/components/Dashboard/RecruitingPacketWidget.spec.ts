import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RecruitingPacketWidget from "~/components/Dashboard/RecruitingPacketWidget.vue";

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

const mountWidget = (
  props: {
    recruitingPacketLoading?: boolean;
    recruitingPacketError?: string | null;
  } = {},
) =>
  mount(RecruitingPacketWidget, {
    props: {
      recruitingPacketLoading: props.recruitingPacketLoading ?? false,
      recruitingPacketError: props.recruitingPacketError ?? null,
    },
    global: {
      stubs: { NuxtLink: NuxtLinkStub },
    },
  });

describe("RecruitingPacketWidget", () => {
  describe("rendering", () => {
    it("renders widget with title", () => {
      const wrapper = mountWidget();
      expect(wrapper.text()).toContain("Recruiting Packet");
    });

    it("shows Generate Packet button text in default state", () => {
      const wrapper = mountWidget();
      expect(wrapper.text()).toContain("Generate Packet");
    });

    it("shows Generating... text when loading", () => {
      const wrapper = mountWidget({ recruitingPacketLoading: true });
      expect(wrapper.text()).toContain("Generating...");
    });

    it("shows a Share with a coach link to /coaches", () => {
      const wrapper = mountWidget();
      const link = wrapper
        .findAll("a")
        .find((a) => a.text().includes("Share with a coach"));

      expect(link).toBeTruthy();
      expect(link!.attributes("href")).toBe("/coaches");
    });
  });

  describe("button disabled states", () => {
    it("enables generate button when not loading", () => {
      const wrapper = mountWidget({ recruitingPacketLoading: false });
      const generateButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Generate Packet"));

      expect(generateButton!.attributes("disabled")).toBeUndefined();
    });

    it("disables generate button when loading", () => {
      const wrapper = mountWidget({ recruitingPacketLoading: true });
      const generateButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Generating..."));

      expect(generateButton!.attributes("disabled")).toBeDefined();
    });
  });

  describe("loading spinner vs icon", () => {
    it("shows static icon when not loading", () => {
      const wrapper = mountWidget({ recruitingPacketLoading: false });
      const spinners = wrapper.findAll("svg.animate-spin");

      expect(spinners).toHaveLength(0);
    });

    it("shows spinning loader when loading", () => {
      const wrapper = mountWidget({ recruitingPacketLoading: true });
      const spinner = wrapper.find("svg.animate-spin");

      expect(spinner.exists()).toBe(true);
    });
  });

  describe("event emissions", () => {
    it("emits generate-packet when clicking generate button", async () => {
      const wrapper = mountWidget();
      const generateButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Generate Packet"));
      await generateButton!.trigger("click");

      expect(wrapper.emitted("generate-packet")).toBeTruthy();
    });
  });

  describe("error message display", () => {
    it("does not show error when recruitingPacketError is null", () => {
      const wrapper = mountWidget({ recruitingPacketError: null });
      const errorDiv = wrapper.find(".bg-red-50");

      expect(errorDiv.exists()).toBe(false);
    });

    it("displays error message when recruitingPacketError is set", () => {
      const wrapper = mountWidget({
        recruitingPacketError: "Failed to generate packet",
      });

      expect(wrapper.text()).toContain("Failed to generate packet");
      expect(wrapper.find(".bg-red-50").exists()).toBe(true);
    });
  });
});
