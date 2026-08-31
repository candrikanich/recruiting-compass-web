import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

const { useAthleteMessages } = await import("~/composables/useAthleteMessages");

const ATHLETE_ID = "11111111-1111-4111-8111-111111111111";
const SCHOOL_ID = "22222222-2222-4222-8222-222222222222";

describe("useAthleteMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logSend", () => {
    it("POSTs the message payload to /api/athlete/messages and returns the id", async () => {
      mockFetchAuth.mockResolvedValue({ success: true, id: "msg-1" });
      const { logSend } = useAthleteMessages();

      const input = {
        athleteUserId: ATHLETE_ID,
        schoolId: SCHOOL_ID,
        coachId: null,
        templateSlug: "intro-standard",
        channel: "email",
        programNote: "Team just won state",
        subject: "Interested in your program",
        body: "Hello coach...",
      };
      const result = await logSend(input);

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/athlete/messages", {
        method: "POST",
        body: input,
      });
      expect(result).toEqual({ success: true, id: "msg-1" });
    });

    it("propagates a rejected send so callers can surface the failure", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Failed to log message"));
      const { logSend } = useAthleteMessages();

      await expect(logSend({ athleteUserId: ATHLETE_ID })).rejects.toThrow(
        "Failed to log message",
      );
    });
  });

  describe("checkSend", () => {
    it("POSTs to /api/athlete/messages/check and returns the guardrail signals", async () => {
      const signals = {
        programNoteReused: false,
        daysSinceLastContact: 3,
        recentContact: true,
        messageCountToSchool: 2,
      };
      mockFetchAuth.mockResolvedValue(signals);
      const { checkSend } = useAthleteMessages();

      const input = {
        athleteUserId: ATHLETE_ID,
        schoolId: SCHOOL_ID,
        programNote: "Team just won state",
      };
      const result = await checkSend(input);

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/athlete/messages/check",
        { method: "POST", body: input },
      );
      expect(result).toEqual(signals);
    });

    it("surfaces a blocking programNoteReused signal", async () => {
      mockFetchAuth.mockResolvedValue({
        programNoteReused: true,
        daysSinceLastContact: null,
        recentContact: false,
        messageCountToSchool: 0,
      });
      const { checkSend } = useAthleteMessages();

      const result = await checkSend({
        athleteUserId: ATHLETE_ID,
        schoolId: SCHOOL_ID,
        programNote: "Same note reused elsewhere",
      });

      expect(result.programNoteReused).toBe(true);
    });
  });
});
