import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useActiveFamily } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";

// Mock useSupabase and useRoute
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "family-1", student_user_id: "student-1" },
            error: null,
          }),
        })),
      })),
    })),
  })),
}));

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({
    query: {},
  })),
}));

describe("useActiveFamily", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initializes with null family and athlete IDs", () => {
    const { activeFamilyId, activeAthleteId } = useActiveFamily();
    expect(activeFamilyId.value).toBe(null);
    expect(activeAthleteId.value).toBe(null);
  });

  it("exposes computed properties correctly", () => {
    const activeFamily = useActiveFamily();
    expect(activeFamily.activeFamilyId).toBeDefined();
    expect(activeFamily.activeAthleteId).toBeDefined();
    expect(activeFamily.getAccessibleAthletes).toBeDefined();
    expect(activeFamily.switchAthlete).toBeDefined();
  });

  it("getAccessibleAthletes returns an array", () => {
    const { getAccessibleAthletes } = useActiveFamily();
    const athletes = getAccessibleAthletes();
    expect(Array.isArray(athletes)).toBe(true);
  });

  it("switchAthlete method exists and is callable", async () => {
    const { switchAthlete } = useActiveFamily();
    expect(typeof switchAthlete).toBe("function");
  });

  it("has loading and error ref properties", () => {
    const activeFamily = useActiveFamily();
    expect(activeFamily.loading).toBeDefined();
    expect(activeFamily.error).toBeDefined();
  });

  it("has familyMembers ref property", () => {
    const { familyMembers } = useActiveFamily();
    expect(familyMembers).toBeDefined();
    expect(Array.isArray(familyMembers.value)).toBe(true);
  });
});
