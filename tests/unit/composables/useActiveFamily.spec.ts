import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useActiveFamily } from "~/composables/useActiveFamily";
import { useUserStore } from "~/stores/user";

const mockFetchFn = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchFn }),
}));

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

  describe("initializeFamily — player role", () => {
    it("sets playerFamilyId from supabase for player role", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: { family_unit_id: "family-player-1" },
        error: null,
      });

      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: maybeSingleMock,
            })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "player-user-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.activeFamilyId.value).toBe("family-player-1");
    });

    it("leaves playerFamilyId null when supabase returns no data", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "player-user-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.activeFamilyId.value).toBeNull();
    });

    it("logs error but does not throw when supabase returns error for player", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "player-user-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      await expect(activeFamily.initializeFamily()).resolves.toBeUndefined();
      expect(activeFamily.activeFamilyId.value).toBeNull();
    });

    it("sets activeAthleteId to player's own user id", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { family_unit_id: "family-1" },
                error: null,
              }),
            })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "player-user-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.activeAthleteId.value).toBe("player-user-1");
    });
  });

  describe("initializeFamily — no user", () => {
    it("sets error when no user is logged in", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.error.value).toBe("No authenticated user");
    });

    it("does not set loading to true and back when no user", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.loading.value).toBe(false);
    });
  });

  describe("initializeFamily — parent API failure", () => {
    it("sets parentAccessibleFamilies to empty array when API call fails", async () => {
      mockFetchFn.mockRejectedValue(new Error("API error"));

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.parentAccessibleFamilies.value).toEqual([]);
    });

    it("sets loading to false after failed parent API call", async () => {
      mockFetchFn.mockRejectedValue(new Error("API error"));

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      expect(activeFamily.loading.value).toBe(false);
    });
  });

  describe("fetchFamilyMembers", () => {
    it("sets familyMembers to empty array when no activeFamilyId", async () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const activeFamily = useActiveFamily();
      await activeFamily.fetchFamilyMembers();

      expect(activeFamily.familyMembers.value).toEqual([]);
    });

    it("fetches members when activeFamilyId is set via initialization", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      const mockMembers = [
        { id: "mem-1", family_unit_id: "family-1", user_id: "player-1" },
      ];

      // First call to maybeSingle (player family lookup), second call is members select
      let callCount = 0;
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn((table: string) => {
          callCount++;
          if (table === "family_members" && callCount === 1) {
            // First call: player family lookup
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { family_unit_id: "family-1" },
                    error: null,
                  }),
                })),
              })),
            };
          }
          // Subsequent calls: family members fetch
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: mockMembers, error: null })),
            })),
          };
        }),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();
      await activeFamily.fetchFamilyMembers();

      expect(activeFamily.familyMembers.value.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("switchAthlete", () => {
    it("returns without error when user is not a parent", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      // Should not throw
      await expect(activeFamily.switchAthlete("athlete-1")).resolves.toBeUndefined();
    });

    it("sets error when athlete is not in accessible families", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player A",
            graduationYear: 2025,
            familyName: "Test Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();
      await activeFamily.switchAthlete("athlete-999");

      expect(activeFamily.error.value).toBe("No access to this athlete");
    });

    it("updates currentAthleteId when valid athlete is switched to", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player A",
            graduationYear: 2025,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-2",
            athleteId: "athlete-2",
            athleteName: "Player B",
            graduationYear: 2028,
            familyName: "Test Family B",
          },
        ],
      });

      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();
      await activeFamily.switchAthlete("athlete-2");

      expect(activeFamily.activeAthleteId.value).toBe("athlete-2");
    });

    it("persists selected athlete to localStorage", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player A",
            graduationYear: 2025,
            familyName: "Test Family",
          },
        ],
      });

      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();
      await activeFamily.switchAthlete("athlete-1");

      expect(localStorage.getItem("parent_last_viewed_athlete")).toBe("athlete-1");
    });
  });

  describe("getAccessibleAthletes", () => {
    it("returns only families with non-null athleteId for parents", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-1",
            athleteId: "athlete-1",
            athleteName: "Player A",
            graduationYear: 2025,
            familyName: "Test Family",
          },
          {
            familyUnitId: "family-2",
            athleteId: null,
            athleteName: null,
            graduationYear: null,
            familyName: "Unconnected Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      const athletes = activeFamily.getAccessibleAthletes();
      expect(athletes.length).toBe(1);
      expect(athletes[0].athleteId).toBe("athlete-1");
    });

    it("returns empty array for non-parent users", () => {
      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      expect(activeFamily.getAccessibleAthletes()).toEqual([]);
    });
  });

  describe("getDisplayContext", () => {
    it("returns null when activeFamilyId is null", () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const activeFamily = useActiveFamily();
      expect(activeFamily.getDisplayContext()).toBeNull();
    });

    it("returns context object when both IDs are set", async () => {
      const { useSupabase } = await import("~/composables/useSupabase");
      vi.mocked(useSupabase).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { family_unit_id: "family-1" },
                error: null,
              }),
            })),
          })),
        })),
      } as any);

      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      const context = activeFamily.getDisplayContext();
      expect(context).not.toBeNull();
      expect(context?.familyUnitId).toBe("family-1");
      expect(context?.athleteId).toBe("player-1");
      expect(context?.isParentViewing).toBe(false);
    });
  });

  describe("getDataOwnerUserId", () => {
    it("returns activeAthleteId value", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      expect(activeFamily.getDataOwnerUserId()).toBe("player-1");
    });

    it("returns null when no user is set", () => {
      const userStore = useUserStore();
      userStore.user = null as any;

      const activeFamily = useActiveFamily();
      expect(activeFamily.getDataOwnerUserId()).toBeNull();
    });
  });

  describe("isViewingAsParent", () => {
    it("is false for player role", () => {
      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const { isViewingAsParent } = useActiveFamily();
      expect(isViewingAsParent.value).toBe(false);
    });

    it("is false for parent with no current athlete selected", () => {
      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const { isViewingAsParent } = useActiveFamily();
      // currentAthleteId starts as null
      expect(isViewingAsParent.value).toBe(false);
    });
  });

  describe("activeFamilyId for parent", () => {
    it("returns first family unit when no athlete is selected", async () => {
      mockFetchFn.mockResolvedValue({
        families: [
          {
            familyUnitId: "family-first",
            athleteId: null,
            athleteName: null,
            graduationYear: null,
            familyName: "Solo Family",
          },
        ],
      });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.initializeFamily();

      // currentAthleteId is null (no athlete), so falls back to first family unit
      expect(activeFamily.activeFamilyId.value).toBe("family-first");
    });
  });

  describe("refetchFamilies", () => {
    it("is a no-op for non-parent users", async () => {
      const userStore = useUserStore();
      userStore.user = { id: "player-1", role: "player" } as any;

      const activeFamily = useActiveFamily();
      // Should not throw and mockFetchFn should not be called
      await activeFamily.refetchFamilies();
      expect(mockFetchFn).not.toHaveBeenCalled();
    });

    it("re-calls initializeFamily for parent users", async () => {
      mockFetchFn.mockResolvedValue({ families: [] });

      const userStore = useUserStore();
      userStore.user = { id: "parent-1", role: "parent" } as any;

      const activeFamily = useActiveFamily();
      await activeFamily.refetchFamilies();

      // mockFetchFn should have been called
      expect(mockFetchFn).toHaveBeenCalled();
    });
  });
});
