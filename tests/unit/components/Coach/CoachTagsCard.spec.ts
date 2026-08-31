import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachTagsCard from "~/components/Coach/detail/CoachTagsCard.vue";

describe("CoachTagsCard", () => {
  it("renders each tag as a chip", () => {
    const w = mount(CoachTagsCard, {
      props: { tags: ["Football", "Division I"] },
    });
    expect(w.text()).toContain("Football");
    expect(w.text()).toContain("Division I");
  });

  it("emits remove with the tag when its remove control is clicked", async () => {
    const w = mount(CoachTagsCard, { props: { tags: ["Football"] } });
    await w.get('[data-testid="remove-tag-Football"]').trigger("click");
    expect(w.emitted("remove")?.[0]).toEqual(["Football"]);
  });

  it("emits add with the typed tag on submit", async () => {
    const w = mount(CoachTagsCard, { props: { tags: [] } });
    await w.get('[data-testid="add-tag-input"]').setValue("Referral");
    await w.get('[data-testid="add-tag-input"]').trigger("keydown.enter");
    expect(w.emitted("add")?.[0]).toEqual(["Referral"]);
  });
});
