import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PublicProfileCard from "~/components/profile/PublicProfileCard.vue";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";

const data = {
  playerName: "Owen A",
  photoUrl: null,
  headerColor: "slate",
  bannerUrl: null,
  jerseyNumber: 7,
  commitmentStatus: "uncommitted",
  committedSchoolName: null,
  bio: "x",
  lookingFor: "D1",
  valuesTags: ["Academics"],
  awards: [],
  academics: null,
  athletic: { primary_sport: "Baseball" },
  film: null,
  schools: null,
  social: null,
  metrics: [
    { key: "exit_velocity", label: "Exit Velocity", value: "91", unit: "mph", verified: true },
  ],
  teamHistory: [],
  sections: [
    { key: "metrics", visible: true },
    { key: "awards", visible: false },
  ],
} as never;

describe("PublicProfileCard", () => {
  it("renders visible sections and hides hidden ones", () => {
    const w = mount(PublicProfileCard, { props: { data } });
    expect(w.text()).toContain("Exit Velocity"); // metrics visible
    expect(w.text()).not.toContain("Awards & Athletic Honors"); // awards hidden
  });

  it("always renders the hero and footer", () => {
    const w = mount(PublicProfileCard, { props: { data } });
    expect(w.text()).toContain("Owen A");
    expect(w.text()).toContain("Powered by");
  });

  it("bubbles hero contact/interest events", () => {
    const w = mount(PublicProfileCard, { props: { data } });
    const hero = w.findComponent(ProfileHero);
    hero.vm.$emit("contact");
    hero.vm.$emit("interest");
    expect(w.emitted("contact")).toBeTruthy();
    expect(w.emitted("interest")).toBeTruthy();
  });
});
