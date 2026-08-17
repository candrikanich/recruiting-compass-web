import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdminStatTile from "~/components/Admin/AdminStatTile.vue";

describe("AdminStatTile", () => {
  it("renders label and value", () => {
    const w = mount(AdminStatTile, { props: { label: "Users", value: 42 } });
    expect(w.text()).toContain("Users");
    expect(w.text()).toContain("42");
  });

  it("shows an up arrow for positive delta", () => {
    const w = mount(AdminStatTile, { props: { label: "x", value: 1, delta: 5 } });
    expect(w.text()).toContain("▲");
    expect(w.text()).toContain("5");
  });

  it("shows a down arrow for negative delta", () => {
    const w = mount(AdminStatTile, { props: { label: "x", value: 1, delta: -3 } });
    expect(w.text()).toContain("▼");
    expect(w.text()).toContain("3");
  });
});
