import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpFaqAccordion from "~/components/Help/HelpFaqAccordion.vue";

const entries = [
  { id: "q1", category: "general", question: "Q1?", answer: "A1" },
  { id: "q2", category: "general", question: "Q2?", answer: "A2" },
];

describe("HelpFaqAccordion", () => {
  it("hides answers until their question is clicked", async () => {
    const wrapper = mount(HelpFaqAccordion, { props: { entries } });
    expect(wrapper.text()).not.toContain("A1");
    await wrapper.find('[data-testid="faq-question-q1"]').trigger("click");
    expect(wrapper.text()).toContain("A1");
  });

  it("collapses the previously open entry when a new one opens", async () => {
    const wrapper = mount(HelpFaqAccordion, { props: { entries } });
    await wrapper.find('[data-testid="faq-question-q1"]').trigger("click");
    await wrapper.find('[data-testid="faq-question-q2"]').trigger("click");
    expect(wrapper.text()).not.toContain("A1");
    expect(wrapper.text()).toContain("A2");
  });
});
