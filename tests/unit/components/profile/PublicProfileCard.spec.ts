import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PublicProfileCard from "~/components/profile/PublicProfileCard.vue";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";

const baseData = {
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
  awards: [{ title: "All-Conference", year: 2025 }],
  academics: null,
  athletic: { primary_sport: "Baseball" },
  film: null,
  schools: null,
  social: null,
  metrics: [
    { key: "exit_velocity", label: "Exit Velocity", value: "91", unit: "mph", verified: true },
  ],
  teamHistory: [],
};

const dataAwardsHidden = {
  ...baseData,
  sections: [
    { key: "metrics", visible: true },
    { key: "awards", visible: false },
  ],
} as never;

const dataAwardsVisible = {
  ...baseData,
  sections: [
    { key: "metrics", visible: true },
    { key: "awards", visible: true },
  ],
} as never;

describe("PublicProfileCard", () => {
  it("hides a section marked visible:false, even with non-empty data", () => {
    const w = mount(PublicProfileCard, { props: { data: dataAwardsHidden } });
    expect(w.text()).toContain("Exit Velocity"); // metrics visible
    expect(w.text()).not.toContain("Awards & Honors");
    expect(w.text()).not.toContain("All-Conference");
  });

  it("renders a section marked visible:true, proving the hidden case is meaningful", () => {
    const w = mount(PublicProfileCard, { props: { data: dataAwardsVisible } });
    expect(w.text()).toContain("Awards & Honors");
    expect(w.text()).toContain("All-Conference");
  });

  it("always renders the hero and footer", () => {
    const w = mount(PublicProfileCard, { props: { data: dataAwardsHidden } });
    expect(w.text()).toContain("Owen A");
    expect(w.text()).toContain("Powered by");
  });

  it("bubbles hero contact/interest events", () => {
    const w = mount(PublicProfileCard, { props: { data: dataAwardsHidden } });
    const hero = w.findComponent(ProfileHero);
    hero.vm.$emit("contact");
    hero.vm.$emit("interest");
    expect(w.emitted("contact")).toBeTruthy();
    expect(w.emitted("interest")).toBeTruthy();
  });
});
