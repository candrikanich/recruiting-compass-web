import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { Interaction, FollowUpReminder } from "~/types/models";

// Factory functions to create fresh mock instances per test
const createMockQuery = () => {
  let testResponse = { data: [], error: null };

  const mockQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    single: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
  };

  // Make each chainable method return the mock query itself
  mockQuery.select.mockReturnValue(mockQuery);
  mockQuery.eq.mockReturnValue(mockQuery);
  mockQuery.order.mockReturnValue(mockQuery);
  mockQuery.insert.mockReturnValue(mockQuery);
  mockQuery.update.mockReturnValue(mockQuery);
  mockQuery.delete.mockReturnValue(mockQuery);
  mockQuery.single.mockReturnValue(mockQuery);
  mockQuery.gte.mockReturnValue(mockQuery);
  mockQuery.lte.mockReturnValue(mockQuery);

  // Make mockQuery thenable with a proper .then() method
  Object.defineProperty(mockQuery, "then", {
    value: (
      onFulfilled: (value: any) => any,
      onRejected?: (reason: any) => any,
    ) => {
      return Promise.resolve(testResponse).then(onFulfilled, onRejected);
    },
  });

  // Allow tests to set the response data
  mockQuery.__setTestResponse = (response: any) => {
    testResponse = response;
  };

  return mockQuery;
};

const createMockSupabase = () => ({
  from: vi.fn().mockReturnValue(createMockQuery()),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  },
});

const createMockUser = () => ({
  id: "user-123",
  email: "test@example.com",
  role: "player",
});

// These will be reassigned in beforeEach
let mockSupabase = createMockSupabase();
let mockUser = createMockUser();

describe("useInteractions - Advanced Lifecycle", () => {
  let mockQuery: any;
  let useInteractions: any;
  let useUserStore: any;

  beforeEach(async () => {
    // Clear module cache to reimport with fresh mocks
    vi.resetModules();

    // Create fresh mock instances for this test
    mockSupabase = createMockSupabase();
    mockQuery = createMockQuery();
    mockUser = createMockUser();

    // Register fresh mocks for this test
    vi.doMock("~/composables/useSupabase", () => ({
      useSupabase: () => mockSupabase,
    }));

    vi.doMock("~/stores/user", () => ({
      useUserStore: () => ({
        get user() {
          return mockUser;
        },
        loading: false,
        isAuthenticated: true,
      }),
    }));

    vi.doMock("~/composables/useActiveFamily", () => ({
      useActiveFamily: () => ({
        activeFamilyId: { value: "family-123" },
        activeAthleteId: { value: "athlete-123" },
        isParentViewing: { value: false },
        familyMembers: { value: [] },
        getAccessibleAthletes: () => [],
        getDataOwnerUserId: () => "athlete-123",
        switchAthlete: vi.fn(),
        initializeFamily: vi.fn(),
        fetchFamilyMembers: vi.fn(),
        loading: { value: false },
        error: { value: null },
      }),
    }));

    vi.doMock("~/composables/useFamilyContext", () => ({
      useFamilyContext: () => ({
        activeFamilyId: { value: "family-123" },
        activeAthleteId: { value: "athlete-123" },
        isParentViewing: { value: false },
        familyMembers: { value: [] },
        getAccessibleAthletes: () => [],
        getDataOwnerUserId: () => "athlete-123",
        switchAthlete: vi.fn(),
        initializeFamily: vi.fn(),
        fetchFamilyMembers: vi.fn(),
        loading: { value: false },
        error: { value: null },
      }),
    }));

    vi.doMock("~/composables/useToast", () => ({
      useToast: () => ({
        showToast: vi.fn(),
      }),
    }));

    // Mock utils
    vi.doMock("~/utils/interactions/exportCSV", () => ({
      exportInteractionsToCSV: vi.fn().mockReturnValue("csv data"),
      downloadInteractionsCSV: vi.fn(),
    }));

    vi.doMock("~/utils/interactions/attachments", () => ({
      validateAttachmentFile: vi.fn(),
      uploadInteractionAttachments: vi.fn().mockResolvedValue(["path/to/file"]),
    }));

    vi.doMock("~/utils/interactions/inboundAlerts", () => ({
      createInboundInteractionAlert: vi.fn().mockResolvedValue(null),
    }));

    vi.doMock("~/utils/validation/sanitize", () => ({
      sanitizeHtml: vi.fn((html) => html),
    }));

    vi.doMock("~/utils/validation/schemas", () => ({
      interactionSchema: {
        parseAsync: vi.fn((data) => Promise.resolve(data)),
      },
    }));

    // Set up mockSupabase.from to return the chainable mockQuery
    mockSupabase.from.mockReturnValue(mockQuery);

    // Dynamically import after mocks are registered
    const composableModule = await import("~/composables/useInteractions");
    useInteractions = composableModule.useInteractions;

    const storeModule = await import("~/stores/user");
    useUserStore = storeModule.useUserStore;

    // Reset Pinia after mocks are set up
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockInteraction = (overrides = {}): Interaction => ({
    id: "550e8400-e29b-41d4-a716-446655440000",
    user_id: "550e8400-e29b-41d4-a716-446655440001",
    school_id: "550e8400-e29b-41d4-a716-446655440002",
    coach_id: "550e8400-e29b-41d4-a716-446655440003",
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Recruiting Inquiry",
    content: "Hello, interested in your program",
    sentiment: "positive",
    occurred_at: "2025-12-20T10:00:00Z",
    created_at: "2025-12-20T10:00:00Z",
    updated_at: "2025-12-20T10:00:00Z",
    logged_by: "user-123",
    attachments: [],
    ...overrides,
  });

  const createMockReminder = (overrides = {}): FollowUpReminder => ({
    id: "reminder-123",
    user_id: "user-123",
    title: "Follow up",
    notes: "Test reminder",
    reminder_date: "2025-12-25",
    reminder_type: "email",
    is_completed: false,
    completed_at: null,
    school_id: "school-123",
    coach_id: "coach-123",
    interaction_id: null,
    priority: "medium",
    due_date: "2025-12-25",
    created_at: "2025-12-20T10:00:00Z",
    updated_at: "2025-12-20T10:00:00Z",
    ...overrides,
  });

  describe("createInteraction - Success Cases", () => {
    it("should create interaction with valid data", async () => {
      const newInteraction = createMockInteraction();
      const insertMock = vi.fn().mockReturnValue(mockQuery);
      mockQuery.insert = insertMock;
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null });

      const { createInteraction } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } = newInteraction;

      const result = await createInteraction(interactionData);

      expect(result).toEqual(newInteraction);
      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
      expect(insertMock).toHaveBeenCalled();
    });

    it("should include user id and family id in created interaction", async () => {
      const newInteraction = createMockInteraction({
        logged_by: "user-123",
      });
      const insertMock = vi.fn().mockReturnValue(mockQuery);
      mockQuery.insert = insertMock;
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null });

      const { createInteraction } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } = newInteraction;

      await createInteraction(interactionData);

      const insertedData = insertMock.mock.calls[0][0][0];
      expect(insertedData.logged_by).toBe("user-123");
      expect(insertedData.family_unit_id).toBe("family-123");
    });

    it("should update local interactions array after creation", async () => {
      const newInteraction = createMockInteraction();
      mockQuery.insert = vi.fn().mockReturnValue(mockQuery);
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null });

      const { createInteraction, interactions } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } = newInteraction;

      await createInteraction(interactionData);

      expect(interactions.value).toContainEqual(newInteraction);
    });
  });

  describe("createInteraction - Error Cases", () => {
    it("should throw error when user not authenticated", async () => {
      mockUser = null;

      const { createInteraction } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } =
        createMockInteraction();

      await expect(createInteraction(interactionData)).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("should throw error when user is not a player", async () => {
      mockUser = { ...createMockUser(), role: "parent" };

      const { createInteraction } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } =
        createMockInteraction();

      await expect(createInteraction(interactionData)).rejects.toThrow(
        "Only players can create interactions",
      );
    });

    it("should throw error when no family context", async () => {
      vi.resetModules();

      mockSupabase = createMockSupabase();
      mockQuery = createMockQuery();
      mockUser = createMockUser();

      vi.doMock("~/composables/useSupabase", () => ({
        useSupabase: () => mockSupabase,
      }));

      vi.doMock("~/stores/user", () => ({
        useUserStore: () => ({
          get user() {
            return mockUser;
          },
        }),
      }));

      vi.doMock("~/composables/useActiveFamily", () => ({
        useActiveFamily: () => ({
          activeFamilyId: { value: null }, // No family
          getDataOwnerUserId: () => "user-123",
        }),
      }));

      vi.doMock("~/composables/useFamilyContext", () => ({
        useFamilyContext: () => ({
          activeFamilyId: { value: null },
          getDataOwnerUserId: () => "user-123",
        }),
      }));

      vi.doMock("~/composables/useToast", () => ({
        useToast: () => ({
          showToast: vi.fn(),
        }),
      }));

      vi.doMock("~/utils/interactions/exportCSV", () => ({
        exportInteractionsToCSV: vi.fn(),
        downloadInteractionsCSV: vi.fn(),
      }));

      vi.doMock("~/utils/interactions/attachments", () => ({
        validateAttachmentFile: vi.fn(),
        uploadInteractionAttachments: vi.fn(),
      }));

      vi.doMock("~/utils/interactions/inboundAlerts", () => ({
        createInboundInteractionAlert: vi.fn(),
      }));

      vi.doMock("~/utils/validation/sanitize", () => ({
        sanitizeHtml: vi.fn((html) => html),
      }));

      vi.doMock("~/utils/validation/schemas", () => ({
        interactionSchema: {
          parseAsync: vi.fn((data) => Promise.resolve(data)),
        },
      }));

      mockSupabase.from.mockReturnValue(mockQuery);

      const module = await import("~/composables/useInteractions");
      useInteractions = module.useInteractions;

      const { createInteraction } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } =
        createMockInteraction();

      await expect(createInteraction(interactionData)).rejects.toThrow(
        "No family context available",
      );
    });

    it("should set error state on database insert failure", async () => {
      const mockError = new Error("Database insert failed");
      mockQuery.insert = vi.fn().mockReturnValue(mockQuery);
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const { createInteraction, error } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } =
        createMockInteraction();

      try {
        await createInteraction(interactionData);
      } catch (e) {
        // Expected error
      }

      expect(error.value).toBe("Database insert failed");
    });

    it("should sanitize HTML content before creating", async () => {
      const newInteraction = createMockInteraction({
        subject: "<script>alert('xss')</script>",
        content: "<img src=x onerror='alert(1)'>",
      });
      mockQuery.insert = vi.fn().mockReturnValue(mockQuery);
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: newInteraction, error: null });

      const { createInteraction } = useInteractions();
      const { id, created_at, updated_at, ...interactionData } =
        createMockInteraction({
          subject: "<script>alert('xss')</script>",
          content: "<img src=x onerror='alert(1)'>",
        });

      await createInteraction(interactionData);

      expect(mockSupabase.from).toHaveBeenCalledWith("interactions");
    });
  });

  describe("updateInteraction - Success Cases", () => {
    it("should update interaction with valid changes", async () => {
      const updatedInteraction = createMockInteraction({
        subject: "Updated Subject",
        content: "Updated content",
      });
      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: updatedInteraction,
        error: null,
      });

      const { updateInteraction } = useInteractions();

      const result = await updateInteraction("interaction-123", {
        subject: "Updated Subject",
        content: "Updated content",
      });

      expect(result).toEqual(updatedInteraction);
      expect(mockQuery.update).toHaveBeenCalledWith({
        subject: "Updated Subject",
        content: "Updated content",
      });
    });

    it("should handle update for non-existent interaction", async () => {
      const updatedInteraction = createMockInteraction({
        id: "interaction-456",
        subject: "Updated Subject",
      });

      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: updatedInteraction,
        error: null,
      });

      const { updateInteraction } = useInteractions();
      const result = await updateInteraction("interaction-456", {
        subject: "Updated Subject",
      });

      expect(result).toEqual(updatedInteraction);
      expect(mockQuery.update).toHaveBeenCalledWith({
        subject: "Updated Subject",
      });
    });
  });

  describe("updateInteraction - Error Cases", () => {
    it("should throw error when user not authenticated", async () => {
      mockUser = null;

      const { updateInteraction } = useInteractions();

      await expect(
        updateInteraction("interaction-123", { subject: "New Subject" }),
      ).rejects.toThrow("User not authenticated");
    });

    it("should set error state on update failure", async () => {
      const mockError = new Error("Permission denied");
      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const { updateInteraction, error } = useInteractions();

      try {
        await updateInteraction("interaction-123", { subject: "New Subject" });
      } catch (e) {
        // Expected error
      }

      expect(error.value).toBe("Permission denied");
    });

    it("should sanitize HTML in update operations", async () => {
      const updatedInteraction = createMockInteraction({
        subject: "Safe Subject",
      });
      const updateMock = vi.fn().mockReturnValue(mockQuery);
      mockQuery.update = updateMock;
      mockQuery.single.mockResolvedValue({
        data: updatedInteraction,
        error: null,
      });

      const { updateInteraction } = useInteractions();

      await updateInteraction("interaction-123", {
        subject: "<script>xss</script>",
      });

      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe("deleteInteraction - Success Cases", () => {
    it("should delete interaction successfully", async () => {
      const interactionToDelete = createMockInteraction({
        id: "interaction-123",
      });

      // Delete the interaction
      mockQuery.delete = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({ data: null, error: null });

      const { deleteInteraction } = useInteractions();
      await deleteInteraction("interaction-123");

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "interaction-123");
      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", "user-123");
    });

    it("should call delete method when deleting interaction", async () => {
      const deleteMock = vi.fn().mockReturnValue(mockQuery);
      mockQuery.delete = deleteMock;

      const { deleteInteraction } = useInteractions();
      await deleteInteraction("interaction-789");

      expect(deleteMock).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "interaction-789");
    });
  });

  describe("deleteInteraction - Error Cases", () => {
    it("should throw error when user not authenticated", async () => {
      mockUser = null;

      const { deleteInteraction } = useInteractions();

      await expect(deleteInteraction("interaction-123")).rejects.toThrow(
        "User not authenticated",
      );
    });

    it("should set error state on delete failure", async () => {
      const mockError = new Error("Interaction not found");
      mockQuery.delete = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({ data: null, error: mockError });

      const { deleteInteraction, error } = useInteractions();

      try {
        await deleteInteraction("nonexistent-id");
      } catch (e) {
        // Expected error
      }

      expect(error.value).toBe("Interaction not found");
    });

    it("should not remove interaction if deletion fails", async () => {
      const interaction = createMockInteraction({ id: "interaction-123" });

      mockQuery.__setTestResponse({ data: [interaction], error: null });

      const { fetchInteractions, interactions } = useInteractions();
      await fetchInteractions();

      expect(interactions.value.length).toBe(1);

      const mockError = new Error("Delete failed");
      mockQuery.delete = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({ data: null, error: mockError });

      const { deleteInteraction } = useInteractions();

      try {
        await deleteInteraction("interaction-123");
      } catch (e) {
        // Expected error
      }

      expect(interactions.value.length).toBe(1);
    });
  });

  describe("getInteraction", () => {
    it("should fetch single interaction by id", async () => {
      const mockInteraction = createMockInteraction();
      mockQuery.single.mockResolvedValue({
        data: mockInteraction,
        error: null,
      });

      const { getInteraction } = useInteractions();
      const result = await getInteraction("interaction-123");

      expect(result).toEqual(mockInteraction);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "interaction-123");
    });

    it("should return null on fetch error", async () => {
      const mockError = new Error("Not found");
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const { getInteraction } = useInteractions();
      const result = await getInteraction("nonexistent");

      expect(result).toBeNull();
    });

    it("should set error state on fetch failure", async () => {
      const mockError = new Error("Fetch error");
      mockQuery.single.mockResolvedValue({ data: null, error: mockError });

      const { getInteraction, error } = useInteractions();
      await getInteraction("interaction-123");

      expect(error.value).toBe("Fetch error");
    });
  });

  describe("Reminder Management - Success Cases", () => {
    it("should load reminders", async () => {
      const mockReminders = [
        createMockReminder(),
        createMockReminder({ id: "reminder-456" }),
      ];
      mockQuery.__setTestResponse({ data: mockReminders, error: null });

      const { loadReminders, reminders } = useInteractions();
      await loadReminders();

      expect(reminders.value).toEqual(mockReminders);
    });

    it("should create reminder", async () => {
      const newReminder = createMockReminder();
      mockQuery.insert = vi.fn().mockReturnValue(mockQuery);
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: newReminder,
        error: null,
      });

      const { createReminder, reminders } = useInteractions();
      const result = await createReminder(
        "Follow up call",
        "2025-12-25",
        "email",
        "high",
      );

      expect(result).toEqual(newReminder);
      expect(reminders.value).toContainEqual(newReminder);
    });

    it("should complete reminder", async () => {
      const reminder = createMockReminder({ id: "reminder-123" });
      mockQuery.__setTestResponse({ data: [reminder], error: null });

      const { loadReminders, reminders, completeReminder } = useInteractions();
      await loadReminders();

      expect(reminders.value[0].is_completed).toBe(false);

      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({ data: null, error: null });

      const result = await completeReminder("reminder-123");

      expect(result).toBe(true);
      const updatedReminder = reminders.value.find(
        (r) => r.id === "reminder-123",
      );
      expect(updatedReminder?.is_completed).toBe(true);
    });

    it("should delete reminder", async () => {
      const reminder = createMockReminder({ id: "reminder-123" });
      mockQuery.__setTestResponse({ data: [reminder], error: null });

      const { loadReminders, reminders, deleteReminder } = useInteractions();
      await loadReminders();

      expect(reminders.value.length).toBe(1);

      mockQuery.delete = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({ data: null, error: null });

      const result = await deleteReminder("reminder-123");
      expect(result).toBe(true);
      expect(reminders.value.length).toBe(0);
    });

    it("should update reminder", async () => {
      const reminder = createMockReminder({ id: "reminder-123" });
      mockQuery.__setTestResponse({ data: [reminder], error: null });

      const { loadReminders, reminders } = useInteractions();
      await loadReminders();

      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({ data: null, error: null });

      const { updateReminder } = useInteractions();
      const success = await updateReminder("reminder-123", {
        is_completed: true,
      });

      expect(success).toBe(true);
    });
  });

  describe("Reminder Management - Error Cases", () => {
    it("should handle error when loading reminders fails", async () => {
      const mockError = new Error("Load failed");
      mockQuery.__setTestResponse({ data: null, error: mockError });

      const { loadReminders, remindersError } = useInteractions();
      await loadReminders();

      expect(remindersError.value).toBe("Load failed");
    });

    it("should handle error when creating reminder fails", async () => {
      mockQuery.insert = vi.fn().mockReturnValue(mockQuery);
      mockQuery.select = vi.fn().mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: null,
        error: new Error("Create failed"),
      });

      const { createReminder, remindersError } = useInteractions();
      const result = await createReminder(
        "Test reminder",
        "2025-12-25",
        "email",
      );

      expect(result).toBeNull();
      expect(remindersError.value).toBe("Create failed");
    });

    it("should handle error when completing reminder fails", async () => {
      const reminder = createMockReminder({ id: "reminder-123" });
      mockQuery.__setTestResponse({ data: [reminder], error: null });

      const { loadReminders } = useInteractions();
      await loadReminders();

      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({
        data: null,
        error: new Error("Update failed"),
      });

      const { completeReminder, remindersError } = useInteractions();
      const success = await completeReminder("reminder-123");

      expect(success).toBe(false);
      expect(remindersError.value).toBe("Update failed");
    });

    it("should handle error when deleting reminder fails", async () => {
      const reminder = createMockReminder({ id: "reminder-123" });
      mockQuery.__setTestResponse({ data: [reminder], error: null });

      const { loadReminders } = useInteractions();
      await loadReminders();

      mockQuery.delete = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({
        data: null,
        error: new Error("Delete failed"),
      });

      const { deleteReminder, remindersError } = useInteractions();
      const success = await deleteReminder("reminder-123");

      expect(success).toBe(false);
      expect(remindersError.value).toBe("Delete failed");
    });

    it("should handle error when updating reminder fails", async () => {
      const reminder = createMockReminder({ id: "reminder-123" });
      mockQuery.__setTestResponse({ data: [reminder], error: null });

      const { loadReminders } = useInteractions();
      await loadReminders();

      mockQuery.update = vi.fn().mockReturnValue(mockQuery);
      mockQuery.__setTestResponse({
        data: null,
        error: new Error("Update failed"),
      });

      const { updateReminder, remindersError } = useInteractions();
      const success = await updateReminder("reminder-123", {
        is_completed: true,
      });

      expect(success).toBe(false);
      expect(remindersError.value).toBe("Update failed");
    });
  });

  describe("Note History", () => {
    it("should fetch note history", async () => {
      const mockAuditLogs = [
        {
          id: "log-1",
          user_id: "user-123",
          created_at: "2025-12-20T10:00:00Z",
          old_values: { notes: "old note" },
          new_values: { notes: "new note" },
        },
      ];
      mockQuery.__setTestResponse({ data: mockAuditLogs, error: null });

      const { fetchNoteHistory, noteHistory } = useInteractions();
      await fetchNoteHistory("school-123");

      expect(mockSupabase.from).toHaveBeenCalledWith("audit_logs");
      expect(noteHistory.value.length).toBeGreaterThan(0);
    });

    it("should handle error when fetching note history fails", async () => {
      const mockError = new Error("Fetch failed");
      mockQuery.__setTestResponse({ data: null, error: mockError });

      const { fetchNoteHistory, noteHistoryError } = useInteractions();
      await fetchNoteHistory("school-123");

      expect(noteHistoryError.value).toBe("Fetch failed");
    });
  });

  describe("Reminder Filtering", () => {
    it("should filter active reminders", async () => {
      const activeReminder = createMockReminder({
        id: "reminder-1",
        is_completed: false,
      });
      const completedReminder = createMockReminder({
        id: "reminder-2",
        is_completed: true,
      });
      mockQuery.__setTestResponse({
        data: [activeReminder, completedReminder],
        error: null,
      });

      const { loadReminders, activeReminders } = useInteractions();
      await loadReminders();

      expect(activeReminders.value.length).toBe(1);
      expect(activeReminders.value[0].id).toBe("reminder-1");
    });

    it("should filter overdue reminders", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const overdueReminder = createMockReminder({
        id: "reminder-1",
        due_date: pastDate.toISOString().split("T")[0],
        is_completed: false,
      });
      const futureReminder = createMockReminder({
        id: "reminder-2",
        due_date: futureDate.toISOString().split("T")[0],
        is_completed: false,
      });

      mockQuery.__setTestResponse({
        data: [overdueReminder, futureReminder],
        error: null,
      });

      const { loadReminders, overdueReminders } = useInteractions();
      await loadReminders();

      expect(overdueReminders.value.length).toBeGreaterThan(0);
    });

    it("should filter high priority reminders", async () => {
      const highPriorityReminder = createMockReminder({
        id: "reminder-1",
        priority: "high",
        is_completed: false,
      });
      const mediumPriorityReminder = createMockReminder({
        id: "reminder-2",
        priority: "medium",
        is_completed: false,
      });

      mockQuery.__setTestResponse({
        data: [highPriorityReminder, mediumPriorityReminder],
        error: null,
      });

      const { loadReminders, highPriorityReminders } = useInteractions();
      await loadReminders();

      expect(highPriorityReminders.value.length).toBe(1);
      expect(highPriorityReminders.value[0].priority).toBe("high");
    });

    it("should get reminders for specific entity", async () => {
      const schoolReminder = createMockReminder({
        id: "reminder-1",
        school_id: "school-123",
        coach_id: null,
      });
      const coachReminder = createMockReminder({
        id: "reminder-2",
        school_id: null,
        coach_id: "coach-456",
      });

      mockQuery.__setTestResponse({
        data: [schoolReminder, coachReminder],
        error: null,
      });

      const { loadReminders, getRemindersFor } = useInteractions();
      await loadReminders();

      const schoolReminders = getRemindersFor("school", "school-123");
      expect(schoolReminders.length).toBe(1);
      expect(schoolReminders[0].school_id).toBe("school-123");
    });
  });

  describe("Format Due Date", () => {
    it("should format today's date", () => {
      const { formatDueDate } = useInteractions();
      const today = new Date();
      const result = formatDueDate(today.toISOString());

      expect(result).toBe("Today");
    });

    it("should format tomorrow's date", () => {
      const { formatDueDate } = useInteractions();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = formatDueDate(tomorrow.toISOString());

      expect(result).toBe("Tomorrow");
    });

    it("should format overdue dates", () => {
      const { formatDueDate } = useInteractions();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatDueDate(yesterday.toISOString());

      expect(result).toContain("Overdue");
    });

    it("should format future dates", () => {
      const { formatDueDate } = useInteractions();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const result = formatDueDate(futureDate.toISOString());

      expect(result).toContain("In");
    });
  });

  describe("fetchMyInteractions", () => {
    it("should fetch interactions for current user", async () => {
      const mockInteractions = [
        createMockInteraction({ logged_by: "user-123" }),
      ];
      mockQuery.__setTestResponse({ data: mockInteractions, error: null });

      const { fetchMyInteractions, interactions } = useInteractions();
      await fetchMyInteractions();

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", "user-123");
      expect(interactions.value).toEqual(mockInteractions);
    });

    it("should throw error if user not authenticated", async () => {
      mockUser = null;

      const { fetchMyInteractions } = useInteractions();

      await expect(fetchMyInteractions()).rejects.toThrow(
        "User not authenticated",
      );
    });
  });

  describe("fetchAthleteInteractions", () => {
    it("should fetch interactions for specific athlete", async () => {
      const mockInteractions = [
        createMockInteraction({ logged_by: "athlete-456" }),
      ];
      mockQuery.__setTestResponse({ data: mockInteractions, error: null });

      const { fetchAthleteInteractions, interactions } = useInteractions();
      await fetchAthleteInteractions("athlete-456");

      expect(mockQuery.eq).toHaveBeenCalledWith("logged_by", "athlete-456");
      expect(interactions.value).toEqual(mockInteractions);
    });
  });

  describe("Error State Management", () => {
    it("should clear error on successful operation", async () => {
      const mockError = new Error("Previous error");
      mockQuery.__setTestResponse({ data: null, error: mockError });

      const { fetchInteractions, error } = useInteractions();
      await fetchInteractions();

      expect(error.value).toBe("Previous error");

      // Now succeed
      mockQuery.__setTestResponse({ data: [], error: null });
      await fetchInteractions();

      expect(error.value).toBeNull();
    });

    it("should set loading state during operations", async () => {
      mockQuery.__setTestResponse({
        data: [createMockInteraction()],
        error: null,
      });

      const { fetchInteractions, loading } = useInteractions();

      const promise = fetchInteractions();
      expect(loading.value).toBe(true);

      await promise;
      expect(loading.value).toBe(false);
    });
  });
});
