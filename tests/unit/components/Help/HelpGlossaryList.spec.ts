import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpGlossaryList from "~/components/Help/HelpGlossaryList.vue";

const terms = [
  { id: "official-visit", term: "Official Visit", definition: "..." },
  { id: "walk-on", term: "Walk-On", definition: "..." },
];

describe("HelpGlossaryList", () => {
  it("groups terms under a letter heading", () => {
    const wrapper = mount(HelpGlossaryList, { props: { terms } });
    expect(wrapper.text()).toContain("O");
    expect(wrapper.text()).toContain("Official Visit");
    expect(wrapper.text()).toContain("W");
    expect(wrapper.text()).toContain("Walk-On");
  });
});
