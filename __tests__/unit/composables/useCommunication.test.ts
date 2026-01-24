import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useCommunication } from "~/composables/useCommunication";
import type { Coach } from "~/types/models";

// Mock composables
const mockCreateInteraction = vi.fn();
const mockUpdateCoach = vi.fn();

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: () => ({
    createInteraction: mockCreateInteraction,
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    updateCoach: mockUpdateCoach,
  }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  }),
}));

describe("useCommunication", () => {
  let mockCoach: Coach;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCoach = {
      id: "coach-1",
      school_id: "school-1",
      user_id: "user-1",
      role: "head",
      first_name: "John",
      last_name: "Smith",
      email: "john.smith@university.edu",
      phone: "5551234567",
      twitter_handle: "coach_smith",
      instagram_handle: null,
      notes: null,
      responsiveness_score: 0,
      last_contact_date: null,
    };

    // Mock successful database operations
    mockCreateInteraction.mockResolvedValue({ id: "interaction-1" });
    mockUpdateCoach.mockResolvedValue({ id: "coach-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("State Management", () => {
    it("should initialize with correct default state", () => {
      const { showPanel, selectedCoach, communicationType } =
        useCommunication();

      expect(showPanel.value).toBe(false);
      expect(selectedCoach.value).toBe(null);
      expect(communicationType.value).toBe("email");
    });

    it("should be composable (multiple instances have independent state)", () => {
      const instance1 = useCommunication();
      const instance2 = useCommunication();

      instance1.selectedCoach.value = mockCoach;
      expect(instance2.selectedCoach.value).not.toBe(mockCoach);
    });
  });

  describe("openCommunication", () => {
    it("should set selectedCoach and communicationType for email", () => {
      const { openCommunication, showPanel, selectedCoach, communicationType } =
        useCommunication();

      openCommunication(mockCoach, "email");

      expect(showPanel.value).toBe(true);
      expect(selectedCoach.value).toEqual(mockCoach);
      expect(communicationType.value).toBe("email");
    });

    it("should set selectedCoach and communicationType for text", () => {
      const { openCommunication, showPanel, selectedCoach, communicationType } =
        useCommunication();

      openCommunication(mockCoach, "text");

      expect(showPanel.value).toBe(true);
      expect(selectedCoach.value).toEqual(mockCoach);
      expect(communicationType.value).toBe("text");
    });

    it("should set selectedCoach and communicationType for twitter", () => {
      const { openCommunication, showPanel, selectedCoach, communicationType } =
        useCommunication();

      openCommunication(mockCoach, "twitter");

      expect(showPanel.value).toBe(true);
      expect(selectedCoach.value).toEqual(mockCoach);
      expect(communicationType.value).toBe("twitter");
    });

    it("should update state when called multiple times", () => {
      const { openCommunication, selectedCoach, communicationType } =
        useCommunication();

      openCommunication(mockCoach, "email");
      expect(communicationType.value).toBe("email");

      openCommunication(mockCoach, "text");
      expect(communicationType.value).toBe("text");
    });
  });

  describe("handleInteractionLogged", () => {
    it("should create interaction record with correct email data", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        subject: "Test Email",
        content: "Email body content",
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        coach_id: "coach-1",
        school_id: "school-1",
        type: "email",
        direction: "outbound",
        subject: "Test Email",
        content: "Email body content",
        logged_by: "test-user-id",
        occurred_at: expect.any(String),
      });
    });

    it("should create interaction record with correct text data", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "text");

      await handleInteractionLogged({
        type: "text",
        content: "Text message content",
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        coach_id: "coach-1",
        school_id: "school-1",
        type: "text",
        direction: "outbound",
        subject: "",
        content: "Text message content",
        logged_by: "test-user-id",
        occurred_at: expect.any(String),
      });
    });

    it("should create interaction record with correct twitter data", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "twitter");

      await handleInteractionLogged({
        type: "tweet",
        body: "Tweet content",
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        coach_id: "coach-1",
        school_id: "school-1",
        type: "tweet",
        direction: "outbound",
        subject: "",
        content: "Tweet content",
        logged_by: "test-user-id",
        occurred_at: expect.any(String),
      });
    });

    it("should update coach last_contact_date after interaction", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        subject: "Test",
        content: "Test content",
      });

      expect(mockUpdateCoach).toHaveBeenCalledWith("coach-1", {
        last_contact_date: expect.any(String),
      });
    });

    it("should close panel and reset state after successful interaction", async () => {
      const {
        openCommunication,
        handleInteractionLogged,
        showPanel,
        selectedCoach,
      } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        subject: "Test",
        content: "Test content",
      });

      expect(showPanel.value).toBe(false);
      expect(selectedCoach.value).toBe(null);
    });

    it("should call onSuccess callback after interaction logged", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();
      const onSuccessMock = vi.fn().mockResolvedValue(undefined);

      openCommunication(mockCoach, "email");

      await handleInteractionLogged(
        {
          type: "email",
          subject: "Test",
          content: "Test content",
        },
        onSuccessMock,
      );

      expect(onSuccessMock).toHaveBeenCalledOnce();
    });

    it("should NOT call onSuccess callback if not provided", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      // Should not throw error
      await expect(
        handleInteractionLogged({
          type: "email",
          subject: "Test",
          content: "Test content",
        }),
      ).resolves.toBeUndefined();
    });

    it("should return early if no coach is selected", async () => {
      const { handleInteractionLogged } = useCommunication();

      // Don't call openCommunication
      await handleInteractionLogged({
        type: "email",
        subject: "Test",
        content: "Test content",
      });

      expect(mockCreateInteraction).not.toHaveBeenCalled();
      expect(mockUpdateCoach).not.toHaveBeenCalled();
    });

    it("should throw error when createInteraction fails", async () => {
      mockCreateInteraction.mockRejectedValueOnce(new Error("Database error"));

      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await expect(
        handleInteractionLogged({
          type: "email",
          subject: "Test",
          content: "Test content",
        }),
      ).rejects.toThrow("Database error");
    });

    it("should throw error when updateCoach fails", async () => {
      mockCreateInteraction.mockResolvedValueOnce({ id: "interaction-1" });
      mockUpdateCoach.mockRejectedValueOnce(new Error("Update failed"));

      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await expect(
        handleInteractionLogged({
          type: "email",
          subject: "Test",
          content: "Test content",
        }),
      ).rejects.toThrow("Update failed");
    });

    it("should convert non-Error exceptions to Error objects", async () => {
      mockCreateInteraction.mockRejectedValueOnce("String error");

      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await expect(
        handleInteractionLogged({
          type: "email",
          subject: "Test",
          content: "Test content",
        }),
      ).rejects.toThrow("Failed to log interaction");
    });

    it("should use occurred_at timestamp for both interaction and coach update", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      const beforeTime = new Date().toISOString();
      await handleInteractionLogged({
        type: "email",
        subject: "Test",
        content: "Test content",
      });
      const afterTime = new Date().toISOString();

      const interactionCall = mockCreateInteraction.mock.calls[0][0];
      const updateCall = mockUpdateCoach.mock.calls[0][1];

      expect(interactionCall.occurred_at).toBeDefined();
      expect(updateCall.last_contact_date).toBeDefined();
      expect(interactionCall.occurred_at >= beforeTime).toBe(true);
      expect(interactionCall.occurred_at <= afterTime).toBe(true);
    });

    it("should use subject from interactionData if provided", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        subject: "Custom Subject",
        content: "Test content",
      });

      expect(mockCreateInteraction.mock.calls[0][0].subject).toBe(
        "Custom Subject",
      );
    });

    it("should default subject to empty string if not provided", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        content: "Test content",
      });

      expect(mockCreateInteraction.mock.calls[0][0].subject).toBe("");
    });

    it("should use content field if provided", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        content: "Email content field",
      });

      expect(mockCreateInteraction.mock.calls[0][0].content).toBe(
        "Email content field",
      );
    });

    it("should fallback to body field if content not provided", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        body: "Email body field",
      });

      expect(mockCreateInteraction.mock.calls[0][0].content).toBe(
        "Email body field",
      );
    });

    it("should prefer content over body if both provided", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      openCommunication(mockCoach, "email");

      await handleInteractionLogged({
        type: "email",
        content: "Content field",
        body: "Body field",
      });

      expect(mockCreateInteraction.mock.calls[0][0].content).toBe(
        "Content field",
      );
    });
  });

  describe("Exports", () => {
    it("should export all required state properties", () => {
      const composable = useCommunication();

      expect(composable.showPanel).toBeDefined();
      expect(composable.selectedCoach).toBeDefined();
      expect(composable.communicationType).toBeDefined();
    });

    it("should export all required methods", () => {
      const composable = useCommunication();

      expect(typeof composable.openCommunication).toBe("function");
      expect(typeof composable.handleInteractionLogged).toBe("function");
    });

    it("should return refs (not raw values) for reactive state", () => {
      const { showPanel, selectedCoach, communicationType } =
        useCommunication();

      expect(showPanel).toHaveProperty("value");
      expect(selectedCoach).toHaveProperty("value");
      expect(communicationType).toHaveProperty("value");
    });
  });

  describe("Integration Flow", () => {
    it("should support complete email flow", async () => {
      const {
        openCommunication,
        handleInteractionLogged,
        showPanel,
        selectedCoach,
      } = useCommunication();

      // Step 1: Open communication panel
      openCommunication(mockCoach, "email");
      expect(showPanel.value).toBe(true);
      expect(selectedCoach.value).toEqual(mockCoach);

      // Step 2: Log interaction
      await handleInteractionLogged({
        type: "email",
        subject: "Follow-up email",
        content: "Thanks for the camp invitation!",
      });

      // Step 3: Verify state reset
      expect(showPanel.value).toBe(false);
      expect(selectedCoach.value).toBe(null);

      // Step 4: Verify database calls
      expect(mockCreateInteraction).toHaveBeenCalledOnce();
      expect(mockUpdateCoach).toHaveBeenCalledOnce();
    });

    it("should support switching communication types", async () => {
      const { openCommunication, communicationType } = useCommunication();

      openCommunication(mockCoach, "email");
      expect(communicationType.value).toBe("email");

      openCommunication(mockCoach, "text");
      expect(communicationType.value).toBe("text");

      openCommunication(mockCoach, "twitter");
      expect(communicationType.value).toBe("twitter");
    });

    it("should support multiple coaches sequentially", async () => {
      const { openCommunication, handleInteractionLogged } = useCommunication();

      const coach2: Coach = { ...mockCoach, id: "coach-2", first_name: "Jane" };

      // First coach
      openCommunication(mockCoach, "email");
      await handleInteractionLogged({ type: "email", content: "First email" });

      // Second coach
      openCommunication(coach2, "email");
      await handleInteractionLogged({ type: "email", content: "Second email" });

      expect(mockCreateInteraction).toHaveBeenCalledTimes(2);
      expect(mockCreateInteraction.mock.calls[0][0].coach_id).toBe("coach-1");
      expect(mockCreateInteraction.mock.calls[1][0].coach_id).toBe("coach-2");
    });
  });
});
