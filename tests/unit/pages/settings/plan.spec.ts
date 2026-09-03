import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";

const planLabel = ref("Founding Family — free for life");
const load = vi.fn(() => Promise.resolve());

vi.mock("~/composables/useEntitlement", () => ({
  useEntitlement: vi.fn(() => ({
    subscription: ref({ status: "founding" }),
    loading: ref(false),
    error: ref(null),
    canWrite: computed(() => true),
    planLabel: computed(() => planLabel.value),
    trialDaysLeft: computed(() => null),
    load,
  })),
}));

vi.mock("#app", () => ({ definePageMeta: vi.fn() }));

import PlanPage from "~/pages/settings/plan.vue";

describe("settings/plan", () => {
  it("renders the plan label and loads on mount", async () => {
    const wrapper = mount(PlanPage, {
      global: { stubs: { NuxtLink: { template: "<a><slot /></a>" }, UIcon: true } },
    });
    await Promise.resolve();
    expect(load).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Founding Family — free for life");
    expect(wrapper.text()).toContain("whole family");
  });
});
