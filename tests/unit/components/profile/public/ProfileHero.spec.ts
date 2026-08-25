import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";

describe("ProfileHero", () => {
  it("emits contact and interest on button clicks", async () => {
    const w = mount(ProfileHero, {
      props: {
        data: {
          playerName: "Owen A",
          photoUrl: null,
          headerColor: "slate",
          bannerUrl: null,
          jerseyNumber: 7,
          commitmentStatus: "uncommitted",
          committedSchoolName: null,
          bio: "x",
          athletic: { primary_sport: "Baseball" },
        } as never,
      },
    });
    const btns = w.findAll("button");
    await btns[0].trigger("click");
    await btns[1].trigger("click");
    expect(w.emitted().contact).toBeTruthy();
    expect(w.emitted().interest).toBeTruthy();
  });
});
