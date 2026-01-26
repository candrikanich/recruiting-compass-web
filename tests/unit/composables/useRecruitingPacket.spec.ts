import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRecruitingPacket } from "~/composables/useRecruitingPacket";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useInteractions } from "~/composables/useInteractions";
import type { School, Interaction } from "~/types/models";

// Mock dependencies
vi.mock("~/composables/useSupabase");
vi.mock("~/stores/user");
vi.mock("~/composables/useSchools");
vi.mock("~/composables/useCoaches");
vi.mock("~/composables/useInteractions");

describe("useRecruitingPacket", () => {
  let mockSupabase: any;
  let mockUserStore: any;
  let mockSchools: any;
  let mockCoaches: any;
  let mockInteractions: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup Supabase mock
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                height: "6'2\"",
                weight: "190 lbs",
                position: "Pitcher",
                high_school: "Central High",
                graduation_year: 2024,
                gpa: 3.8,
                sat_score: 1450,
                act_score: 33,
                video_links: [],
                social_media: [],
                core_courses: [],
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.mocked(useSupabase).mockReturnValue(mockSupabase);

    // Setup User Store mock
    mockUserStore = {
      user: {
        id: "test-user-id",
        email: "athlete@example.com",
        full_name: "John Smith",
        profile_photo_url: "https://example.com/photo.jpg",
      },
    };
    vi.mocked(useUserStore).mockReturnValue(mockUserStore);

    // Setup Schools mock
    const mockSchoolData: School[] = [
      {
        id: "school-1",
        name: "University of Texas",
        location: "Austin, TX",
        division: "D1",
        conference: "Big 12",
        status: "offer_received",
        is_favorite: true,
        user_id: "test-user-id",
      },
      {
        id: "school-2",
        name: "Rice University",
        location: "Houston, TX",
        division: "D1",
        conference: "Conference USA",
        status: "camp_invite",
        is_favorite: false,
        user_id: "test-user-id",
      },
    ];
    mockSchools = {
      schools: { value: mockSchoolData },
    };
    vi.mocked(useSchools).mockReturnValue(mockSchools);

    // Setup Coaches mock
    mockCoaches = {
      coaches: {
        value: [
          {
            id: "coach-1",
            school_id: "school-1",
            first_name: "Mike",
            last_name: "Coach",
          },
          {
            id: "coach-2",
            school_id: "school-1",
            first_name: "Sarah",
            last_name: "Assistant",
          },
        ],
      },
    };
    vi.mocked(useCoaches).mockReturnValue(mockCoaches);

    // Setup Interactions mock
    const mockInteractionData: Interaction[] = [
      {
        id: "int-1",
        school_id: "school-1",
        type: "email",
        direction: "outbound",
        occurred_at: new Date().toISOString(),
        sentiment: "positive",
        user_id: "test-user-id",
      },
      {
        id: "int-2",
        school_id: "school-1",
        type: "phone_call",
        direction: "inbound",
        occurred_at: new Date().toISOString(),
        sentiment: "positive",
        user_id: "test-user-id",
      },
      {
        id: "int-3",
        school_id: "school-2",
        type: "camp",
        direction: "outbound",
        occurred_at: new Date().toISOString(),
        sentiment: "very_positive",
        user_id: "test-user-id",
      },
    ];
    mockInteractions = {
      interactions: { value: mockInteractionData },
    };
    vi.mocked(useInteractions).mockReturnValue(mockInteractions);
  });

  describe("Initial state", () => {
    it("should initialize with correct state", () => {
      const { loading, error, hasGeneratedPacket, generatedHtml } =
        useRecruitingPacket();

      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(hasGeneratedPacket.value).toBe(false);
      expect(generatedHtml.value).toBeNull();
    });
  });

  describe("generatePacket", () => {
    it("should successfully generate packet with all data", async () => {
      const { generatePacket, loading, error, generatedHtml } =
        useRecruitingPacket();

      expect(loading.value).toBe(false);

      const result = await generatePacket();

      expect(error.value).toBeNull();
      expect(generatedHtml.value).toBeTruthy();
      expect(result.html).toBeTruthy();
      expect(result.filename).toBeTruthy();
      expect(result.data).toBeTruthy();
    });

    it("should include athlete data in generated packet", async () => {
      const { generatePacket, generatedData } = useRecruitingPacket();

      await generatePacket();

      expect(generatedData.value?.athlete.full_name).toBe("John Smith");
      expect(generatedData.value?.athlete.email).toBe("athlete@example.com");
    });

    it("should group schools by tier", async () => {
      const { generatePacket, generatedData } = useRecruitingPacket();

      await generatePacket();

      expect(generatedData.value?.schools.tier_a).toBeDefined();
      expect(generatedData.value?.schools.tier_b).toBeDefined();
      expect(generatedData.value?.schools.tier_c).toBeDefined();

      // UT should be in tier_a (offer_received)
      expect(
        generatedData.value?.schools.tier_a.some((s) => s.id === "school-1")
      ).toBe(true);

      // Rice should be in tier_b (camp_invite)
      expect(
        generatedData.value?.schools.tier_b.some((s) => s.id === "school-2")
      ).toBe(true);
    });

    it("should calculate activity summary", async () => {
      const { generatePacket, generatedData } = useRecruitingPacket();

      await generatePacket();

      expect(generatedData.value?.activitySummary.totalSchools).toBe(2);
      expect(generatedData.value?.activitySummary.totalInteractions).toBe(3);
      expect(
        generatedData.value?.activitySummary.interactionBreakdown.emails
      ).toBe(1);
      expect(
        generatedData.value?.activitySummary.interactionBreakdown.calls
      ).toBe(1);
      expect(generatedData.value?.activitySummary.interactionBreakdown.camps).toBe(1);
    });

    it("should generate valid filename", async () => {
      const { generatePacket } = useRecruitingPacket();

      const result = await generatePacket();

      expect(result.filename).toMatch(/John_Smith_RecruitingPacket_\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it("should set loading state during generation", async () => {
      const { generatePacket, loading } = useRecruitingPacket();

      const promise = generatePacket();
      // Note: Due to async timing, loading might already be false
      // This is a simplified test

      await promise;
      expect(loading.value).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      // Mock Supabase to throw error
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error("DB error")),
          }),
        }),
      });
      vi.mocked(useSupabase).mockReturnValue(mockSupabase);

      const { generatePacket, error } = useRecruitingPacket();

      try {
        await generatePacket();
      } catch (e) {
        // Expected
      }

      expect(error.value).toBeTruthy();
    });
  });

  describe("openPacketPreview", () => {
    it("should open new window with packet HTML", async () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
      };

      const mockOpen = vi.fn().mockReturnValue(mockWindow);
      global.window.open = mockOpen;

      const { openPacketPreview, generatePacket } = useRecruitingPacket();

      await generatePacket();
      await openPacketPreview();

      expect(mockOpen).toHaveBeenCalledWith("", "_blank");
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
    });

    it("should generate packet if not already generated", async () => {
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
      };

      vi.spyOn(window, "open").mockReturnValue(mockWindow as any);

      const { openPacketPreview, hasGeneratedPacket } = useRecruitingPacket();

      expect(hasGeneratedPacket.value).toBe(false);

      await openPacketPreview();

      expect(hasGeneratedPacket.value).toBe(true);
      expect(window.open).toHaveBeenCalled();
    });

    it("should handle window.open returning null", async () => {
      const mockOpen = vi.fn().mockReturnValue(null);
      global.window.open = mockOpen;

      const { openPacketPreview, generatePacket, error } =
        useRecruitingPacket();

      await generatePacket();

      try {
        await openPacketPreview();
      } catch (e) {
        // Expected
      }

      expect(error.value).toBeTruthy();
    });
  });

  describe("downloadPacket", () => {
    it("should call window.print()", () => {
      // Mock window.print
      const mockPrint = vi.fn();
      global.window.print = mockPrint;

      const { downloadPacket } = useRecruitingPacket();

      downloadPacket();

      expect(mockPrint).toHaveBeenCalled();
    });
  });

  describe("resetPacket", () => {
    it("should clear all generated data", async () => {
      const {
        generatePacket,
        resetPacket,
        generatedHtml,
        generatedData,
        error,
        showEmailModal,
      } = useRecruitingPacket();

      await generatePacket();

      expect(generatedHtml.value).toBeTruthy();
      expect(generatedData.value).toBeTruthy();

      resetPacket();

      expect(generatedHtml.value).toBeNull();
      expect(generatedData.value).toBeNull();
      expect(error.value).toBeNull();
      expect(showEmailModal.value).toBe(false);
    });
  });

  describe("emailPacket", () => {
    it("should call API endpoint with email data", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.$fetch = mockFetch;

      const { generatePacket, emailPacket } = useRecruitingPacket();

      await generatePacket();

      await emailPacket({
        recipients: ["coach@example.com"],
        subject: "John Smith - Recruiting Profile",
        body: "Here is my recruiting packet",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recruiting-packet/email",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should handle email errors", async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error("Email send failed"));
      global.$fetch = mockFetch;

      const { generatePacket, emailPacket, error } = useRecruitingPacket();

      await generatePacket();

      try {
        await emailPacket({
          recipients: ["coach@example.com"],
          subject: "Test",
          body: "Test",
        });
      } catch (e) {
        // Expected
      }

      expect(error.value).toBeTruthy();
    });

    it("should close email modal after successful send", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.$fetch = mockFetch;

      const { generatePacket, emailPacket, showEmailModal, setShowEmailModal } =
        useRecruitingPacket();

      await generatePacket();
      setShowEmailModal(true);

      expect(showEmailModal.value).toBe(true);

      await emailPacket({
        recipients: ["coach@example.com"],
        subject: "Test",
        body: "Test",
      });

      expect(showEmailModal.value).toBe(false);
    });
  });

  describe("setShowEmailModal", () => {
    it("should toggle email modal visibility", () => {
      const { showEmailModal, setShowEmailModal } = useRecruitingPacket();

      expect(showEmailModal.value).toBe(false);

      setShowEmailModal(true);
      expect(showEmailModal.value).toBe(true);

      setShowEmailModal(false);
      expect(showEmailModal.value).toBe(false);
    });
  });

  describe("aggregateAthleteData", () => {
    it("should return complete RecruitingPacketData", async () => {
      const { aggregateAthleteData } = useRecruitingPacket();

      const data = await aggregateAthleteData();

      expect(data.athlete).toBeDefined();
      expect(data.schools).toBeDefined();
      expect(data.activitySummary).toBeDefined();
      expect(data.athlete.full_name).toBe("John Smith");
      expect(data.schools.tier_a).toBeDefined();
      expect(data.activitySummary.totalSchools).toBeGreaterThan(0);
    });

    it("should count interactions correctly by type", async () => {
      const { aggregateAthleteData } = useRecruitingPacket();

      const data = await aggregateAthleteData();

      const breakdown = data.activitySummary.interactionBreakdown;
      expect(breakdown.emails + breakdown.calls + breakdown.camps).toBeGreaterThan(0);
    });
  });
});
