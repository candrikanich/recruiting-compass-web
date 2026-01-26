import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardStatsCards from "~/components/Dashboard/DashboardStatsCards.vue";

describe("DashboardStatsCards", () => {
  const defaultProps = {
    coachCount: 10,
    schoolCount: 15,
    interactionCount: 42,
    totalOffers: 5,
    acceptedOffers: 2,
    aTierSchoolCount: 3,
    contactsThisMonth: 18,
  };

  it("renders all 6 stat cards", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain("Coaches");
    expect(wrapper.text()).toContain("Schools");
    expect(wrapper.text()).toContain("Interactions");
    expect(wrapper.text()).toContain("Offers");
    expect(wrapper.text()).toContain("A-tier");
    expect(wrapper.text()).toContain("Contacts");
  });

  it("displays correct counts for each stat", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain("10");
    expect(wrapper.text()).toContain("15");
    expect(wrapper.text()).toContain("42");
    expect(wrapper.text()).toContain("2/5");
    expect(wrapper.text()).toContain("3");
    expect(wrapper.text()).toContain("18");
  });

  it("renders A-tier card with correct data-testid", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
    });

    const aTierCard = wrapper.find('[data-testid="stat-card-a-tier"]');
    expect(aTierCard.exists()).toBe(true);
    expect(aTierCard.text()).toContain("A-tier");
    expect(aTierCard.text()).toContain("Priority schools");
  });

  it("renders monthly contacts card with correct data-testid", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
    });

    const contactsCard = wrapper.find('[data-testid="stat-card-monthly-contacts"]');
    expect(contactsCard.exists()).toBe(true);
    expect(contactsCard.text()).toContain("Contacts");
    expect(contactsCard.text()).toContain("This month");
  });

  it("hides coaches card when showCoaches is false", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, showCoaches: false },
    });

    expect(wrapper.text()).not.toContain("Coaches");
  });

  it("hides schools card when showSchools is false", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, showSchools: false },
    });

    expect(wrapper.text()).toContain("Coaches");
    expect(wrapper.text()).not.toContain("Schools");
  });

  it("hides interactions card when showInteractions is false", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, showInteractions: false },
    });

    expect(wrapper.text()).toContain("Coaches");
    expect(wrapper.text()).not.toContain("Interactions");
  });

  it("hides offers card when showOffers is false", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, showOffers: false },
    });

    expect(wrapper.text()).toContain("Coaches");
    expect(wrapper.text()).not.toContain("Offers");
  });

  it("hides A-tier card when showATier is false", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, showATier: false },
    });

    expect(wrapper.text()).not.toContain("A-tier");
  });

  it("hides monthly contacts card when showMonthlyContacts is false", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, showMonthlyContacts: false },
    });

    expect(wrapper.text()).toContain("Interactions");
    expect(wrapper.text()).not.toContain("Contacts");
  });

  it("links coaches card to /coaches", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
      global: {
        stubs: {
          NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
        },
      },
    });

    const coachesLink = wrapper.findAll("a").find((el) => el.text().includes("Coaches"));
    expect(coachesLink?.attributes("href")).toBe("/coaches");
  });

  it("links schools card to /schools", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
      global: {
        stubs: {
          NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
        },
      },
    });

    const schoolsLink = wrapper.findAll("a").find((el) => el.text().includes("Schools"));
    expect(schoolsLink?.attributes("href")).toBe("/schools");
  });

  it("links interactions card to /interactions", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
      global: {
        stubs: {
          NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
        },
      },
    });

    const interactionsLink = wrapper.findAll("a").find((el) => el.text().includes("Interactions"));
    expect(interactionsLink?.attributes("href")).toBe("/interactions");
  });

  it("links offers card to /offers", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
      global: {
        stubs: {
          NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
        },
      },
    });

    const offersLink = wrapper.findAll("a").find((el) => el.text().includes("Offers"));
    expect(offersLink?.attributes("href")).toBe("/offers");
  });

  it("links A-tier card to /schools?tier=A", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
      global: {
        stubs: {
          NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
        },
      },
    });

    const aTierLink = wrapper.find('[data-testid="stat-card-a-tier"]');
    expect(aTierLink.attributes("href")).toBe("/schools?tier=A");
  });

  it("links monthly contacts card to /interactions", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
      global: {
        stubs: {
          NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
        },
      },
    });

    const contactsLink = wrapper.find('[data-testid="stat-card-monthly-contacts"]');
    expect(contactsLink.attributes("href")).toBe("/interactions");
  });

  it("shows pending offers count", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, totalOffers: 5, acceptedOffers: 2 },
    });

    expect(wrapper.text()).toContain("3 pending");
  });

  it("handles zero counts gracefully", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: {
        coachCount: 0,
        schoolCount: 0,
        interactionCount: 0,
        totalOffers: 0,
        acceptedOffers: 0,
        aTierSchoolCount: 0,
        contactsThisMonth: 0,
      },
    });

    expect(wrapper.text()).toContain("0");
  });

  it("handles large numbers gracefully", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: {
        coachCount: 999,
        schoolCount: 1500,
        interactionCount: 5000,
        totalOffers: 100,
        acceptedOffers: 50,
        aTierSchoolCount: 200,
        contactsThisMonth: 500,
      },
    });

    expect(wrapper.text()).toContain("999");
    expect(wrapper.text()).toContain("1500");
    expect(wrapper.text()).toContain("5000");
  });

  it("applies correct grid classes for responsive layout", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
    });

    const gridContainer = wrapper.find(".grid");
    const classes = gridContainer.classes();

    expect(classes).toContain("grid-cols-1");
    expect(classes).toContain("sm:grid-cols-2");
    expect(classes).toContain("lg:grid-cols-3");
    expect(classes).toContain("xl:grid-cols-6");
  });

  it("renders all cards with hover effects", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: defaultProps,
    });

    const links = wrapper.findAll("a");
    links.forEach((link) => {
      expect(link.classes()).toContain("group");
      expect(link.classes()).toContain("relative");
    });
  });

  it("displays coach total badge when count > 0", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, coachCount: 5 },
    });

    expect(wrapper.text()).toContain("5 total");
  });

  it("displays school total badge when count > 0", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, schoolCount: 10 },
    });

    expect(wrapper.text()).toContain("10 total");
  });

  it("displays interaction logged badge when count > 0", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, interactionCount: 42 },
    });

    expect(wrapper.text()).toContain("42 logged");
  });

  it("displays offer pending badge when count > 0", () => {
    const wrapper = mount(DashboardStatsCards, {
      props: { ...defaultProps, totalOffers: 5, acceptedOffers: 2 },
    });

    expect(wrapper.text()).toContain("3 pending");
  });
});
