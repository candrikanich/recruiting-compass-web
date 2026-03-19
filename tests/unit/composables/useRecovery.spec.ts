import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// Mutable state containers so each test can override defaults
const mockSchoolsState = {
  value: [
    { id: "1", name: "School A", status: "interested" },
    { id: "2", name: "School B", status: "interested" },
  ] as Array<{ id: string; name: string; status: string }>,
};

const mockInteractionsState = {
  value: [] as Array<{
    id: string;
    school_id?: string;
    type?: string;
    sentiment?: string;
    occurred_at?: string;
    created_at?: string;
  }>,
};

const mockInteractionsLoading = ref(false);

const mockAthleteTasksState = {
  value: [] as Array<{ id: string; task_id: string; status: string }>,
};

// Mock composables
vi.mock("~/composables/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user" },
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    schools: mockSchoolsState,
  }),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    interactions: mockInteractionsState,
    loading: mockInteractionsLoading,
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
    athleteTasks: mockAthleteTasksState,
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

import { useRecovery } from "~/composables/useRecovery";

describe("useRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults that do NOT trigger any checks:
    // - all critical tasks completed
    // - recent positive interaction exists
    // - eligibility task in progress
    // - diverse school statuses
    mockAthleteTasksState.value = [
      { id: "at-1", task_id: "task-9-a1", status: "completed" },
      { id: "at-2", task_id: "task-10-r1", status: "completed" },
      { id: "at-3", task_id: "task-10-r3", status: "completed" },
      { id: "at-4", task_id: "task-11-a1", status: "in_progress" },
    ];
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    mockInteractionsState.value = [
      {
        id: "1",
        school_id: "1",
        type: "email",
        sentiment: "positive",
        occurred_at: recentDate.toISOString(),
      },
    ];
    mockInteractionsLoading.value = false;
    mockSchoolsState.value = [
      { id: "1", name: "School A", status: "interested" },
      { id: "2", name: "School B", status: "applied" },
      { id: "3", name: "School C", status: "offer" },
    ];
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
    // Make critical tasks incomplete to force a trigger
    mockAthleteTasksState.value = [];

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
    mockAthleteTasksState.value = [];

    const { activateRecoveryMode, acknowledgeRecoveryPlan, isInRecoveryMode } =
      useRecovery();

    await activateRecoveryMode();
    expect(isInRecoveryMode.value).toBe(true);

    await acknowledgeRecoveryPlan();
    expect(isInRecoveryMode.value).toBe(false);
  });

  it("checks recovery triggers in priority order", async () => {
    mockAthleteTasksState.value = [];

    const { checkRecoveryTriggers } = useRecovery();

    const result = await checkRecoveryTriggers();

    // Should detect first high-severity trigger
    expect(result.triggered).toBe(true);
    expect(result.trigger?.severity).toBe("high");
  });

  // ── checkNoCoachInterest ──────────────────────────────────────────────────

  describe("checkNoCoachInterest", () => {
    it("triggers when interactions array is empty", () => {
      mockInteractionsState.value = [];
      mockInteractionsLoading.value = false;

      const { checkNoCoachInterest } = useRecovery();
      const trigger = checkNoCoachInterest();

      expect(trigger).not.toBeNull();
      expect(trigger?.type).toBe("no_coach_interest");
      expect(trigger?.details.recentInteractions).toBe(0);
      expect(trigger?.details.lastInteractionDaysAgo).toBeNull();
    });

    it("triggers when interactions exist but none are positive in last 30 days", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      mockInteractionsState.value = [
        {
          id: "1",
          school_id: "1",
          type: "email",
          sentiment: "negative",
          occurred_at: oldDate.toISOString(),
        },
      ];
      mockInteractionsLoading.value = false;

      const { checkNoCoachInterest } = useRecovery();
      const trigger = checkNoCoachInterest();

      expect(trigger).not.toBeNull();
      expect(trigger?.type).toBe("no_coach_interest");
      expect(trigger?.details.recentInteractions).toBe(0);
      expect(typeof trigger?.details.lastInteractionDaysAgo).toBe("number");
    });

    it("does not trigger when a recent positive interaction exists", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);
      mockInteractionsState.value = [
        {
          id: "1",
          school_id: "1",
          type: "email",
          sentiment: "very_positive",
          occurred_at: recentDate.toISOString(),
        },
      ];
      mockInteractionsLoading.value = false;

      const { checkNoCoachInterest } = useRecovery();
      const trigger = checkNoCoachInterest();

      expect(trigger).toBeNull();
    });

    it("returns null while interactions are still loading", () => {
      mockInteractionsState.value = [];
      mockInteractionsLoading.value = true;

      const { checkNoCoachInterest } = useRecovery();
      const trigger = checkNoCoachInterest();

      expect(trigger).toBeNull();
    });
  });

  // ── checkEligibilityIncomplete ────────────────────────────────────────────

  describe("checkEligibilityIncomplete", () => {
    it("triggers when eligibility task does not exist", async () => {
      mockAthleteTasksState.value = [
        { id: "at-1", task_id: "task-9-a1", status: "completed" },
        { id: "at-2", task_id: "task-10-r1", status: "completed" },
        { id: "at-3", task_id: "task-10-r3", status: "completed" },
        // no task-11-a1
      ];

      const { checkEligibilityIncomplete } = useRecovery();
      const trigger = await checkEligibilityIncomplete();

      expect(trigger).not.toBeNull();
      expect(trigger?.type).toBe("eligibility_incomplete");
      expect(trigger?.severity).toBe("high");
      expect(trigger?.details.registrationStatus).toBe("not_started");
    });

    it("triggers when eligibility task has status not_started", async () => {
      mockAthleteTasksState.value = [
        { id: "at-1", task_id: "task-9-a1", status: "completed" },
        { id: "at-2", task_id: "task-10-r1", status: "completed" },
        { id: "at-3", task_id: "task-10-r3", status: "completed" },
        { id: "at-4", task_id: "task-11-a1", status: "not_started" },
      ];

      const { checkEligibilityIncomplete } = useRecovery();
      const trigger = await checkEligibilityIncomplete();

      expect(trigger).not.toBeNull();
      expect(trigger?.type).toBe("eligibility_incomplete");
    });

    it("does not trigger when eligibility task is in_progress", async () => {
      mockAthleteTasksState.value = [
        { id: "at-4", task_id: "task-11-a1", status: "in_progress" },
      ];

      const { checkEligibilityIncomplete } = useRecovery();
      const trigger = await checkEligibilityIncomplete();

      expect(trigger).toBeNull();
    });

    it("does not trigger when eligibility task is completed", async () => {
      mockAthleteTasksState.value = [
        { id: "at-4", task_id: "task-11-a1", status: "completed" },
      ];

      const { checkEligibilityIncomplete } = useRecovery();
      const trigger = await checkEligibilityIncomplete();

      expect(trigger).toBeNull();
    });
  });

  // ── checkFitGap ───────────────────────────────────────────────────────────

  describe("checkFitGap", () => {
    it("triggers when fewer than 3 schools exist", () => {
      mockSchoolsState.value = [
        { id: "1", name: "School A", status: "interested" },
        { id: "2", name: "School B", status: "interested" },
      ];

      const { checkFitGap } = useRecovery();
      const trigger = checkFitGap();

      expect(trigger).not.toBeNull();
      expect(trigger?.type).toBe("fit_gap");
      expect(trigger?.severity).toBe("high");
      expect(trigger?.details.schoolCount).toBe(2);
    });

    it("triggers when all schools have the same status", () => {
      mockSchoolsState.value = [
        { id: "1", name: "School A", status: "interested" },
        { id: "2", name: "School B", status: "interested" },
        { id: "3", name: "School C", status: "interested" },
      ];

      const { checkFitGap } = useRecovery();
      const trigger = checkFitGap();

      expect(trigger).not.toBeNull();
      expect(trigger?.type).toBe("fit_gap");
      expect(trigger?.severity).toBe("medium");
      expect(trigger?.details.allSameStatus).toBe("interested");
    });

    it("does not trigger when schools have diverse statuses", () => {
      mockSchoolsState.value = [
        { id: "1", name: "School A", status: "interested" },
        { id: "2", name: "School B", status: "applied" },
        { id: "3", name: "School C", status: "offer" },
      ];

      const { checkFitGap } = useRecovery();
      const trigger = checkFitGap();

      expect(trigger).toBeNull();
    });

    it("triggers with school count of 0 when schools array is empty", () => {
      mockSchoolsState.value = [];

      const { checkFitGap } = useRecovery();
      const trigger = checkFitGap();

      expect(trigger).not.toBeNull();
      expect(trigger?.details.schoolCount).toBe(0);
    });
  });

  // ── generateRecoveryPlan ──────────────────────────────────────────────────

  describe("generateRecoveryPlan", () => {
    it("generates correct plan for critical_task_missed trigger", () => {
      const { generateRecoveryPlan } = useRecovery();
      const plan = generateRecoveryPlan({
        type: "critical_task_missed",
        details: { missingTasks: ["task-9-a1"], count: 1 },
        severity: "high",
      });

      expect(plan.title).toBe("Complete Critical Foundation Tasks");
      expect(plan.duration_days).toBe(21);
      expect(plan.tasks_to_create).toContain("task-9-a1");
      expect(Array.isArray(plan.steps)).toBe(true);
      expect(plan.steps.length).toBeGreaterThan(0);
    });

    it("generates correct plan for no_coach_interest trigger", () => {
      const { generateRecoveryPlan } = useRecovery();
      const plan = generateRecoveryPlan({
        type: "no_coach_interest",
        details: { lastInteractionDaysAgo: 45, recentInteractions: 0 },
        severity: "high",
      });

      expect(plan.title).toBe("Rebuild Coach Outreach");
      expect(plan.duration_days).toBe(45);
      expect(Array.isArray(plan.steps)).toBe(true);
    });

    it("generates correct plan for eligibility_incomplete trigger", () => {
      const { generateRecoveryPlan } = useRecovery();
      const plan = generateRecoveryPlan({
        type: "eligibility_incomplete",
        details: { registrationStatus: "not_started", daysUntilEarlyDecember: 90 },
        severity: "high",
      });

      expect(plan.title).toBe("Register NCAA Eligibility");
      expect(plan.duration_days).toBe(30);
      expect(plan.tasks_to_create).toContain("task-11-a1");
    });

    it("generates correct plan for fit_gap trigger", () => {
      const { generateRecoveryPlan } = useRecovery();
      const plan = generateRecoveryPlan({
        type: "fit_gap",
        details: { schoolCount: 2, matchSafetyCount: 0 },
        severity: "high",
      });

      expect(plan.title).toBe("Build Balanced College List");
      expect(plan.duration_days).toBe(14);
      expect(plan.tasks_to_create).toContain("task-10-r3");
    });

    it("returned plan always has required shape", () => {
      const { generateRecoveryPlan } = useRecovery();
      const triggerTypes = [
        "critical_task_missed",
        "no_coach_interest",
        "eligibility_incomplete",
        "fit_gap",
      ] as const;

      for (const type of triggerTypes) {
        const plan = generateRecoveryPlan({
          type,
          details: {},
          severity: "high",
        });
        expect(typeof plan.title).toBe("string");
        expect(typeof plan.description).toBe("string");
        expect(Array.isArray(plan.steps)).toBe(true);
        expect(typeof plan.duration_days).toBe("number");
        expect(Array.isArray(plan.tasks_to_create)).toBe(true);
      }
    });
  });

  // ── checkRecoveryTriggers priority ────────────────────────────────────────

  describe("checkRecoveryTriggers priority ordering", () => {
    it("returns no trigger when all conditions are healthy", async () => {
      // beforeEach sets a healthy state
      const { checkRecoveryTriggers } = useRecovery();
      const result = await checkRecoveryTriggers();

      expect(result.triggered).toBe(false);
      expect(result.trigger).toBeNull();
      expect(result.plan).toBeNull();
    });

    it("prefers critical_task_missed over eligibility_incomplete", async () => {
      mockAthleteTasksState.value = [];
      // eligibility also not started (no task-11-a1), but critical_task_missed fires first

      const { checkRecoveryTriggers } = useRecovery();
      const result = await checkRecoveryTriggers();

      expect(result.trigger?.type).toBe("critical_task_missed");
    });

    it("detects no_coach_interest when critical tasks done and eligibility ok", async () => {
      mockAthleteTasksState.value = [
        { id: "at-1", task_id: "task-9-a1", status: "completed" },
        { id: "at-2", task_id: "task-10-r1", status: "completed" },
        { id: "at-3", task_id: "task-10-r3", status: "completed" },
        { id: "at-4", task_id: "task-11-a1", status: "completed" },
      ];
      mockInteractionsState.value = [];
      mockInteractionsLoading.value = false;

      const { checkRecoveryTriggers } = useRecovery();
      const result = await checkRecoveryTriggers();

      expect(result.triggered).toBe(true);
      expect(result.trigger?.type).toBe("no_coach_interest");
      expect(result.plan).not.toBeNull();
    });

    it("detects fit_gap when only remaining issue is school diversity", async () => {
      mockAthleteTasksState.value = [
        { id: "at-1", task_id: "task-9-a1", status: "completed" },
        { id: "at-2", task_id: "task-10-r1", status: "completed" },
        { id: "at-3", task_id: "task-10-r3", status: "completed" },
        { id: "at-4", task_id: "task-11-a1", status: "completed" },
      ];
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      mockInteractionsState.value = [
        {
          id: "1",
          sentiment: "positive",
          occurred_at: recentDate.toISOString(),
        },
      ];
      mockInteractionsLoading.value = false;
      mockSchoolsState.value = [
        { id: "1", name: "School A", status: "interested" },
        { id: "2", name: "School B", status: "interested" },
        { id: "3", name: "School C", status: "interested" },
      ];

      const { checkRecoveryTriggers } = useRecovery();
      const result = await checkRecoveryTriggers();

      expect(result.triggered).toBe(true);
      expect(result.trigger?.type).toBe("fit_gap");
    });
  });

  // ── lines 336-346: calculateDaysUntilDeadline (via eligibility trigger) ──

  describe("calculateDaysUntilDeadline (via eligibility trigger)", () => {
    it("includes a positive number for daysUntilEarlyDecember", async () => {
      mockAthleteTasksState.value = [
        { id: "at-1", task_id: "task-9-a1", status: "completed" },
        { id: "at-2", task_id: "task-10-r1", status: "completed" },
        { id: "at-3", task_id: "task-10-r3", status: "completed" },
        // no task-11-a1
      ];

      const { checkEligibilityIncomplete } = useRecovery();
      const trigger = await checkEligibilityIncomplete();

      expect(trigger).not.toBeNull();
      const days = trigger?.details.daysUntilEarlyDecember as number;
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(366);
    });
  });
});
