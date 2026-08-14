import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachCard from "./CoachCard.vue";
import type { Coach, School } from "~/types/models";

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};
const stubs = { NuxtLink: NuxtLinkStub, SchoolLogo: true, UIcon: true };

const baseCoach = {
  id: "c1",
  first_name: "Brady",
  last_name: "Cottom",
  role: "assistant",
  email: "bcottom@ashland.edu",
  phone: "419-289-5476",
  twitter_handle: "Brady_Cottom",
  instagram_handle: "brady.cottom",
  last_contact_date: "2026-08-03",
  school_id: "s1",
  notes: null,
} as unknown as Coach;

const school = { id: "s1", name: "Ashland University" } as unknown as School;

function mountCard(props: Record<string, unknown> = {}) {
  return mount(CoachCard, {
    props: { coach: baseCoach, ...props },
    global: { stubs },
  });
}

describe("CoachCard — layout & variants", () => {
  it("renders the coach name and role label", () => {
    const w = mountCard();
    expect(w.text()).toContain("Brady Cottom");
    expect(w.text()).toContain("Assistant Coach");
  });

  it("links the tile to the canonical detail route by default", () => {
    const w = mountCard();
    expect(w.get("a").attributes("href")).toBe("/coaches/c1");
  });

  it("honors an explicit detailTo override", () => {
    const w = mountCard({ detailTo: "/schools/s1/coaches/c1" });
    expect(w.get("a").attributes("href")).toBe("/schools/s1/coaches/c1");
  });

  it("shows school name + contact rows + last-contact in full variant with showSchoolMeta", () => {
    const w = mountCard({ variant: "full", showSchoolMeta: true, school });
    expect(w.text()).toContain("Ashland University");
    expect(w.text()).toContain("bcottom@ashland.edu");
    expect(w.text()).toContain("419-289-5476");
    expect(w.text()).toContain("Last contact");
  });

  it("hides school name, contact rows and last-contact in compact variant", () => {
    const w = mountCard({ variant: "compact" });
    expect(w.text()).not.toContain("Ashland University");
    expect(w.text()).not.toContain("bcottom@ashland.edu");
    expect(w.text()).not.toContain("Last contact");
  });

  it("renders no delete affordance in any variant", () => {
    const full = mountCard({ variant: "full" });
    const compact = mountCard({ variant: "compact" });
    expect(full.find('[data-testid="delete-coach"]').exists()).toBe(false);
    expect(compact.find('[data-testid="delete-coach"]').exists()).toBe(false);
  });
});
