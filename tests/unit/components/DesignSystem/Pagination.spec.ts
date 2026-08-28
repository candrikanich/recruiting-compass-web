import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Pagination from "~/components/DesignSystem/Pagination.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("DesignSystemPagination", () => {
  it("hides when there is only one page", () => {
    const wrapper = mount(Pagination, { props: { page: 1, totalPages: 1 } });
    expect(wrapper.find("nav").exists()).toBe(false);
  });

  it("hides when totalPages is zero", () => {
    const wrapper = mount(Pagination, { props: { page: 1, totalPages: 0 } });
    expect(wrapper.find("nav").exists()).toBe(false);
  });

  it("renders previous/next and marks the current page", () => {
    const wrapper = mount(Pagination, { props: { page: 2, totalPages: 4 } });
    expect(wrapper.get("nav").attributes("aria-label")).toBe("Pagination");
    expect(wrapper.text()).toContain("Previous");
    expect(wrapper.text()).toContain("Next");
    expect(wrapper.get('[aria-current="page"]').text()).toBe("2");
  });

  it("disables previous on the first page and next on the last", () => {
    const first = mount(Pagination, { props: { page: 1, totalPages: 3 } });
    expect(first.get('[aria-label="Previous page"]').attributes("disabled")).toBeDefined();
    expect(first.get('[aria-label="Next page"]').attributes("disabled")).toBeUndefined();

    const last = mount(Pagination, { props: { page: 3, totalPages: 3 } });
    expect(last.get('[aria-label="Next page"]').attributes("disabled")).toBeDefined();
  });

  it("emits the next page and ignores clicks past the ends", async () => {
    const wrapper = mount(Pagination, { props: { page: 1, totalPages: 3 } });
    await wrapper.get('[aria-label="Previous page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toBeUndefined();

    await wrapper.get('[aria-label="Next page"]').trigger("click");
    expect(wrapper.emitted("update:page")?.[0]).toEqual([2]);
  });

  it("does not emit while disabled", async () => {
    const wrapper = mount(Pagination, {
      props: { page: 2, totalPages: 4, disabled: true },
    });
    await wrapper.get('[aria-label="Next page"]').trigger("click");
    expect(wrapper.emitted("update:page")).toBeUndefined();
  });

  it("has no axe violations", async () => {
    const wrapper = mount(Pagination, { props: { page: 2, totalPages: 5 } });
    expect(await axe(wrapper.element, AXE_OPTIONS)).toHaveNoViolations();
  });
});
