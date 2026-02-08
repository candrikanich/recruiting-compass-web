import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useActiveFamily } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";

const mockFetchFn = vi.fn();

// Mock useSupabase and useRoute
vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "family-1", player_user_id: "player-1" },
            error: null,
          }),
        })),
      })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  })),
}));

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({
    query: {},
  })),
}));

// Mock global $fetch
global.$fetch = mockFetchFn as any;

describe("useActiveFamily", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockFetchFn.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
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

  describe("Athlete Selection Priority", () => {
    it("selects athlete closest to graduation (earliest year)", async () => {
      const { useRoute: originalUseRoute } = await import("vue-router");
      const mockRoute = {
        query: {},
      };

      // Mock the API response with athletes and graduation years
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player 2028",
            graduationYear: 2028,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-2",
            athleteName: "Player 2030",
            graduationYear: 2030,
            familyName: "Test Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      // Should select athlete with 2028 graduation (earliest)
      expect(activeFamily.activeAthleteId.value).toBe("athlete-1");
    });

    it("handles null graduation years by selecting first athlete", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player A",
            graduationYear: null,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-2",
            athleteName: "Player B",
            graduationYear: null,
            familyName: "Test Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      // Should select first athlete when all have null graduation years
      expect(activeFamily.activeAthleteId.value).toBe("athlete-1");
    });

    it("prioritizes athletes with graduation years over null values", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "No Year",
            graduationYear: null,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-2",
            athleteName: "Player 2025",
            graduationYear: 2025,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-3",
            athleteName: "Player 2028",
            graduationYear: 2028,
            familyName: "Test Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      // Should select athlete-2 with 2025 (earliest non-null graduation year)
      expect(activeFamily.activeAthleteId.value).toBe("athlete-2");
    });

    it("respects route query parameter over graduation year logic", async () => {
      // Mock route with athlete_id query param
      vi.resetModules();
      const mockRoute = { query: { athlete_id: "athlete-3" } };
      vi.doMock("vue-router", () => ({
        useRoute: vi.fn(() => mockRoute),
      }));

      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player 2025",
            graduationYear: 2025,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-3",
            athleteName: "Player 2030",
            graduationYear: 2030,
            familyName: "Test Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const { useActiveFamily: useActiveFamilyNew } =
        await import("~/composables/useActiveFamily");
      const activeFamily = useActiveFamilyNew();
      await activeFamily.initializeFamily();

      // Should select athlete-3 from query param, not athlete-1 from graduation logic
      expect(activeFamily.activeAthleteId.value).toBe("athlete-3");
    });

    it("respects localStorage preference when query param not present", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player 2025",
            graduationYear: 2025,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-2",
            athleteName: "Player 2028",
            graduationYear: 2028,
            familyName: "Test Family",
          },
        ],
      });

      // Set localStorage preference
      localStorage.setItem("parent_last_viewed_athlete", "athlete-2");

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      // Should select athlete-2 from localStorage, not athlete-1 from graduation logic
      expect(activeFamily.activeAthleteId.value).toBe("athlete-2");
    });

    it("selection priority order: route param > localStorage > graduation year > first", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player 2025",
            graduationYear: 2025,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-2",
            athleteName: "Player 2028",
            graduationYear: 2028,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-1",
            athleteId: "athlete-3",
            athleteName: "Player 2030",
            graduationYear: 2030,
            familyName: "Test Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      // Without query param or localStorage, should select graduation year priority
      expect(activeFamily.activeAthleteId.value).toBe("athlete-1");
    });
  });
});
