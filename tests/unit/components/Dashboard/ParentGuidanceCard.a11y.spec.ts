import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import ParentGuidanceCard from "~/components/Dashboard/ParentGuidanceCard.vue";

const athlete = ref<any>({
  id: "athlete-1",
  current_phase: "junior",
  target_division: "d1",
});

vi.mock("~/composables/useAthleteProfile", () => ({
  useAthleteProfile: () => ({
    athlete,
    loading: ref(false),
    error: ref(null),
    fetchAthleteProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mountCard = () =>
  mount(ParentGuidanceCard, {
    props: { athleteId: "athlete-1" },
    global: { stubs: { Teleport: true, Transition: false } },
  });

describe("ParentGuidanceCard - accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gives every button a non-empty accessible name", async () => {
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();

    for (const button of wrapper.findAll("button")) {
      const name = button.attributes("aria-label") ?? button.text().trim();
      expect(name).not.toBe("");
    }
  });

  it("names the icon-only modal close button after the phase", async () => {
    const wrapper = mountCard();
    await wrapper.vm.$nextTick();

    const learnMore = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Learn"));
    await learnMore!.trigger("click");

    const labels = wrapper
      .findAll("button")
      .map((b) => b.attributes("aria-label"));

    expect(labels).toContain("Close Junior Year details");
  });
});
