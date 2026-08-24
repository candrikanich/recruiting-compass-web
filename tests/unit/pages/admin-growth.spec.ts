import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const growth = {
  funnel: [
    { stage: "Invites sent", count: 10, dropoffPct: null },
    { stage: "Accepted", count: 6, dropoffPct: 40 },
    { stage: "Accounts", count: 100, dropoffPct: -1567 },
  ],
  activity: {
    dau: 2,
    wau: 5,
    mau: 8,
    dailyTrend: [{ day: "2026-08-16", count: 2 }],
  },
  adoption: {
    totalUsers: 10,
    features: [{ feature: "events", users: 4, pct: 40 }],
  },
  windowDays: 30,
};
vi.mock("~/composables/useAdminGrowth", () => ({
  useAdminGrowth: () => ({
    data: { value: growth },
    loading: { value: false },
    error: { value: null },
    fetchGrowth: vi.fn(),
  }),
}));

import AdminGrowth from "~/pages/admin/growth.vue";
const stubs = {
  AdminStatTile: {
    props: ["label", "value"],
    template: "<div class='tile'>{{label}}:{{value}}</div>",
  },
  AdminChart: true,
  AdminDataTable: true,
  AdminTimeRange: true,
  DesignSystemLoadingState: true,
  DesignSystemErrorState: true,
};

describe("admin growth page", () => {
  it("renders funnel, DAU/WAU/MAU tiles, adoption", async () => {
    const w = mount(AdminGrowth, { global: { stubs } });
    await flushPromises();
    expect(w.findAll(".tile").length).toBeGreaterThan(0);
    expect(w.text()).toContain("Invites sent");
  });

  it("renders a positive drop-off badge and never a double-dash or negative drop-off", async () => {
    const w = mount(AdminGrowth, { global: { stubs } });
    await flushPromises();
    const text = w.text();
    expect(text).toContain("6 (-40%)");
    expect(text).not.toContain("--");
    expect(text).toContain("100");
    expect(text).not.toContain("100 (--1567%)");
    expect(text).not.toContain("(-1567%)");
  });
});
