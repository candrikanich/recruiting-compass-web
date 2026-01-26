import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ContactFrequencyWidget from "~/components/Dashboard/ContactFrequencyWidget.vue";
import type { Interaction, School } from "~/types/models";

const createMockInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: `int-${Math.random()}`,
  school_id: "school-1",
  type: "email",
  direction: "outbound",
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  logged_by: "user-1",
  ...overrides,
});

const createMockSchool = (overrides: Partial<School> = {}): School => ({
  id: "school-1",
  user_id: "user-1",
  name: "Test University",
  location: "Test City, ST",
  status: "interested",
  notes: null,
  pros: [],
  cons: [],
  is_favorite: false,
  ...overrides,
});

describe("ContactFrequencyWidget", () => {
  it("renders widget with title", () => {
    const wrapper = mount(ContactFrequencyWidget);
    expect(wrapper.text()).toContain("Contact Frequency");
  });

  it("displays contact count badge when contacts exist", () => {
    const now = new Date();
    const interactions = [
      createMockInteraction({
        school_id: "school-1",
        occurred_at: now.toISOString(),
      }),
    ];
    const schools = [createMockSchool({ id: "school-1", name: "Stanford" })];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    expect(wrapper.find('[data-testid="contact-frequency-count"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("1");
  });

  it("shows empty state when no recent contacts", () => {
    const wrapper = mount(ContactFrequencyWidget, {
      props: {
        interactions: [],
        schools: [],
      },
    });

    expect(wrapper.text()).toContain("No recent contacts");
  });

  it("filters interactions from last 7 days only", () => {
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const interactions = [
      createMockInteraction({
        school_id: "school-1",
        occurred_at: eightDaysAgo.toISOString(),
      }),
      createMockInteraction({
        school_id: "school-2",
        occurred_at: twoDaysAgo.toISOString(),
      }),
    ];

    const schools = [
      createMockSchool({ id: "school-1", name: "Old Contact" }),
      createMockSchool({ id: "school-2", name: "Recent Contact" }),
    ];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    expect(wrapper.text()).toContain("Recent Contact");
    expect(wrapper.text()).not.toContain("Old Contact");
  });

  it("counts unique schools correctly", () => {
    const now = new Date();
    const interactions = [
      createMockInteraction({ school_id: "school-1", occurred_at: now.toISOString() }),
      createMockInteraction({ school_id: "school-1", occurred_at: now.toISOString() }),
      createMockInteraction({ school_id: "school-2", occurred_at: now.toISOString() }),
    ];

    const schools = [
      createMockSchool({ id: "school-1", name: "School A" }),
      createMockSchool({ id: "school-2", name: "School B" }),
    ];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    const countBadge = wrapper.find('[data-testid="contact-frequency-count"]');
    expect(countBadge.text()).toBe("2");
  });

  it("displays individual contact counts per school", () => {
    const now = new Date();
    const interactions = [
      createMockInteraction({ school_id: "school-1", occurred_at: now.toISOString() }),
      createMockInteraction({ school_id: "school-1", occurred_at: now.toISOString() }),
      createMockInteraction({ school_id: "school-2", occurred_at: now.toISOString() }),
    ];

    const schools = [
      createMockSchool({ id: "school-1", name: "School A" }),
      createMockSchool({ id: "school-2", name: "School B" }),
    ];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    // Should show contact counts
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("1");
  });

  it("orders schools by most recent contact", () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const interactions = [
      createMockInteraction({
        school_id: "school-1",
        occurred_at: threeDaysAgo.toISOString(),
      }),
      createMockInteraction({
        school_id: "school-2",
        occurred_at: oneDayAgo.toISOString(),
      }),
    ];

    const schools = [
      createMockSchool({ id: "school-1", name: "Older Contact" }),
      createMockSchool({ id: "school-2", name: "Recent Contact" }),
    ];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    const schoolNames = wrapper.findAll('[data-testid^="contacted-school-"]');
    expect(schoolNames[0].text()).toContain("Recent Contact");
    expect(schoolNames[1].text()).toContain("Older Contact");
  });

  it("handles null school_id gracefully", () => {
    const now = new Date();
    const interactions = [
      createMockInteraction({
        school_id: undefined,
        occurred_at: now.toISOString(),
      }),
      createMockInteraction({
        school_id: "school-1",
        occurred_at: now.toISOString(),
      }),
    ];

    const schools = [createMockSchool({ id: "school-1", name: "School A" })];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    // Should only show the valid school
    expect(wrapper.find('[data-testid="contact-frequency-count"]').text()).toBe("1");
  });

  it("limits display to top 5 schools", () => {
    const now = new Date();
    const interactions = Array.from({ length: 10 }, (_, i) =>
      createMockInteraction({
        school_id: `school-${i}`,
        occurred_at: now.toISOString(),
      }),
    );

    const schools = Array.from({ length: 10 }, (_, i) =>
      createMockSchool({
        id: `school-${i}`,
        name: `School ${i}`,
      }),
    );

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    const schoolElements = wrapper.findAll('[data-testid^="contacted-school-"]');
    expect(schoolElements.length).toBeLessThanOrEqual(5);
  });

  it("formats dates correctly", () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const interactions = [
      createMockInteraction({
        school_id: "school-1",
        occurred_at: oneDayAgo.toISOString(),
      }),
    ];

    const schools = [createMockSchool({ id: "school-1", name: "School A" })];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    expect(wrapper.text()).toContain("Yesterday");
  });

  it("uses created_at when occurred_at is missing", () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const interactions = [
      createMockInteraction({
        school_id: "school-1",
        occurred_at: undefined,
        created_at: twoDaysAgo.toISOString(),
      }),
    ];

    const schools = [createMockSchool({ id: "school-1", name: "School A" })];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    expect(wrapper.text()).toContain("School A");
    expect(wrapper.text()).toContain("2d ago");
  });

  it("has correct data-testid attributes", () => {
    const now = new Date();
    const interactions = [
      createMockInteraction({
        school_id: "school-1",
        occurred_at: now.toISOString(),
      }),
    ];

    const schools = [createMockSchool({ id: "school-1", name: "School A" })];

    const wrapper = mount(ContactFrequencyWidget, {
      props: { interactions, schools },
    });

    expect(wrapper.find('[data-testid="contact-frequency-widget"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="contact-frequency-count"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="contacted-school-school-1"]').exists()).toBe(true);
  });
});
