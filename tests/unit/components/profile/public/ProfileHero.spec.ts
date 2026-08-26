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

  it("renders the social links row when social handles are present", () => {
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
          social: { twitter_handle: "owenA", instagram_handle: "owen.a" },
        } as never,
      },
    });
    expect(w.text()).toContain("@owenA");
    expect(w.text()).toContain("@owen.a");
  });

  it("labels the interest button 'Express Interest' and emits interest when not yet sent", async () => {
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
    const btn = w.findAll("button")[1];
    expect(btn.text()).toBe("Express Interest");
    expect(btn.attributes("disabled")).toBeUndefined();
    await btn.trigger("click");
    expect(w.emitted().interest).toBeTruthy();
  });

  it("shows a disabled 'Interest Sent' button and does not emit interest when interestSent is true", async () => {
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
        interestSent: true,
      },
    });
    const btn = w.findAll("button")[1];
    expect(btn.text()).toBe("Interest Sent");
    expect(btn.attributes("disabled")).toBeDefined();
  });

  it("renders no social row when social is absent", () => {
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
          social: null,
        } as never,
      },
    });
    expect(w.text()).not.toContain("@");
  });
});
