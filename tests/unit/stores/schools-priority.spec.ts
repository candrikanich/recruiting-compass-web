import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useSchoolStore } from "~/stores/schools"
import { useUserStore } from "~/stores/user"
import { createMockSchool } from "~/tests/fixtures/schools.fixture"

const mockSupabase = {
  from: vi.fn(),
}

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => mockSupabase,
}))

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: (html: string) => html.replace(/<[^>]*>/g, ""),
}))

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({
    activeFamilyId: { value: "family-123" },
  }),
}))

describe("Priority Tier Management", () => {
  let schoolStore: ReturnType<typeof useSchoolStore>
  let userStore: ReturnType<typeof useUserStore>
  let mockQuery: any

  beforeEach(() => {
    setActivePinia(createPinia())
    schoolStore = useSchoolStore()
    userStore = useUserStore()
    userStore.user = {
      id: "user-123",
      email: "test@example.com",
    }

    mockQuery = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    mockSupabase.from.mockReturnValue(mockQuery)
    vi.clearAllMocks()
  })

  describe("setPriorityTier via updateSchool", () => {
    it("should set priority tier to A", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: null })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: "A" })

      expect(schoolStore.schools[0].priority_tier).toBe("A")
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ priority_tier: "A" }),
      )
    })

    it("should set priority tier to B", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: null })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "B" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: "B" })

      expect(schoolStore.schools[0].priority_tier).toBe("B")
    })

    it("should set priority tier to C", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: null })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "C" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: "C" })

      expect(schoolStore.schools[0].priority_tier).toBe("C")
    })

    it("should clear priority tier (set to null)", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: "A" })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: null },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: null })

      expect(schoolStore.schools[0].priority_tier).toBeNull()
    })

    it("should record updated_by and updated_at when changing priority", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: null })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: "A" })

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          priority_tier: "A",
          updated_by: "user-123",
          updated_at: expect.any(String),
        }),
      )
    })
  })

  describe("schoolsByPriorityTier getter", () => {
    beforeEach(() => {
      schoolStore.schools = [
        createMockSchool({ id: "a1", priority_tier: "A" }),
        createMockSchool({ id: "a2", priority_tier: "A" }),
        createMockSchool({ id: "b1", priority_tier: "B" }),
        createMockSchool({ id: "c1", priority_tier: "C" }),
        createMockSchool({ id: "none", priority_tier: null }),
      ]
    })

    it("should return only A tier schools", () => {
      const aTier = schoolStore.schoolsByPriorityTier("A")

      expect(aTier).toHaveLength(2)
      expect(aTier.map((s) => s.id)).toEqual(["a1", "a2"])
    })

    it("should return only B tier schools", () => {
      const bTier = schoolStore.schoolsByPriorityTier("B")

      expect(bTier).toHaveLength(1)
      expect(bTier[0].id).toBe("b1")
    })

    it("should return only C tier schools", () => {
      const cTier = schoolStore.schoolsByPriorityTier("C")

      expect(cTier).toHaveLength(1)
      expect(cTier[0].id).toBe("c1")
    })

    it("should return empty array for tier with no schools", () => {
      const tier = schoolStore.schoolsByPriorityTier("A")
      expect(tier.length).toBeGreaterThan(0)

      // Remove all A tier schools
      schoolStore.schools = schoolStore.schools.filter(
        (s) => s.priority_tier !== "A",
      )
      const emptyTier = schoolStore.schoolsByPriorityTier("A")
      expect(emptyTier).toHaveLength(0)
    })

    it("should include schools of specified tier regardless of other properties", () => {
      schoolStore.schools = [
        createMockSchool({
          id: "special-a",
          priority_tier: "A",
          division: "D3",
          status: "committed",
        }),
        createMockSchool({
          id: "regular-a",
          priority_tier: "A",
          division: "D1",
          status: "researching",
        }),
      ]

      const aTier = schoolStore.schoolsByPriorityTier("A")

      expect(aTier).toHaveLength(2)
      expect(aTier.map((s) => s.id)).toEqual(["special-a", "regular-a"])
    })
  })

  describe("Priority tier filtering", () => {
    beforeEach(() => {
      schoolStore.schools = [
        createMockSchool({ id: "a1", priority_tier: "A", division: "D1" }),
        createMockSchool({ id: "b1", priority_tier: "B", division: "D2" }),
        createMockSchool({ id: "c1", priority_tier: "C", division: "D1" }),
        createMockSchool({ id: "none", priority_tier: null, division: "D3" }),
      ]
    })

    it("should filter schools by priority tier A", () => {
      schoolStore.setFilters({ priorityTiers: ["A"] })

      const filtered = schoolStore.filteredSchools

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe("a1")
    })

    it("should filter schools by multiple priority tiers", () => {
      schoolStore.setFilters({ priorityTiers: ["A", "C"] })

      const filtered = schoolStore.filteredSchools

      expect(filtered).toHaveLength(2)
      expect(filtered.map((s) => s.id)).toEqual(["a1", "c1"])
    })

    it("should combine priority tier filter with other filters", () => {
      schoolStore.setFilters({
        priorityTiers: ["A", "B"],
        division: "D1",
      })

      const filtered = schoolStore.filteredSchools

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe("a1")
    })

    it("should show all schools when priority tier filter is empty", () => {
      schoolStore.setFilters({ priorityTiers: [] })

      const filtered = schoolStore.filteredSchools

      expect(filtered.length).toBe(4)
    })

    it("should show all schools when priority tier filter is not set", () => {
      schoolStore.setFilters({})

      const filtered = schoolStore.filteredSchools

      expect(filtered.length).toBe(4)
    })
  })

  describe("Priority tier independence from status", () => {
    it("should set priority tier independently of status", async () => {
      const school = createMockSchool({
        id: "school-1",
        status: "interested",
        priority_tier: null,
      })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: "A" })

      expect(schoolStore.schools[0].status).toBe("interested")
      expect(schoolStore.schools[0].priority_tier).toBe("A")
    })

    it("should update status without affecting priority tier", async () => {
      const school = createMockSchool({
        id: "school-1",
        status: "interested",
        priority_tier: "A",
      })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, status: "offer_received" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { status: "offer_received" })

      expect(schoolStore.schools[0].status).toBe("offer_received")
      expect(schoolStore.schools[0].priority_tier).toBe("A")
    })

    it("should allow all combinations of status and priority tier", async () => {
      const statuses: Array<typeof schoolStore.schools[0].status> = [
        "researching",
        "contacted",
        "interested",
        "offer_received",
        "declined",
        "committed",
      ]
      const tiers: Array<"A" | "B" | "C" | null> = ["A", "B", "C", null]

      for (const status of statuses) {
        for (const tier of tiers) {
          const school = createMockSchool({
            id: `school-${status}-${tier}`,
            status,
            priority_tier: tier,
          })
          schoolStore.schools = [school]

          mockQuery.single.mockResolvedValue({
            data: school,
            error: null,
          })

          // Verify the school can exist with this combination
          expect(schoolStore.schools[0].status).toBe(status)
          expect(schoolStore.schools[0].priority_tier).toBe(tier)
        }
      }
    })
  })

  describe("Priority tier updates in context", () => {
    it("should update only priority tier field when changing tier", async () => {
      const school = createMockSchool({
        id: "school-1",
        name: "Test University",
        status: "interested",
        notes: "Important notes",
        priority_tier: "B",
      })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      })

      await schoolStore.updateSchool("school-1", { priority_tier: "A" })

      // Other fields should remain unchanged
      expect(schoolStore.schools[0].name).toBe("Test University")
      expect(schoolStore.schools[0].status).toBe("interested")
      expect(schoolStore.schools[0].notes).toBe("Important notes")
      expect(schoolStore.schools[0].priority_tier).toBe("A")
    })

    it("should handle multiple updates to priority tier", async () => {
      const school = createMockSchool({
        id: "school-1",
        priority_tier: null,
      })
      schoolStore.schools = [school]

      // First update: A
      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "A" },
        error: null,
      })
      await schoolStore.updateSchool("school-1", { priority_tier: "A" })
      expect(schoolStore.schools[0].priority_tier).toBe("A")

      // Second update: C
      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: "C" },
        error: null,
      })
      await schoolStore.updateSchool("school-1", { priority_tier: "C" })
      expect(schoolStore.schools[0].priority_tier).toBe("C")

      // Third update: null
      mockQuery.single.mockResolvedValue({
        data: { ...school, priority_tier: null },
        error: null,
      })
      await schoolStore.updateSchool("school-1", { priority_tier: null })
      expect(schoolStore.schools[0].priority_tier).toBeNull()
    })
  })

  describe("Error handling", () => {
    it("should handle Supabase update errors gracefully", async () => {
      const school = createMockSchool({ id: "school-1", priority_tier: null })
      schoolStore.schools = [school]

      const updateError = new Error("Update failed")
      mockQuery.single.mockResolvedValue({
        data: null,
        error: updateError,
      })

      await expect(
        schoolStore.updateSchool("school-1", { priority_tier: "A" }),
      ).rejects.toThrow()
      expect(schoolStore.error).toBe("Update failed")
    })

    it("should not lose school state on update error", async () => {
      const school = createMockSchool({
        id: "school-1",
        priority_tier: "A",
        name: "Test",
      })
      schoolStore.schools = [school]

      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Update failed"),
      })

      try {
        await schoolStore.updateSchool("school-1", { priority_tier: "B" })
      } catch {
        // Expected error
      }

      // Original school state should remain
      expect(schoolStore.schools[0]).toEqual(school)
    })
  })
})
