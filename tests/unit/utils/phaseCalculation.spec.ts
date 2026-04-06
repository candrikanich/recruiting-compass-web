import { describe, it, expect } from "vitest";
import {
  PHASE_MILESTONES,
  PHASE_INFO,
  calculatePhase,
  getMilestoneProgress,
  canAdvancePhase,
  getNextPhase,
  getPreviousPhase,
  buildPhaseMilestoneData,
} from "~/utils/phaseCalculation";

describe("phaseCalculation", () => {
  // ─── Constants ──────────────────────────────────────────────────────────────

  describe("PHASE_MILESTONES", () => {
    it("has expected transition keys", () => {
      expect(PHASE_MILESTONES).toHaveProperty("freshmanToSophomore");
      expect(PHASE_MILESTONES).toHaveProperty("sophomoreToJunior");
      expect(PHASE_MILESTONES).toHaveProperty("juniorToSenior");
      expect(PHASE_MILESTONES).toHaveProperty("seniorToCommitted");
    });

    it("each transition has at least one task ID", () => {
      expect(PHASE_MILESTONES.freshmanToSophomore.length).toBeGreaterThan(0);
      expect(PHASE_MILESTONES.sophomoreToJunior.length).toBeGreaterThan(0);
      expect(PHASE_MILESTONES.juniorToSenior.length).toBeGreaterThan(0);
      expect(PHASE_MILESTONES.seniorToCommitted.length).toBeGreaterThan(0);
    });

    it("all task IDs are non-empty strings", () => {
      Object.values(PHASE_MILESTONES).forEach((tasks) => {
        tasks.forEach((id) => {
          expect(typeof id).toBe("string");
          expect(id.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("PHASE_INFO", () => {
    const phases = [
      "freshman",
      "sophomore",
      "junior",
      "senior",
      "committed",
    ] as const;

    it("has entries for all phases", () => {
      phases.forEach((phase) => {
        expect(PHASE_INFO).toHaveProperty(phase);
      });
    });

    it("each phase entry has required shape", () => {
      phases.forEach((phase) => {
        const info = PHASE_INFO[phase];
        expect(typeof info.label).toBe("string");
        expect(typeof info.grade).toBe("number");
        expect(typeof info.theme).toBe("string");
        expect(typeof info.description).toBe("string");
      });
    });

    it("freshman is grade 9", () => {
      expect(PHASE_INFO.freshman.grade).toBe(9);
    });

    it("sophomore is grade 10", () => {
      expect(PHASE_INFO.sophomore.grade).toBe(10);
    });

    it("junior is grade 11", () => {
      expect(PHASE_INFO.junior.grade).toBe(11);
    });

    it("senior is grade 12", () => {
      expect(PHASE_INFO.senior.grade).toBe(12);
    });

    it("committed is grade 12", () => {
      expect(PHASE_INFO.committed.grade).toBe(12);
    });
  });

  // ─── calculatePhase ──────────────────────────────────────────────────────────

  describe("calculatePhase", () => {
    it("returns committed when hasSignedNLI is true regardless of completed tasks", () => {
      expect(calculatePhase([], true)).toBe("committed");
      expect(calculatePhase(PHASE_MILESTONES.juniorToSenior, true)).toBe(
        "committed",
      );
    });

    it("returns freshman when no tasks are completed", () => {
      expect(calculatePhase([], false)).toBe("freshman");
    });

    it("returns freshman when only some freshman milestones are completed", () => {
      const partial = PHASE_MILESTONES.freshmanToSophomore.slice(0, 1);
      expect(calculatePhase(partial, false)).toBe("freshman");
    });

    it("returns sophomore when all freshmanToSophomore tasks are completed", () => {
      expect(calculatePhase(PHASE_MILESTONES.freshmanToSophomore, false)).toBe(
        "sophomore",
      );
    });

    it("returns junior when all sophomoreToJunior tasks are completed", () => {
      const completedIds = [
        ...PHASE_MILESTONES.freshmanToSophomore,
        ...PHASE_MILESTONES.sophomoreToJunior,
      ];
      expect(calculatePhase(completedIds, false)).toBe("junior");
    });

    it("returns junior even without freshman tasks if sophomore milestones are done (highest-phase check)", () => {
      // The function checks phases from highest to lowest; sophomoreToJunior tasks alone qualify for junior
      expect(calculatePhase(PHASE_MILESTONES.sophomoreToJunior, false)).toBe(
        "junior",
      );
    });

    it("returns senior when all juniorToSenior tasks are completed", () => {
      const completedIds = [
        ...PHASE_MILESTONES.freshmanToSophomore,
        ...PHASE_MILESTONES.sophomoreToJunior,
        ...PHASE_MILESTONES.juniorToSenior,
      ];
      expect(calculatePhase(completedIds, false)).toBe("senior");
    });

    it("returns senior even without earlier tasks if juniorToSenior milestones are done", () => {
      expect(calculatePhase(PHASE_MILESTONES.juniorToSenior, false)).toBe(
        "senior",
      );
    });

    it("returns freshman when no milestones match", () => {
      expect(calculatePhase(["unrelated-task-id"], false)).toBe("freshman");
    });
  });

  // ─── getMilestoneProgress ────────────────────────────────────────────────────

  describe("getMilestoneProgress", () => {
    it("returns 100% complete for committed phase regardless of task IDs", () => {
      const progress = getMilestoneProgress("committed", []);
      expect(progress.phase).toBe("committed");
      expect(progress.percentComplete).toBe(100);
      expect(progress.required).toEqual([]);
      expect(progress.completed).toEqual([]);
      expect(progress.remaining).toEqual([]);
    });

    it("returns 0% complete for freshman with no completed tasks", () => {
      const progress = getMilestoneProgress("freshman", []);
      expect(progress.percentComplete).toBe(0);
      expect(progress.required).toEqual(PHASE_MILESTONES.freshmanToSophomore);
      expect(progress.completed).toEqual([]);
      expect(progress.remaining).toEqual(PHASE_MILESTONES.freshmanToSophomore);
    });

    it("returns 100% complete for freshman with all milestone tasks done", () => {
      const progress = getMilestoneProgress(
        "freshman",
        PHASE_MILESTONES.freshmanToSophomore,
      );
      expect(progress.percentComplete).toBe(100);
      expect(progress.completed).toEqual(PHASE_MILESTONES.freshmanToSophomore);
      expect(progress.remaining).toEqual([]);
    });

    it("calculates partial progress for freshman", () => {
      const total = PHASE_MILESTONES.freshmanToSophomore.length;
      const completedOne = [PHASE_MILESTONES.freshmanToSophomore[0]];
      const progress = getMilestoneProgress("freshman", completedOne);
      expect(progress.percentComplete).toBeCloseTo((1 / total) * 100);
      expect(progress.completed).toHaveLength(1);
      expect(progress.remaining).toHaveLength(total - 1);
    });

    it("uses sophomoreToJunior milestones for sophomore phase", () => {
      const progress = getMilestoneProgress("sophomore", []);
      expect(progress.required).toEqual(PHASE_MILESTONES.sophomoreToJunior);
    });

    it("uses juniorToSenior milestones for junior phase", () => {
      const progress = getMilestoneProgress("junior", []);
      expect(progress.required).toEqual(PHASE_MILESTONES.juniorToSenior);
    });

    it("uses seniorToCommitted milestones for senior phase", () => {
      const progress = getMilestoneProgress("senior", []);
      expect(progress.required).toEqual(PHASE_MILESTONES.seniorToCommitted);
    });

    it("ignores extra completed task IDs not in the required list", () => {
      const completedIds = [
        ...PHASE_MILESTONES.freshmanToSophomore,
        "extra-task-not-in-list",
      ];
      const progress = getMilestoneProgress("freshman", completedIds);
      expect(progress.percentComplete).toBe(100);
    });

    it("includes phase in returned object", () => {
      const progress = getMilestoneProgress("junior", []);
      expect(progress.phase).toBe("junior");
    });
  });

  // ─── canAdvancePhase ─────────────────────────────────────────────────────────

  describe("canAdvancePhase", () => {
    it("freshman: returns false with no completed tasks", () => {
      expect(canAdvancePhase("freshman", [])).toBe(false);
    });

    it("freshman: returns true when all freshmanToSophomore tasks complete", () => {
      expect(
        canAdvancePhase("freshman", PHASE_MILESTONES.freshmanToSophomore),
      ).toBe(true);
    });

    it("freshman: returns false when only some tasks complete", () => {
      const partial = PHASE_MILESTONES.freshmanToSophomore.slice(0, 2);
      expect(canAdvancePhase("freshman", partial)).toBe(false);
    });

    it("sophomore: returns true when all sophomoreToJunior tasks complete", () => {
      expect(
        canAdvancePhase("sophomore", PHASE_MILESTONES.sophomoreToJunior),
      ).toBe(true);
    });

    it("sophomore: returns false with no completed tasks", () => {
      expect(canAdvancePhase("sophomore", [])).toBe(false);
    });

    it("junior: returns true when all juniorToSenior tasks complete", () => {
      expect(canAdvancePhase("junior", PHASE_MILESTONES.juniorToSenior)).toBe(
        true,
      );
    });

    it("junior: returns false with no completed tasks", () => {
      expect(canAdvancePhase("junior", [])).toBe(false);
    });

    it("senior: returns true when sign-nli task is complete", () => {
      expect(canAdvancePhase("senior", ["sign-nli"])).toBe(true);
    });

    it("senior: returns false without sign-nli", () => {
      expect(canAdvancePhase("senior", [])).toBe(false);
    });

    it("committed: always returns false (no further advancement)", () => {
      const allTasks = [
        ...PHASE_MILESTONES.freshmanToSophomore,
        ...PHASE_MILESTONES.sophomoreToJunior,
        ...PHASE_MILESTONES.juniorToSenior,
        ...PHASE_MILESTONES.seniorToCommitted,
      ];
      expect(canAdvancePhase("committed", allTasks)).toBe(false);
    });
  });

  // ─── getNextPhase ────────────────────────────────────────────────────────────

  describe("getNextPhase", () => {
    it("freshman → sophomore", () => {
      expect(getNextPhase("freshman")).toBe("sophomore");
    });

    it("sophomore → junior", () => {
      expect(getNextPhase("sophomore")).toBe("junior");
    });

    it("junior → senior", () => {
      expect(getNextPhase("junior")).toBe("senior");
    });

    it("senior → committed", () => {
      expect(getNextPhase("senior")).toBe("committed");
    });

    it("committed → null (no next phase)", () => {
      expect(getNextPhase("committed")).toBeNull();
    });
  });

  // ─── getPreviousPhase ────────────────────────────────────────────────────────

  describe("getPreviousPhase", () => {
    it("freshman → null (no previous phase)", () => {
      expect(getPreviousPhase("freshman")).toBeNull();
    });

    it("sophomore → freshman", () => {
      expect(getPreviousPhase("sophomore")).toBe("freshman");
    });

    it("junior → sophomore", () => {
      expect(getPreviousPhase("junior")).toBe("sophomore");
    });

    it("senior → junior", () => {
      expect(getPreviousPhase("senior")).toBe("junior");
    });

    it("committed → senior", () => {
      expect(getPreviousPhase("committed")).toBe("senior");
    });
  });

  // ─── buildPhaseMilestoneData ──────────────────────────────────────────────────

  describe("buildPhaseMilestoneData", () => {
    it("returns current_phase matching the provided phase", () => {
      const data = buildPhaseMilestoneData("junior", []);
      expect(data.current_phase).toBe("junior");
    });

    it("returns milestones_by_phase with entries for all 5 phases", () => {
      const data = buildPhaseMilestoneData("freshman", []);
      const phases = Object.keys(data.milestones_by_phase);
      expect(phases).toContain("freshman");
      expect(phases).toContain("sophomore");
      expect(phases).toContain("junior");
      expect(phases).toContain("senior");
      expect(phases).toContain("committed");
    });

    it("each phase entry in milestones_by_phase has required shape", () => {
      const data = buildPhaseMilestoneData("freshman", []);
      Object.values(data.milestones_by_phase).forEach((entry) => {
        expect(Array.isArray(entry.required)).toBe(true);
        expect(Array.isArray(entry.completed)).toBe(true);
        expect(typeof entry.percent_complete).toBe("number");
      });
    });

    it("reflects completed tasks in milestones_by_phase", () => {
      const freshmanTasks = PHASE_MILESTONES.freshmanToSophomore;
      const data = buildPhaseMilestoneData("sophomore", freshmanTasks);
      expect(data.milestones_by_phase.freshman.percent_complete).toBe(100);
      expect(data.milestones_by_phase.sophomore.percent_complete).toBe(0);
    });

    it("committed phase entry always shows 100% complete", () => {
      const data = buildPhaseMilestoneData("senior", []);
      expect(data.milestones_by_phase.committed.percent_complete).toBe(100);
    });

    it("returns last_phase_update as a valid ISO string", () => {
      const data = buildPhaseMilestoneData("freshman", []);
      const date = new Date(data.last_phase_update);
      expect(isNaN(date.getTime())).toBe(false);
    });

    it("with empty completed IDs, all non-committed phases have 0% progress", () => {
      const data = buildPhaseMilestoneData("freshman", []);
      expect(data.milestones_by_phase.freshman.percent_complete).toBe(0);
      expect(data.milestones_by_phase.sophomore.percent_complete).toBe(0);
      expect(data.milestones_by_phase.junior.percent_complete).toBe(0);
      expect(data.milestones_by_phase.senior.percent_complete).toBe(0);
    });
  });
});
