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

  it("renders all 6 canonical options in the dropdown", () => {
    const options = mountSection().find("select").findAll("option");
    expect(options).toHaveLength(6);
    expect(options[0].text()).toBe("Researching");
    expect(options.at(-1)?.text()).toBe("Not Pursuing");
  });

  it("selects the current status", () => {
    const select = mountSection({ status: "committed" }).find("select");
    expect((select.element as HTMLSelectElement).value).toBe("committed");
  });

  it("emits update:status with the chosen value", async () => {
    const wrapper = mountSection();
    await wrapper.find("select").setValue("offer_received");
    expect(wrapper.emitted("update:status")?.[0]).toEqual(["offer_received"]);
  });

  it("disables the select while updating", () => {
    const select = mountSection({ statusUpdating: true }).find("select");
    expect((select.element as HTMLSelectElement).disabled).toBe(true);
  });

  it("does not render a separate status badge (header pill owns that)", () => {
    const wrapper = mountSection({ status: "committed" });
    // only occurrence of the label is the selected <option>, no badge pill
    const badge = wrapper.find("span.rounded-full");
    expect(badge.exists()).toBe(false);
  });
});
