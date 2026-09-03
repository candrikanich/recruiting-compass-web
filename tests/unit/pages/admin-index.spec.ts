import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import AdminIndex from "~/pages/admin/index.vue";

vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({
    session: ref({ user: { email: "admin@test.com" } }),
  })),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-token",
            user: { email: "admin@test.com" },
          },
        },
      }),
    },
  })),
}));

const mockFetch = vi.fn();
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/admin/stats"))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            users: 5,
            schools: 10,
            coaches: 20,
            interactions: 50,
            family_units: 2,
            byDivision: [{ value: "D1", count: 6 }],
            byCoachRole: [{ value: "head", count: 12 }],
            byUserRole: [{ value: "player", count: 3 }],
            byPrimarySport: [{ value: "Baseball", count: 3 }],
            newUsersWeekly: [{ weekStart: "2026-08-17", count: 4 }],
          }),
          { status: 200 },
        ),
      );
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
  (globalThis as any).fetch = mockFetch;
});

describe("Admin Overview (index.vue)", () => {
  it("renders Overview heading with stats cards when stats loaded", async () => {
    const wrapper = mount(AdminIndex, {
      global: {
        plugins: [createPinia()],
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 50));
    await wrapper.vm.$nextTick();

    const heading = wrapper.find("h1");
    expect(heading.exists()).toBe(true);
    expect(heading.text()).toBe("Overview");

    const cards = wrapper.findAll(".rounded-lg.border.border-slate-200");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("calls $fetch for stats (and not users) on mount", async () => {
    mount(AdminIndex, {
      global: {
        plugins: [createPinia()],
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/stats",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/users"),
      expect.anything(),
    );
  });
});
