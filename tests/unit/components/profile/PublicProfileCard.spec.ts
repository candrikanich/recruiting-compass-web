import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PublicProfileCard from "~/components/profile/PublicProfileCard.vue";
import ProfileHero from "~/components/profile/public/ProfileHero.vue";
import ContactPlayerModal from "~/components/profile/public/ContactPlayerModal.vue";

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
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsHidden, slug: "owen-a" },
    });
    expect(w.text()).toContain("Exit Velocity"); // metrics visible
    expect(w.text()).not.toContain("Awards & Honors");
    expect(w.text()).not.toContain("All-Conference");
  });

  it("renders a section marked visible:true, proving the hidden case is meaningful", () => {
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsVisible, slug: "owen-a" },
    });
    expect(w.text()).toContain("Awards & Honors");
    expect(w.text()).toContain("All-Conference");
  });

  it("always renders the hero and footer", () => {
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsHidden, slug: "owen-a" },
    });
    expect(w.text()).toContain("Owen A");
    expect(w.text()).toContain("Powered by");
  });

  it("bubbles hero contact/interest events", () => {
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsHidden, slug: "owen-a" },
    });
    const hero = w.findComponent(ProfileHero);
    hero.vm.$emit("contact");
    hero.vm.$emit("interest");
    expect(w.emitted("contact")).toBeTruthy();
    expect(w.emitted("interest")).toBeTruthy();
  });

  it("does not render the contact modal until the hero's contact button is clicked", () => {
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsHidden, slug: "owen-a" },
    });
    expect(w.find('[aria-labelledby="contact-player-title"]').exists()).toBe(
      false,
    );
  });

  it("opens the contact modal when Contact Player is clicked, and closes on close", async () => {
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsHidden, slug: "owen-a" },
    });
    const hero = w.findComponent(ProfileHero);
    await hero.vm.$emit("contact");

    const dialog = w.find('[aria-labelledby="contact-player-title"]');
    expect(dialog.exists()).toBe(true);
    expect(w.text()).toContain("Contact Owen A");

    await dialog.find('[data-test="modal-close"]').trigger("click");
    expect(w.find('[aria-labelledby="contact-player-title"]').exists()).toBe(
      false,
    );
  });

  it("stays mounted (showing its confirmation) when the modal emits submitted, and only unmounts on close", async () => {
    const w = mount(PublicProfileCard, {
      props: { data: dataAwardsHidden, slug: "owen-a" },
    });
    const hero = w.findComponent(ProfileHero);
    await hero.vm.$emit("contact");

    const modal = w.findComponent(ContactPlayerModal);
    expect(modal.exists()).toBe(true);

    // Real usage: ContactPlayerModal sets its own submitted state AND emits
    // "submitted" in the same tick — the modal must NOT unmount here, or its
    // confirmation screen never gets a chance to render.
    await modal.vm.$emit("submitted");
    expect(w.findComponent(ContactPlayerModal).exists()).toBe(true);

    await modal.vm.$emit("close");
    expect(w.findComponent(ContactPlayerModal).exists()).toBe(false);
  });
});
