import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DetailCard from "~/components/Interaction/DetailCard.vue";

describe("DetailCard", () => {
  it("renders label and value correctly", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "School",
        value: "University of Test",
      },
    });

    expect(wrapper.find("h3").text()).toBe("School");
    expect(wrapper.find("p").text()).toBe("University of Test");
  });

  it("shows em dash when value is null", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Coach",
        value: null,
      },
    });

    expect(wrapper.find("p").text()).toBe("—");
  });

  it("shows em dash when value is undefined", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Event",
        value: undefined,
      },
    });

    expect(wrapper.find("p").text()).toBe("—");
  });

  it("renders link when linkTo is provided", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "School",
        value: "University of Test",
        linkTo: "/schools/123",
      },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("to")).toBe("/schools/123");
    expect(link.classes()).toContain("text-blue-600");
    expect(link.classes()).toContain("hover:underline");
  });

  it("renders plain text when linkTo is undefined", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "School",
        value: "University of Test",
        linkTo: undefined,
      },
    });

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find("span").text()).toBe("University of Test");
  });

  it("applies correct CSS classes to container", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Test",
        value: "Value",
      },
    });

    const container = wrapper.find("div");
    expect(container.classes()).toContain("bg-white");
    expect(container.classes()).toContain("rounded-lg");
    expect(container.classes()).toContain("shadow");
    expect(container.classes()).toContain("p-4");
  });

  it("applies correct CSS classes to label", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Test Label",
        value: "Test Value",
      },
    });

    const label = wrapper.find("h3");
    expect(label.classes()).toContain("font-semibold");
    expect(label.classes()).toContain("text-gray-900");
    expect(label.classes()).toContain("mb-2");
  });

  it("applies correct CSS classes to value paragraph", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Test",
        value: "Value",
      },
    });

    const value = wrapper.find("p");
    expect(value.classes()).toContain("text-gray-700");
  });

  it("applies correct CSS classes to null value paragraph", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Test",
        value: null,
      },
    });

    const value = wrapper.find("p");
    expect(value.classes()).toContain("text-gray-500");
  });

  it("handles empty string value", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Test",
        value: "",
      },
    });

    // Empty string should show em dash
    expect(wrapper.find("p").text()).toBe("—");
  });

  it("renders long values without truncation", () => {
    const longValue = "A".repeat(200);
    const wrapper = mount(DetailCard, {
      props: {
        label: "Description",
        value: longValue,
      },
    });

    expect(wrapper.find("span").text()).toBe(longValue);
  });

  it("renders special characters in value correctly", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Special",
        value: "Test & <script>alert('xss')</script>",
      },
    });

    // Vue should escape HTML by default
    expect(wrapper.find("span").text()).toContain("&");
    expect(wrapper.find("span").text()).toContain("<script>");
  });

  it("handles both value and linkTo being provided", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Coach",
        value: "John Doe",
        linkTo: "/coaches/456",
      },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("John Doe");
    expect(link.attributes("to")).toBe("/coaches/456");

    // Should not have span when link is present
    expect(wrapper.find("span").exists()).toBe(false);
  });

  it("does not render link when value is null even if linkTo provided", () => {
    const wrapper = mount(DetailCard, {
      props: {
        label: "Coach",
        value: null,
        linkTo: "/coaches/456",
      },
    });

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find("p").text()).toBe("—");
  });
});
