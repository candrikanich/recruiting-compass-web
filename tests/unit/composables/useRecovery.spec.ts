import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRecovery } from "~/composables/useRecovery";

// Mock composables
vi.mock("~/composables/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: {
      value: [
        { id: "1", name: "School A", status: "interested" },
        { id: "2", name: "School B", status: "interested" },
      ],
    },
  }),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    interactions: {
      value: [
        {
          id: "1",
          school_id: "1",
          type: "email",
          date: "2024-01-01",
          notes: "Initial contact",
        },
      ],
    },
  }),
}));

vi.mock("~/composables/useOffers", () => ({
  useOffers: () => ({
    offers: {
      value: [
        {
          id: "1",
          school_id: "1",
          amount: 50000,
          type: "athletic",
        },
      ],
    },
  }),
}));

vi.mock("~/composables/useTasks", () => ({
  useTasks: () => ({
    athleteTasks: {
      value: [],
    },
  }),
}));

vi.mock("~/composables/usePerformanceAnalytics", () => ({
  usePerformanceAnalytics: () => ({
    generatePerformanceReport: () => ({
      summary: "Mock report",
      metrics: {},
      recommendations: [],
    }),
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: { id: "test-user" },
  }),
}));

describe("useRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes correctly", () => {
    const {
      isInRecoveryMode,
      activeRecoveryPlan,
      activeTrigger,
      triggerHistory,
    } = useRecovery();

    expect(isInRecoveryMode.value).toBe(false);
    expect(activeRecoveryPlan.value).toBe(null);
    expect(activeTrigger.value).toBe(null);
    expect(triggerHistory.value).toEqual([]);
  });

  it("activates recovery mode when trigger is detected", async () => {
    const {
      activateRecoveryMode,
      isInRecoveryMode,
      activeRecoveryPlan,
      activeTrigger,
    } = useRecovery();

    await activateRecoveryMode();

    expect(isInRecoveryMode.value).toBe(true);
    expect(activeRecoveryPlan.value).not.toBeNull();
    expect(activeTrigger.value).not.toBeNull();
  });

  it("acknowledges recovery plan", async () => {
    const { activateRecoveryMode, acknowledgeRecoveryPlan, isInRecoveryMode } =
      useRecovery();

    await activateRecoveryMode();
    expect(isInRecoveryMode.value).toBe(true);

    await acknowledgeRecoveryPlan();
    expect(isInRecoveryMode.value).toBe(false);
  });

  it("checks recovery triggers in priority order", async () => {
    const { checkRecoveryTriggers } = useRecovery();

    const result = await checkRecoveryTriggers();

    // Should detect first high-severity trigger
    expect(result.triggered).toBe(true);
    expect(result.trigger?.severity).toBe("high");
  });
});
