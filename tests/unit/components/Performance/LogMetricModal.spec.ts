import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { computed } from "vue";
import LogMetricModal from "~/components/Performance/LogMetricModal.vue";

// Mock useEvents composable
vi.mock("~/composables/useEvents", () => ({
  useEvents: vi.fn(() => ({
    events: computed(() => [
      {
        id: "1",
        name: "PG Underclass Showcase",
        start_date: "2025-01-15",
        end_date: "2025-01-15",
      },
      {
        id: "2",
        name: "Perfect Game National",
        start_date: "2025-01-10",
        end_date: "2025-01-12",
      },
    ]),
    loading: computed(() => false),
    error: computed(() => null),
    fetchEvents: vi.fn(),
  })),
}));

// Mock usePerformance composable
const mockCreateMetric = vi.fn();
vi.mock("~/composables/usePerformance", () => ({
  usePerformance: vi.fn(() => ({
    createMetric: mockCreateMetric,
  })),
}));

describe("LogMetricModal", () => {
  it("renders when show prop is true", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.text()).toContain("Log Performance Metric");
  });

  it("does not render when show prop is false", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: false },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find(".modal-container").exists()).toBe(false);
  });

  it("emits close event when backdrop is clicked", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await wrapper.find(".fixed.inset-0").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close event when cancel button is clicked", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await wrapper.find('button[type="button"]').trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

describe("LogMetricModal - Form Fields", () => {
  it("renders all required form fields", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find("#metricType").exists()).toBe(true);
    expect(wrapper.find("#value").exists()).toBe(true);
    expect(wrapper.find("#date").exists()).toBe(true);
    expect(wrapper.find("#unit").exists()).toBe(true);
    expect(wrapper.find("#notes").exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });

  it("has all metric type options, sport-filtered from the registry (default: baseball)", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const options = wrapper.find("#metricType").findAll("option");
    expect(options).toHaveLength(13); // 11 baseball types + "other" + empty option

    // Verify registry-backed labels (no unit repeated in the label)
    expect(options[0].text()).toBe("Select Metric");
    expect(options[1].text()).toBe("Fastball Velocity");
    expect(options[2].text()).toBe("Exit Velocity");
    expect(options[3].text()).toBe("Batting Average");
    expect(options[4].text()).toBe("60-Yard Dash");
    expect(options[5].text()).toBe("Pop Time");
    expect(options[6].text()).toBe("ERA");
    expect(options[12].text()).toBe("Other Metric");

    // Verify registry-ordered values
    expect(options[1].element.value).toBe("velocity");
    expect(options[2].element.value).toBe("exit_velo");
    expect(options[3].element.value).toBe("batting_avg");
    expect(options[4].element.value).toBe("sixty_time");
    expect(options[5].element.value).toBe("pop_time");
    expect(options[6].element.value).toBe("era");
    expect(options[12].element.value).toBe("other");
  });

  it("filters the metric-type list to the athlete's primary sport", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true, primarySport: "Basketball" },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const values = wrapper
      .find("#metricType")
      .findAll("option")
      .map((o) => o.element.value);
    expect(values).toEqual([
      "",
      "points_per_game",
      "rebounds_per_game",
      "assists_per_game",
      "field_goal_pct",
      "three_point_pct",
      "free_throw_pct",
      "steals_per_game",
      "blocks_per_game",
      "vertical_jump",
      "other",
    ]);
    expect(values).not.toContain("velocity");
  });

  it("renders unit as a fixed-vocabulary dropdown (no free text)", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: { stubs: { Teleport: true } },
    });

    const unitField = wrapper.find("#unit");
    expect(unitField.element.tagName).toBe("SELECT");
    const unitValues = unitField
      .findAll("option")
      .map((o) => o.element.value);
    expect(unitValues).toEqual(["", "mph", "sec", "in", "ft", "lbs", "count", "%"]);
  });

  it("auto-sets and locks the unit for a fixed metric type", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: { stubs: { Teleport: true } },
    });

    await wrapper.find("#metricType").setValue("velocity");

    const unitField = wrapper.find("#unit");
    expect((unitField.element as HTMLSelectElement).value).toBe("mph");
    expect(unitField.attributes("disabled")).toBeDefined();
  });

  it("leaves the unit user-selectable when metric type is Other", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: { stubs: { Teleport: true } },
    });

    await wrapper.find("#metricType").setValue("other");

    const unitField = wrapper.find("#unit");
    expect(unitField.attributes("disabled")).toBeUndefined();
  });

  it("defaults date to today", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await flushPromises(); // Wait for onMounted hook

    const today = new Date().toISOString().split("T")[0];
    expect((wrapper.find("#date").element as HTMLInputElement).value).toBe(
      today,
    );
  });

  it("disables submit button when required fields are empty", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.attributes("disabled")).toBeDefined();
  });
});

describe("LogMetricModal - Event Integration", () => {
  it("renders event dropdown", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find("#event").exists()).toBe(true);
  });

  it("displays events sorted by date descending", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const options = wrapper.find("#event").findAll("option");
    expect(options[0].text()).toBe("No event");
    expect(options[1].text()).toContain("PG Underclass Showcase");
    expect(options[1].text()).toContain("Jan 15, 2025");
  });
});

describe("LogMetricModal - Form Submission", () => {
  beforeEach(() => {
    mockCreateMetric.mockClear();
  });

  it("calls createMetric with correct payload on submit", async () => {
    mockCreateMetric.mockResolvedValue({ id: "123" });

    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Fill form
    await wrapper.find("#metricType").setValue("velocity");
    await wrapper.find("#value").setValue("92");
    await wrapper.find("#date").setValue("2025-01-15");
    await wrapper.find("#unit").setValue("mph");
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find("#notes").setValue("Test note");

    // Submit
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(mockCreateMetric).toHaveBeenCalledWith({
      metric_type: "velocity",
      value: 92,
      recorded_date: "2025-01-15",
      unit: "mph",
      event_id: null,
      verified: true,
      notes: "Test note",
      display_value: "92.0 mph",
    });
  });

  it("requires a custom name for Other and persists it snake_cased as metric_type", async () => {
    mockCreateMetric.mockResolvedValue({ id: "123" });

    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    await wrapper.find("#metricType").setValue("other");
    await wrapper.find("#value").setValue("80");
    await wrapper.find("#date").setValue("2025-01-15");

    // No custom name yet: submit disabled
    expect(
      wrapper.find('button[type="submit"]').attributes("disabled"),
    ).toBeDefined();

    await wrapper.find("#otherName").setValue("Arm Strength");
    expect(
      wrapper.find('button[type="submit"]').attributes("disabled"),
    ).toBeUndefined();

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(mockCreateMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        metric_type: "arm_strength",
        value: 80,
      }),
    );
  });

  it("does not show the custom-name field for a known metric type", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.find("#otherName").exists()).toBe(false);
  });

  it("emits metric-created event on successful submission", async () => {
    const newMetric = { id: "123", metric_type: "velocity", value: 92 };
    mockCreateMetric.mockResolvedValue(newMetric);

    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Fill and submit
    await wrapper.find("#metricType").setValue("velocity");
    await wrapper.find("#value").setValue("92");
    await wrapper.find("#date").setValue("2025-01-15");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("metric-created")).toBeTruthy();
    expect(wrapper.emitted("metric-created")?.[0]).toEqual([newMetric]);
  });

  it("closes modal on successful submission", async () => {
    mockCreateMetric.mockResolvedValue({ id: "123" });

    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Fill and submit
    await wrapper.find("#metricType").setValue("velocity");
    await wrapper.find("#value").setValue("92");
    await wrapper.find("#date").setValue("2025-01-15");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("displays error message on submission failure", async () => {
    mockCreateMetric.mockRejectedValue(new Error("Network error"));

    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Fill and submit
    await wrapper.find("#metricType").setValue("velocity");
    await wrapper.find("#value").setValue("92");
    await wrapper.find("#date").setValue("2025-01-15");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Network error");
    expect(wrapper.emitted("close")).toBeFalsy();
  });

  it("shows loading state during submission", async () => {
    mockCreateMetric.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Fill and submit
    await wrapper.find("#metricType").setValue("velocity");
    await wrapper.find("#value").setValue("92");
    await wrapper.find("#date").setValue("2025-01-15");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find('button[type="submit"]').text()).toBe("Logging...");
    expect(
      wrapper.find('button[type="submit"]').attributes("disabled"),
    ).toBeDefined();
  });
});

describe("LogMetricModal - Keyboard Support & Accessibility", () => {
  it("closes modal when ESC key is pressed", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: false,
        },
      },
    });

    // Trigger ESC key on document
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(event);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();

    wrapper.unmount();
  });

  it("focuses first input when modal opens", async () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: false },
      attachTo: document.body,
      global: {
        stubs: {
          Teleport: false,
        },
      },
    });

    await wrapper.setProps({ show: true });
    await flushPromises();
    await wrapper.vm.$nextTick();
    // Additional tick for focus to settle
    await wrapper.vm.$nextTick();

    const firstInput = document.querySelector("#metricType") as HTMLElement;
    expect(document.activeElement?.id).toBe("metricType");

    wrapper.unmount();
  });

  it("has proper ARIA attributes", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes("aria-modal")).toBe("true");
    expect(dialog.attributes("aria-labelledby")).toBeDefined();
  });

  it("has accessible form labels", () => {
    const wrapper = mount(LogMetricModal, {
      props: { show: true },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const metricTypeLabel = wrapper.find('label[for="metricType"]');
    expect(metricTypeLabel.exists()).toBe(true);

    const valueLabel = wrapper.find('label[for="value"]');
    expect(valueLabel.exists()).toBe(true);
  });
});
