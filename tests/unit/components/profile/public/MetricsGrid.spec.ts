import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MetricsGrid from "~/components/profile/public/MetricsGrid.vue";

describe("MetricsGrid", () => {
  it("renders a tile per metric with label + value + unit", () => {
    const w = mount(MetricsGrid, {
      props: {
        metrics: [
          {
            key: "exit_velocity",
            label: "Exit Velocity",
            value: "91",
            unit: "mph",
            verified: true,
          },
        ],
      },
    });
    expect(w.text()).toContain("Exit Velocity");
    expect(w.text()).toContain("91");
    expect(w.text()).toContain("mph");
  });
});
