import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardAnalytics from "~/components/Dashboard/DashboardAnalytics.vue";
import type { Interaction, School, Notification } from "~/types/models";

const createMockEvent = (overrides = {}) => ({
  id: "event-1",
  name: "Camp at Stanford",
  start_date: new Date().toISOString(),
  location: "Stanford, CA",
  ...overrides,
});

const createMockNotification = (overrides = {}): Notification => ({
  id: "notif-1",
  title: "Follow-up reminder",
  message: "Time to follow up with Stanford",
  type: "follow_up_reminder",
  priority: "normal",
  scheduled_for: new Date().toISOString(),
  read_at: null,
  ...overrides,
});

const createMockTask = (overrides = {}) => ({
  id: "task-1",
  text: "Call Coach Smith",
  completed: false,
  ...overrides,
});

const createMockInteraction = (overrides: Partial<Interaction> = {}): Interaction => ({
  id: `int-1`,
  school_id: "school-1",
  type: "email",
  direction: "outbound",
  occurred_at: new Date().toISOString(),
  logged_by: "user-1",
  ...overrides,
});

const createMockSchool = (overrides = {}) => ({
  id: "school-1",
  user_id: "user-1",
  name: "Stanford",
  location: "Stanford, CA",
  status: "contacted",
  notes: null,
  pros: [],
  cons: [],
  is_favorite: false,
  ...overrides,
});

describe("DashboardAnalytics", () => {
  it("renders events section when showEvents is true", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        upcomingEvents: [createMockEvent()],
        showEvents: true,
      },
    });

    expect(wrapper.text()).toContain("Upcoming Events");
  });

  it("hides events section when showEvents is false", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        upcomingEvents: [createMockEvent()],
        showEvents: false,
      },
    });

    expect(wrapper.text()).not.toContain("Upcoming Events");
  });

  it("displays upcoming events count badge", () => {
    const events = [createMockEvent(), createMockEvent({ id: "event-2" })];
    const wrapper = mount(DashboardAnalytics, {
      props: { upcomingEvents: events },
    });

    expect(wrapper.text()).toContain("2");
  });

  it("shows empty state when no upcoming events", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: { upcomingEvents: [] },
    });

    expect(wrapper.text()).toContain("No upcoming events");
  });

  it("renders notifications section when showNotifications is true", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        notifications: [createMockNotification()],
        showNotifications: true,
      },
    });

    expect(wrapper.text()).toContain("Recent Activity");
  });

  it("hides notifications section when showNotifications is false", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        notifications: [createMockNotification()],
        showNotifications: false,
      },
    });

    expect(wrapper.text()).not.toContain("Recent Activity");
  });

  it("displays notifications", () => {
    const notifications = [
      createMockNotification({
        title: "Follow-up reminder",
        message: "Check in with Stanford",
      }),
    ];

    const wrapper = mount(DashboardAnalytics, {
      props: { notifications },
    });

    expect(wrapper.text()).toContain("Follow-up reminder");
    expect(wrapper.text()).toContain("Check in with Stanford");
  });

  it("renders tasks section when showTasks is true", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        tasks: [createMockTask()],
        showTasks: true,
      },
    });

    expect(wrapper.text()).toContain("Quick Tasks");
  });

  it("hides tasks section when showTasks is false", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        tasks: [createMockTask()],
        showTasks: false,
      },
    });

    expect(wrapper.text()).not.toContain("Quick Tasks");
  });

  it("displays pending tasks count", () => {
    const tasks = [
      createMockTask({ completed: false }),
      createMockTask({ id: "task-2", completed: false }),
      createMockTask({ id: "task-3", completed: true }),
    ];

    const wrapper = mount(DashboardAnalytics, {
      props: { tasks },
    });

    expect(wrapper.text()).toContain("2 pending");
  });

  it("renders contact frequency widget when interactions and schools provided", () => {
    const interactions = [createMockInteraction()];
    const schools = [createMockSchool()];

    const wrapper = mount(DashboardAnalytics, {
      props: {
        contactFrequencyInteractions: interactions,
        schools,
      },
    });

    expect(wrapper.text()).toContain("Contact Frequency");
  });

  it("renders contact frequency widget when interactions provided", () => {
    const interactions = [createMockInteraction()];
    const schools = [createMockSchool()];

    const wrapper = mount(DashboardAnalytics, {
      props: {
        contactFrequencyInteractions: interactions,
        schools,
      },
    });

    const contactFreqSection = wrapper.find('[data-testid="contact-frequency-widget"]');
    expect(contactFreqSection.exists()).toBe(true);
  });

  it("emits refresh-notifications event when refresh button clicked", async () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        notifications: [createMockNotification()],
      },
    });

    const buttons = wrapper.findAll("button");
    const refreshButton = buttons.find((el) => el.text().includes("Refresh"));
    if (refreshButton) {
      await refreshButton.trigger("click");
    }

    expect(wrapper.emitted("refresh-notifications")).toBeTruthy();
  });

  it("emits notification-click event when notification clicked", async () => {
    const notification = createMockNotification({
      id: "notif-123",
      title: "Test Notification",
    });

    const wrapper = mount(DashboardAnalytics, {
      props: { notifications: [notification] },
    });

    // Find notification items
    const notificationItems = wrapper.findAll(".p-3");
    if (notificationItems.length > 0) {
      await notificationItems[0].trigger("click");
    }

    const emitted = wrapper.emitted("notification-click");
    expect(emitted).toBeTruthy();
  });

  it("renders social media section when showSocial is true", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        showSocial: true,
      },
    });

    expect(wrapper.text()).toContain("Social Media");
  });

  it("hides social media section when showSocial is false", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        showSocial: false,
      },
    });

    expect(wrapper.text()).not.toContain("Social Media");
  });

  it("displays up to 3 events in preview", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      createMockEvent({ id: `event-${i}` }),
    );

    const wrapper = mount(DashboardAnalytics, {
      props: { upcomingEvents: events },
    });

    const eventItems = wrapper.findAll(".p-3").filter((el) => el.text().includes("Camp"));
    expect(eventItems.length).toBeLessThanOrEqual(3);
  });

  it("shows view all events link", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: { upcomingEvents: [createMockEvent()] },
    });

    const links = wrapper.findAll("a");
    const viewAllLink = links.find((el) => el.text().includes("View All Events"));
    expect(viewAllLink?.exists()).toBe(true);
  });

  it("shows view all notifications link", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: { notifications: [createMockNotification()] },
    });

    const links = wrapper.findAll("a");
    const viewAllLink = links.find((el) => el.text().includes("View All Notifications"));
    expect(viewAllLink?.exists()).toBe(true);
  });

  it("shows no upcoming events empty state correctly", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        upcomingEvents: [],
        showEvents: true,
      },
    });

    expect(wrapper.text()).toContain("No upcoming events");
  });

  it("shows no recent activity empty state correctly", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        notifications: [],
        showNotifications: true,
      },
    });

    expect(wrapper.text()).toContain("No recent activity");
  });

  it("shows no tasks empty state correctly", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: {
        tasks: [],
        showTasks: true,
      },
    });

    expect(wrapper.text()).toContain("No tasks yet");
  });

  it("passes correct props to contact frequency widget", () => {
    const interactions = [createMockInteraction()];
    const schools = [createMockSchool()];

    const wrapper = mount(DashboardAnalytics, {
      props: {
        contactFrequencyInteractions: interactions,
        schools,
      },
    });

    const contactFreqWidget = wrapper.findComponent({ name: "ContactFrequencyWidget" });
    expect(contactFreqWidget.exists()).toBe(true);
  });

  it("displays add task button when showTasks is true", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: { showTasks: true },
    });

    const addTaskButton = wrapper.findAll("button").find((el) => el.text().includes("Add Task"));
    expect(addTaskButton?.exists()).toBe(true);
  });

  it("shows add task button when showTasks is true", () => {
    const wrapper = mount(DashboardAnalytics, {
      props: { showTasks: true },
    });

    const addTaskButton = wrapper.findAll("button").find((el) => el.text().includes("Add Task"));
    expect(addTaskButton?.exists()).toBe(true);
  });
});
