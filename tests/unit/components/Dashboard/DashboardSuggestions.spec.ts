import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DashboardSuggestions from "~/components/Dashboard/DashboardSuggestions.vue";
import type { Suggestion } from "~/types/timeline";

vi.mock("~/composables/useSuggestions", () => ({
  useSuggestions: () => ({
    surfaceMoreSuggestions: vi.fn(),
    moreCount: { value: 0 },
  }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const makeSuggestion = (id: string): Suggestion =>
  ({
    id,
    title: `Suggestion ${id}`,
    description: "Test",
    priority: "medium",
    type: "action",
  }) as unknown as Suggestion;

describe("DashboardSuggestions", () => {
  const baseSuggestion = makeSuggestion("1");

  it("renders the moreCount prop value, not an internal override", () => {
    const wrapper = mount(DashboardSuggestions, {
      props: {
        suggestions: [baseSuggestion],
        moreCount: 5,
      },
    });
    expect(wrapper.text()).toContain("5");
  });

  it("actionItemsText shows plural form for 2 suggestions", () => {
    const wrapper = mount(DashboardSuggestions, {
      props: {
        suggestions: [makeSuggestion("1"), makeSuggestion("2")],
      },
    });
    expect(wrapper.text()).toContain("2 items need your attention");
  });

  it("actionItemsText shows singular form for 1 suggestion", () => {
    const wrapper = mount(DashboardSuggestions, {
      props: {
        suggestions: [baseSuggestion],
      },
    });
    expect(wrapper.text()).toContain("1 item needs your attention");
  });

  it("renders the deadPeriodMessage prop when provided", () => {
    const message = "Dead period is active for all your schools.";
    const wrapper = mount(DashboardSuggestions, {
      props: {
        suggestions: [],
        deadPeriodMessage: message,
      },
    });
    expect(wrapper.text()).toContain(message);
  });
});
