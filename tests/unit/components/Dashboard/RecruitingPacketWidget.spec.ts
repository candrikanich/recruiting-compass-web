import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RecruitingPacketWidget from "~/components/Dashboard/RecruitingPacketWidget.vue";

const mountWidget = (
  props: {
    recruitingPacketLoading?: boolean;
    recruitingPacketError?: string | null;
    hasGeneratedPacket?: boolean;
  } = {},
) =>
  mount(RecruitingPacketWidget, {
    props: {
      recruitingPacketLoading: props.recruitingPacketLoading ?? false,
      recruitingPacketError: props.recruitingPacketError ?? null,
      hasGeneratedPacket: props.hasGeneratedPacket ?? false,
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

    it("shows Email to Coach button", () => {
      const wrapper = mountWidget();
      expect(wrapper.text()).toContain("Email to Coach");
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

    it("disables email button when no packet has been generated", () => {
      const wrapper = mountWidget({ hasGeneratedPacket: false });
      const emailButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Email to Coach"));

      expect(emailButton!.attributes("disabled")).toBeDefined();
    });

    it("enables email button when packet has been generated and not loading", () => {
      const wrapper = mountWidget({
        hasGeneratedPacket: true,
        recruitingPacketLoading: false,
      });
      const emailButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Email to Coach"));

      expect(emailButton!.attributes("disabled")).toBeUndefined();
    });

    it("disables email button when loading even if packet exists", () => {
      const wrapper = mountWidget({
        hasGeneratedPacket: true,
        recruitingPacketLoading: true,
      });
      const emailButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Email to Coach"));

      expect(emailButton!.attributes("disabled")).toBeDefined();
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

    it("emits email-packet when clicking email button", async () => {
      const wrapper = mountWidget({
        hasGeneratedPacket: true,
        recruitingPacketLoading: false,
      });
      const emailButton = wrapper
        .findAll("button")
        .find((b) => b.text().includes("Email to Coach"));
      await emailButton!.trigger("click");

      expect(wrapper.emitted("email-packet")).toBeTruthy();
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
