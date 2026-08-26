import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SectionConfigEditor from "../../../../components/profile/setup/SectionConfigEditor.vue";
import { SECTION_META } from "~/utils/profile/sectionMeta";

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

  it("skips section keys not present in SECTION_META (normalizeSectionConfig-backfilled to all known keys)", () => {
    const w = mount(SectionConfigEditor, {
      props: { modelValue: [...sections, { key: "unknown_key", visible: true }] as never },
    });
    expect(w.text()).not.toMatch(/unknown_key/i);
    const toggles = w.findAll("[data-test='section-visibility']");
    expect(toggles).toHaveLength(Object.keys(SECTION_META).length);
  });

  it("preserves an unknown-keyed section unmodified when toggling a known section", async () => {
    const unknown = { key: "unknown_key", visible: true };
    const w = mount(SectionConfigEditor, {
      props: { modelValue: [...sections, unknown] as never },
    });
    const toggles = w.findAll("[data-test='section-visibility']");
    await toggles[1].trigger("click"); // flip awards
    const emitted = w.emitted("update:modelValue")?.[0]?.[0] as { key: string; visible: boolean }[];
    expect(emitted.find((s) => s.key === "unknown_key")).toEqual(unknown);
  });

  it("disables (not hides) the metrics toggle when showMetrics is false", () => {
    const w = mount(SectionConfigEditor, {
      props: { modelValue: sections as never, showMetrics: false },
    });
    const toggles = w.findAll("[data-test='section-visibility']");
    const metricsToggle = toggles.find((t) => t.attributes("aria-pressed") !== undefined && t.text().length > 0);
    expect(w.text()).toMatch(/metrics/i); // still rendered, not hidden
    expect(metricsToggle).toBeTruthy();
    expect(toggles[0].attributes("disabled")).toBeDefined();
  });
});
