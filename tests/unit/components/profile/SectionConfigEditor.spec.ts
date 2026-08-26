import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SectionConfigEditor from "../../../../components/profile/setup/SectionConfigEditor.vue";

const sections = [
  { key: "metrics", visible: true },
  { key: "awards", visible: false },
];

describe("SectionConfigEditor", () => {
  it("renders a row per section with a visibility toggle and emits on toggle", async () => {
    const w = mount(SectionConfigEditor, { props: { modelValue: sections as never } });
    expect(w.text()).toMatch(/metrics/i);
    expect(w.text()).toMatch(/awards/i);
    const toggles = w.findAll("[data-test='section-visibility']");
    await toggles[1].trigger("click"); // flip awards
    const emitted = w.emitted("update:modelValue")?.[0]?.[0] as { key: string; visible: boolean }[];
    expect(emitted.find((s) => s.key === "awards")?.visible).toBe(true);
  });

  it("skips section keys not present in SECTION_META", () => {
    const w = mount(SectionConfigEditor, {
      props: { modelValue: [...sections, { key: "unknown_key", visible: true }] as never },
    });
    const toggles = w.findAll("[data-test='section-visibility']");
    expect(toggles).toHaveLength(2);
  });
});
