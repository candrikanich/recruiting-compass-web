import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const detail = {
  account: {
    id: "u1",
    email: "u@x.com",
    full_name: "U",
    role: "player",
    is_admin: false,
    created_at: "2026-01-01T00:00:00Z",
    graduation_year: 2027,
    current_phase: "build",
    onboarding_completed: true,
    status_label: "on_track",
    deletion_requested_at: null,
  },
  familyUnitId: "fam-1",
  family: { unit: {}, members: [], pendingInvitations: [] },
  athletes: [],
  recruiting: {
    counts: {
      schools: 3,
      coaches: 2,
      interactions: 5,
      offers: 1,
      events: 4,
      messages: 6,
    },
    recentInteractions: [],
    recentOffers: [],
    recentEvents: [],
    recentMessages: [],
  },
};
vi.mock("~/composables/useAdminUserDetail", () => ({
  useAdminUserDetail: () => ({
    data: { value: detail },
    loading: { value: false },
    error: { value: null },
    fetchDetail: vi.fn(),
  }),
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ params: { id: "u1" } }) }));

import AdminUserDetail from "~/pages/admin/users/[id].vue";

const stubs = {
  AdminStatTile: {
    props: ["label", "value"],
    template: "<div class='tile'>{{label}}:{{value}}</div>",
  },
  AdminDataTable: true,
  DesignSystemLoadingState: true,
  DesignSystemErrorState: true,
};

describe("admin user detail page", () => {
  it("renders the read-only banner naming the user", async () => {
    const w = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(w.text().toLowerCase()).toContain("read-only");
    expect(w.text()).toContain("u@x.com");
  });

  it("renders count tiles and NO write controls", async () => {
    const w = mount(AdminUserDetail, { global: { stubs } });
    await flushPromises();
    expect(w.findAll(".tile").length).toBeGreaterThan(0);
    expect(w.find("button.delete, [data-testid='delete']").exists()).toBe(
      false,
    );
  });
});
