import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SchoolRecruitingStatusSection from "~/components/School/SchoolRecruitingStatusSection.vue";

const mountSection = (
  props: Partial<{ status: string; statusUpdating: boolean }> = {},
) =>
  mount(SchoolRecruitingStatusSection, {
    props: { status: "researching", statusUpdating: false, ...props },
    global: { stubs: { UIcon: true } },
  });

describe("SchoolRecruitingStatusSection", () => {
  it("renders the 'Recruiting Status' heading", () => {
    expect(mountSection().text()).toContain("Recruiting Status");
  });

  it("renders the 5-node progress stepper (not a dropdown)", () => {
    const wrapper = mountSection();
    expect(wrapper.find("select").exists()).toBe(false);
    expect(wrapper.findAll("ol button")).toHaveLength(5);
  });

  it("re-emits update:status when a stepper node is chosen", async () => {
    const wrapper = mountSection();
    await wrapper.findAll("ol button")[1].trigger("click");
    expect(wrapper.emitted("update:status")?.[0]).toEqual(["contacted"]);
  });

  it("shows a spinner and disables nodes while updating", () => {
    const wrapper = mountSection({ statusUpdating: true });
    expect(wrapper.find("[role='status']").exists()).toBe(true);
    const buttons = wrapper.findAll("ol button");
    expect(buttons.every((b) => b.attributes("disabled") !== undefined)).toBe(
      true,
    );
  });
});
