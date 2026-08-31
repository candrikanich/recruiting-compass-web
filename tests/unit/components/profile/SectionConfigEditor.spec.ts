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
    const w = mount(SectionConfigEditor, {
      props: { modelValue: sections as never },
    });
    expect(w.text()).toMatch(/metrics/i);
    expect(w.text()).toMatch(/awards/i);
    const toggles = w.findAll("[data-test='section-visibility']");
    await toggles[1].trigger("click"); // flip awards
    const emitted = w.emitted("update:modelValue")?.[0]?.[0] as {
      key: string;
      visible: boolean;
    }[];
    expect(emitted.find((s) => s.key === "awards")?.visible).toBe(true);
  });

  it("skips section keys not present in SECTION_META (normalizeSectionConfig-backfilled to all known keys)", () => {
    const w = mount(SectionConfigEditor, {
      props: {
        modelValue: [
          ...sections,
          { key: "unknown_key", visible: true },
        ] as never,
      },
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
    const emitted = w.emitted("update:modelValue")?.[0]?.[0] as {
      key: string;
      visible: boolean;
    }[];
    expect(emitted.find((s) => s.key === "unknown_key")).toEqual(unknown);
  });

  it("lets the metrics toggle flip like any other section (no special disable)", async () => {
    const w = mount(SectionConfigEditor, {
      props: { modelValue: sections as never },
    });
    const toggles = w.findAll("[data-test='section-visibility']");
    // metrics is the first known section (DEFAULT_SECTION_ORDER[0])
    expect(toggles[0].attributes("disabled")).toBeUndefined();
    await toggles[0].trigger("click");
    const emitted = w.emitted("update:modelValue")?.[0]?.[0] as {
      key: string;
      visible: boolean;
    }[];
    const metrics = emitted.find((s) => s.key === "metrics");
    expect(metrics).toBeTruthy();
    expect(metrics!.visible).toBe(false); // flipped from the fixture's visible → hidden
  });
});
