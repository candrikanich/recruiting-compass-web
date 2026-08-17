import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CoachCard from "~/components/Coach/CoachCard.vue";
import { openTwitter } from "~/utils/socialMediaHandlers";
import type { Coach, School } from "~/types/models";

vi.mock("~/utils/socialMediaHandlers", () => ({
  openTwitter: vi.fn(),
  openInstagram: vi.fn(),
}));

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

const actionStubs = { NuxtLink: NuxtLinkStub, SchoolLogo: true, UIcon: true };

describe("CoachCard — action row", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  it("renders all five actions in fixed order when all data present", () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach },
      global: { stubs: actionStubs },
    });
    const labels = w
      .findAll("[data-action]")
      .map((n) => n.attributes("data-action"));
    expect(labels).toEqual(["email", "text", "call", "twitter", "instagram"]);
  });

  it("omits an action when its data field is missing, preserving order", () => {
    const coach = {
      ...baseCoach,
      phone: null,
      twitter_handle: null,
    } as unknown as Coach;
    const w = mount(CoachCard, {
      props: { coach },
      global: { stubs: actionStubs },
    });
    const labels = w
      .findAll("[data-action]")
      .map((n) => n.attributes("data-action"));
    expect(labels).toEqual(["email", "instagram"]);
  });

  it("emits open-communication with coach id on Email click in modal mode", async () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach, contactMode: "modal" },
      global: { stubs: actionStubs },
    });
    await w.get('[data-action="email"]').trigger("click");
    expect(w.emitted("open-communication")?.[0]).toEqual(["c1"]);
  });

  it("sets a mailto href on window.location (no emit) on Email in native mode", async () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach, contactMode: "native" },
      global: { stubs: actionStubs },
    });
    await w.get('[data-action="email"]').trigger("click");
    expect(window.location.href).toBe("mailto:bcottom@ashland.edu");
    expect(w.emitted("open-communication")).toBeUndefined();
  });

  it("opens Twitter via the social handler without navigating", async () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach },
      global: { stubs: actionStubs },
    });
    await w.get('[data-action="twitter"]').trigger("click");
    expect(openTwitter).toHaveBeenCalledWith("Brady_Cottom");
  });
});

describe("CoachCard — back-context query", () => {
  it("appends encoded back + label query when backTo is provided", () => {
    const w = mountCard({
      backTo: "/schools/s1/coaches",
      backLabel: "Coaches",
    });
    expect(w.get("a").attributes("href")).toBe(
      "/coaches/c1?back=%2Fschools%2Fs1%2Fcoaches&label=Coaches",
    );
  });

  it("omits the label param when only backTo is given", () => {
    const w = mountCard({ backTo: "/coaches" });
    expect(w.get("a").attributes("href")).toBe("/coaches/c1?back=%2Fcoaches");
  });

  it("uses the plain detail route when no backTo is provided", () => {
    const w = mountCard();
    expect(w.get("a").attributes("href")).toBe("/coaches/c1");
  });

  it("lets an explicit detailTo override win over backTo", () => {
    const w = mountCard({ detailTo: "/custom", backTo: "/coaches" });
    expect(w.get("a").attributes("href")).toBe("/custom");
  });

  it("encodes a multi-word label with %20 (not +) so it round-trips through the router", () => {
    const w = mountCard({ backTo: "/coaches", backLabel: "All Coaches" });
    expect(w.get("a").attributes("href")).toBe(
      "/coaches/c1?back=%2Fcoaches&label=All%20Coaches",
    );
  });
});
