import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import EditMetricModal from "~/components/Performance/EditMetricModal.vue";
import type { PerformanceMetric } from "~/types/models";

const baseMetric = {
  id: "m1",
  metric_type: "velo",
  value: 88,
  recorded_date: "2026-01-05",
  unit: "mph",
  verified: false,
  notes: "",
} as PerformanceMetric;

const options = [
  { value: "velo", label: "Velocity (mph)" },
  { value: "sprint", label: "60-yard (sec)" },
];

const stubs = { UIcon: true };

function mountModal(overrides: Record<string, unknown> = {}) {
  return mount(EditMetricModal, {
    props: {
      show: true,
      metric: { ...baseMetric },
      metricTypeOptions: options,
      isUpdating: false,
      ...overrides,
    },
    global: { stubs },
  });
}

describe("EditMetricModal", () => {
  it("renders nothing when show is false", () => {
    const wrapper = mountModal({ show: false });
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("renders nothing when metric is null", () => {
    const wrapper = mountModal({ metric: null });
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("populates fields from the bound metric", () => {
    const wrapper = mountModal();
    expect(
      (wrapper.find("#editValue").element as HTMLInputElement).value,
    ).toBe("88");
    expect(
      (wrapper.find("#editMetricType").element as HTMLSelectElement).value,
    ).toBe("velo");
    expect(
      (wrapper.find("#editUnit").element as HTMLInputElement).value,
    ).toBe("mph");
  });

  it("lists every metric-type option", () => {
    const wrapper = mountModal();
    const optionTexts = wrapper
      .findAll("#editMetricType option")
      .map((o) => o.text());
    expect(optionTexts).toContain("Velocity (mph)");
    expect(optionTexts).toContain("60-yard (sec)");
  });

  it("emits save on form submit", async () => {
    const wrapper = mountModal();
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("save")).toHaveLength(1);
  });

  it("emits close on Cancel", async () => {
    const wrapper = mountModal();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Cancel")!
      .trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("edits mutate the bound metric object in place (shared draft)", async () => {
    // The parent clones the row before opening, so the modal edits that draft
    // object directly — the value reflects without a full model reassignment.
    const draft = { ...baseMetric };
    const wrapper = mount(EditMetricModal, {
      props: {
        show: true,
        metric: draft,
        metricTypeOptions: options,
        isUpdating: false,
      },
      global: { stubs },
    });
    await wrapper.find("#editValue").setValue("92");
    expect(draft.value).toBe(92);
  });

  it("disables the save button while updating", () => {
    const wrapper = mountModal({ isUpdating: true });
    const save = wrapper
      .findAll("button")
      .find((b) => b.text() === "Saving...");
    expect(save?.attributes("disabled")).toBeDefined();
  });
});
