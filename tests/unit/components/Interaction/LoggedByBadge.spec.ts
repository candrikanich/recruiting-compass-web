import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LoggedByBadge from "~/components/Interaction/LoggedByBadge.vue";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}));

describe("LoggedByBadge", () => {
  beforeEach(() => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "athlete-123",
          full_name: "John Athlete",
          email: "john@example.com",
          role: "player",
        },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("displays 'You' when loggedByUserId matches currentUserId", () => {
    const wrapper = mount(LoggedByBadge, {
      props: {
        loggedByUserId: "user-123",
        currentUserId: "user-123",
      },
    });

    expect(wrapper.text()).toContain("You");
  });

  it("displays user name when loggedByUserId is different", async () => {
    const wrapper = mount(LoggedByBadge, {
      props: {
        loggedByUserId: "athlete-123",
        currentUserId: "user-123",
      },
    });

    // Wait for user data to be fetched
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain("John Athlete");
  });

  it("displays 'Unknown User' when user is not found", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const wrapper = mount(LoggedByBadge, {
      props: {
        loggedByUserId: "unknown-123",
        currentUserId: "user-123",
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain("Unknown User");
  });

  it("applies correct badge color for parent role", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "parent-123",
          full_name: "Parent User",
          email: "parent@example.com",
          role: "parent",
        },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const wrapper = mount(LoggedByBadge, {
      props: {
        loggedByUserId: "parent-123",
        currentUserId: "user-123",
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 150));

    const badge = wrapper.find("div");
    expect(badge.classes()).toContain("bg-blue-100");
    expect(badge.classes()).toContain("text-blue-900");
  });

  it("applies correct badge color for player role", async () => {
    const wrapper = mount(LoggedByBadge, {
      props: {
        loggedByUserId: "athlete-123",
        currentUserId: "user-123",
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const badge = wrapper.find("div");
    expect(badge.classes()).toContain("bg-purple-100");
    expect(badge.classes()).toContain("text-purple-900");
  });

  it("applies neutral color when user role is unknown", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "unknown-123",
          full_name: "Unknown User",
          email: "unknown@example.com",
          role: "admin",
        },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const wrapper = mount(LoggedByBadge, {
      props: {
        loggedByUserId: "unknown-123",
        currentUserId: "user-123",
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const badge = wrapper.find("div");
    expect(badge.classes()).toContain("bg-slate-100");
    expect(badge.classes()).toContain("text-slate-900");
  });

  it("does not fetch user data when loggedByUserId equals currentUserId", async () => {
    mount(LoggedByBadge, {
      props: {
        loggedByUserId: "user-123",
        currentUserId: "user-123",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
