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

vi.mock("~/composables/useToast", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

vi.mock("~/components/Admin/BulkDeleteConfirmModal.vue", () => ({
  default: {
    name: "BulkDeleteConfirmModal",
    template: "<div data-testid='bulk-delete-modal'><slot /></div>",
    props: ["isOpen", "emails"],
  },
}));

const mockFetch = vi.fn();
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/admin/users")) return Promise.resolve({ users: [] });
    if (url.includes("/api/admin/stats"))
      return Promise.resolve({
        users: 5,
        schools: 10,
        coaches: 20,
        interactions: 50,
        family_units: 2,
      });
    if (url.includes("/api/admin/health"))
      return Promise.resolve({
        ok: true,
        db: "ok",
        resend: "ok",
        checks: [
          { name: "Database", status: "ok" },
          { name: "Resend (email)", status: "ok" },
        ],
      });
    if (url.includes("/api/admin/pending-invitations"))
      return Promise.resolve({ invitations: [] });
    return Promise.resolve({});
  });
  (globalThis as any).$fetch = mockFetch;
});

describe("Admin Dashboard (index.vue)", () => {
  it("renders tab navigation with Overview, Users, Pending, Health, Tools", async () => {
    const wrapper = mount(AdminIndex, {
      global: {
        plugins: [createPinia()],
        stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
      },
    });

    await wrapper.vm.$nextTick();
    const buttons = wrapper.findAll("button");
    const tabLabels = buttons
      .filter((b) => b.text().match(/^(Overview|Users|Pending|Health|Tools)/))
      .map((b) => b.text().split(" ")[0]);
    expect(tabLabels).toContain("Overview");
    expect(tabLabels).toContain("Users");
    expect(tabLabels).toContain("Pending");
    expect(tabLabels).toContain("Health");
    expect(tabLabels).toContain("Tools");
  });

  it("shows Overview section by default with stats cards when stats loaded", async () => {
    const wrapper = mount(AdminIndex, {
      global: {
        plugins: [createPinia()],
        stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 50));

    const overviewHeading = wrapper.find("h2");
    expect(overviewHeading.exists()).toBe(true);
    expect(overviewHeading.text()).toBe("Overview");

    await wrapper.vm.$nextTick();
    const cards = wrapper.findAll(".rounded-lg.border.border-slate-200");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("calls $fetch for users and stats on mount", async () => {
    mount(AdminIndex, {
      global: {
        plugins: [createPinia()],
        stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/users",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/stats",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("Tools tab shows Invite admin and Batch fetch logos links", async () => {
    const wrapper = mount(AdminIndex, {
      global: {
        plugins: [createPinia()],
        stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
      },
    });

    await wrapper.vm.$nextTick();
    const toolsButton = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Tools"));
    expect(toolsButton).toBeDefined();
    await toolsButton!.trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Invite admin user");
    expect(wrapper.text()).toContain("Batch fetch school logos");
  });
});
