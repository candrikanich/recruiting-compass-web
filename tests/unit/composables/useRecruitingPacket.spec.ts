import { describe, it, expect, beforeEach, vi } from "vitest";
import { useRecruitingPacket } from "~/composables/useRecruitingPacket";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useInteractions } from "~/composables/useInteractions";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useNuxtApp } from "#app";
import type { School, Interaction, PlayerDetails } from "~/types/models";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));
vi.mock("~/stores/user");
vi.mock("~/composables/useSchools");
vi.mock("~/composables/useCoaches");
vi.mock("~/composables/useInteractions");
vi.mock("~/composables/usePreferenceManager");

const mockPlayerDetails: PlayerDetails = {
  height_inches: 74,
  weight_lbs: 190,
  positions: ["Pitcher"],
  school_name: "Central High",
  graduation_year: 2025,
  gpa: 3.8,
  sat_score: 1450,
  act_score: 33,
  twitter_handle: "jsmith",
  instagram_handle: "johnsmith",
  tiktok_handle: "",
};

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
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    notes: null,
    pros: [],
    cons: [],
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
    website: null,
    favicon_url: null,
    twitter_handle: null,
    instagram_handle: null,
    notes: null,
    pros: [],
    cons: [],
  },
];

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

describe("useRecruitingPacket", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUserStore).mockReturnValue({
      user: {
        id: "user-1",
        email: "john@example.com",
        full_name: "John Smith",
        profile_photo_url: null,
      },
    } as any);

    vi.mocked(usePreferenceManager).mockReturnValue({
      playerPrefs: { loadPreferences: vi.fn().mockResolvedValue(undefined) },
      getPlayerDetails: vi.fn().mockReturnValue(mockPlayerDetails),
    } as any);

    vi.mocked(useSchools).mockReturnValue({
      schools: { value: mockSchoolData },
    } as any);

    vi.mocked(useCoaches).mockReturnValue({
      coaches: {
        value: [
          { id: "coach-1", school_id: "school-1", first_name: "Mike", last_name: "Coach" },
          { id: "coach-2", school_id: "school-1", first_name: "Sarah", last_name: "Assistant" },
        ],
      },
    } as any);

    vi.mocked(useInteractions).mockReturnValue({
      interactions: { value: mockInteractionData },
    } as any);
  });

  describe("Initial state", () => {
    it("initializes with correct state", () => {
      const { loading, error, hasGeneratedPacket, generatedHtml } = useRecruitingPacket();

      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(hasGeneratedPacket.value).toBe(false);
      expect(generatedHtml.value).toBeNull();
    });
  });

  describe("fetchAthleteData", () => {
    it("formats height from inches to feet/inches string", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.height).toBe("6'2\"");
    });

    it("formats weight with lbs suffix", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.weight).toBe("190 lbs");
    });

    it("maps social media flat fields to platform array, excluding empty handles", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.social_media).toContainEqual({ platform: "twitter", handle: "jsmith" });
      expect(result.data.athlete.social_media).toContainEqual({ platform: "instagram", handle: "johnsmith" });
      expect(result.data.athlete.social_media).not.toContainEqual(expect.objectContaining({ platform: "tiktok" }));
    });

    it("uses first position from positions array", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.position).toBe("Pitcher");
    });

    it("sets athlete name from userStore.user.full_name", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.full_name).toBe("John Smith");
    });

    it("passes gpa, sat_score, act_score from PlayerDetails", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.gpa).toBe(3.8);
      expect(result.data.athlete.sat_score).toBe(1450);
      expect(result.data.athlete.act_score).toBe(33);
    });

    it("defaults video_links to empty array when not set", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.video_links).toEqual([]);
    });

    it("defaults core_courses to empty array when not set", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.core_courses).toEqual([]);
    });

    it("returns undefined height when height_inches is not set", async () => {
      vi.mocked(usePreferenceManager).mockReturnValue({
        playerPrefs: { loadPreferences: vi.fn().mockResolvedValue(undefined) },
        getPlayerDetails: vi.fn().mockReturnValue({ ...mockPlayerDetails, height_inches: undefined }),
      } as any);
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.height).toBeUndefined();
    });

    it("returns undefined weight when weight_lbs is not set", async () => {
      vi.mocked(usePreferenceManager).mockReturnValue({
        playerPrefs: { loadPreferences: vi.fn().mockResolvedValue(undefined) },
        getPlayerDetails: vi.fn().mockReturnValue({ ...mockPlayerDetails, weight_lbs: undefined }),
      } as any);
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.data.athlete.weight).toBeUndefined();
    });
  });

  describe("generatePacket", () => {
    it("successfully generates packet with all data", async () => {
      const { generatePacket, loading, error, generatedHtml } = useRecruitingPacket();

      expect(loading.value).toBe(false);

      const result = await generatePacket();

      expect(error.value).toBeNull();
      expect(generatedHtml.value).toBeTruthy();
      expect(result.html).toBeTruthy();
      expect(result.filename).toBeTruthy();
      expect(result.data).toBeTruthy();
    });

    it("includes athlete data in generated packet", async () => {
      const { generatePacket, generatedData } = useRecruitingPacket();

      await generatePacket();

      expect(generatedData.value?.athlete.full_name).toBe("John Smith");
      expect(generatedData.value?.athlete.email).toBe("john@example.com");
    });

    it("groups schools by tier", async () => {
      const { generatePacket, generatedData } = useRecruitingPacket();

      await generatePacket();

      expect(generatedData.value?.schools.tier_a).toBeDefined();
      expect(generatedData.value?.schools.tier_b).toBeDefined();
      expect(generatedData.value?.schools.tier_c).toBeDefined();

      // UT should be in tier_a (offer_received)
      expect(generatedData.value?.schools.tier_a.some((s) => s.id === "school-1")).toBe(true);

      // Rice should be in tier_b (camp_invite)
      expect(generatedData.value?.schools.tier_b.some((s) => s.id === "school-2")).toBe(true);
    });

    it("calculates activity summary", async () => {
      const { generatePacket, generatedData } = useRecruitingPacket();

      await generatePacket();

      expect(generatedData.value?.activitySummary.totalSchools).toBe(2);
      expect(generatedData.value?.activitySummary.totalInteractions).toBe(3);
      expect(generatedData.value?.activitySummary.interactionBreakdown.emails).toBe(1);
      expect(generatedData.value?.activitySummary.interactionBreakdown.calls).toBe(1);
      expect(generatedData.value?.activitySummary.interactionBreakdown.camps).toBe(1);
    });

    it("generates valid filename", async () => {
      const { generatePacket } = useRecruitingPacket();
      const result = await generatePacket();
      expect(result.filename).toBe("John_Smith_RecruitingPacket.pdf");
    });

    it("captures recruiting_packet_generated event on success", async () => {
      const mockCapture = vi.fn();
      vi.mocked(useNuxtApp).mockReturnValue({ $posthog: { capture: mockCapture } } as ReturnType<typeof useNuxtApp>);

      const { generatePacket } = useRecruitingPacket();
      await generatePacket();

      expect(mockCapture).toHaveBeenCalledWith("recruiting_packet_generated");
    });

    it("sets loading state to true during generation and false after", async () => {
      const { generatePacket, loading } = useRecruitingPacket();
      expect(loading.value).toBe(false);
      const promise = generatePacket();
      expect(loading.value).toBe(true);
      await promise;
      expect(loading.value).toBe(false);
    });

    it("handles errors gracefully", async () => {
      vi.mocked(usePreferenceManager).mockReturnValue({
        playerPrefs: { loadPreferences: vi.fn().mockRejectedValue(new Error("Load failed")) },
        getPlayerDetails: vi.fn().mockReturnValue(null),
      } as any);

      const { generatePacket, error } = useRecruitingPacket();

      try {
        await generatePacket();
      } catch {
        // Expected
      }

      expect(error.value).toBeTruthy();
    });
  });

  describe("openPacketPreview", () => {
    it("opens new window with packet HTML", async () => {
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
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

    it("generates packet if not already generated", async () => {
      const mockWindow = {
        document: { write: vi.fn(), close: vi.fn() },
      };
      vi.spyOn(window, "open").mockReturnValue(mockWindow as any);

      const { openPacketPreview, hasGeneratedPacket } = useRecruitingPacket();

      expect(hasGeneratedPacket.value).toBe(false);

      await openPacketPreview();

      expect(hasGeneratedPacket.value).toBe(true);
      expect(window.open).toHaveBeenCalled();
    });

    it("handles window.open returning null", async () => {
      const mockOpen = vi.fn().mockReturnValue(null);
      global.window.open = mockOpen;

      const { openPacketPreview, generatePacket, error } = useRecruitingPacket();

      await generatePacket();

      try {
        await openPacketPreview();
      } catch {
        // Expected
      }

      expect(error.value).toBeTruthy();
    });
  });

  describe("downloadPacket", () => {
    it("calls window.print()", () => {
      const mockPrint = vi.fn();
      global.window.print = mockPrint;

      const { downloadPacket } = useRecruitingPacket();
      downloadPacket();

      expect(mockPrint).toHaveBeenCalled();
    });
  });

  describe("resetPacket", () => {
    it("clears all generated data", async () => {
      const { generatePacket, resetPacket, generatedHtml, generatedData, error, showEmailModal } =
        useRecruitingPacket();

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
    it("calls API endpoint with email data", async () => {
      mockFetchAuth.mockResolvedValue({ ok: true });

      const { generatePacket, emailPacket } = useRecruitingPacket();

      await generatePacket();

      await emailPacket({
        recipients: ["coach@example.com"],
        subject: "John Smith - Recruiting Profile",
        body: "Here is my recruiting packet",
      });

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/recruiting-packet/email",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("handles email errors", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Email send failed"));

      const { generatePacket, emailPacket, error } = useRecruitingPacket();

      await generatePacket();

      try {
        await emailPacket({ recipients: ["coach@example.com"], subject: "Test", body: "Test" });
      } catch {
        // Expected
      }

      expect(error.value).toBeTruthy();
    });

    it("closes email modal after successful send", async () => {
      mockFetchAuth.mockResolvedValue({ ok: true });

      const { generatePacket, emailPacket, showEmailModal, setShowEmailModal } =
        useRecruitingPacket();

      await generatePacket();
      setShowEmailModal(true);

      expect(showEmailModal.value).toBe(true);

      await emailPacket({ recipients: ["coach@example.com"], subject: "Test", body: "Test" });

      expect(showEmailModal.value).toBe(false);
    });
  });

  describe("setShowEmailModal", () => {
    it("toggles email modal visibility", () => {
      const { showEmailModal, setShowEmailModal } = useRecruitingPacket();

      expect(showEmailModal.value).toBe(false);
      setShowEmailModal(true);
      expect(showEmailModal.value).toBe(true);
      setShowEmailModal(false);
      expect(showEmailModal.value).toBe(false);
    });
  });

  describe("aggregateAthleteData", () => {
    it("returns complete RecruitingPacketData", async () => {
      const { aggregateAthleteData } = useRecruitingPacket();

      const data = await aggregateAthleteData();

      expect(data.athlete).toBeDefined();
      expect(data.schools).toBeDefined();
      expect(data.activitySummary).toBeDefined();
      expect(data.athlete.full_name).toBe("John Smith");
      expect(data.schools.tier_a).toBeDefined();
      expect(data.activitySummary.totalSchools).toBeGreaterThan(0);
    });

    it("counts interactions correctly by type", async () => {
      const { aggregateAthleteData } = useRecruitingPacket();

      const data = await aggregateAthleteData();

      const breakdown = data.activitySummary.interactionBreakdown;
      expect(breakdown.emails).toBe(1);
      expect(breakdown.calls).toBe(1);
      expect(breakdown.camps).toBe(1);
      expect(breakdown.visits).toBe(0);
      expect(breakdown.other).toBe(0);
    });
  });

  describe("Email defaults", () => {
    it("generates default subject with athlete name", async () => {
      const { generatePacket, defaultEmailSubject } = useRecruitingPacket();

      await generatePacket();

      expect(defaultEmailSubject.value).toContain("John Smith");
      expect(defaultEmailSubject.value).toContain("Recruiting Profile");
      expect(defaultEmailSubject.value).toBe("John Smith - Recruiting Profile");
    });

    it("generates default body with athlete details", async () => {
      const { generatePacket, defaultEmailBody } = useRecruitingPacket();

      await generatePacket();

      expect(defaultEmailBody.value).toContain("John Smith");
      expect(defaultEmailBody.value).toContain("Dear Coach");
      expect(defaultEmailBody.value).toContain("Pitcher");
      expect(defaultEmailBody.value).toContain("2025");
    });

    it("includes professional intro in email body", async () => {
      const { generatePacket, defaultEmailBody } = useRecruitingPacket();

      await generatePacket();

      expect(defaultEmailBody.value).toContain("recruiting profile");
      expect(defaultEmailBody.value).toContain("collegiate opportunities");
      expect(defaultEmailBody.value).toContain("Best regards");
    });
  });
});
