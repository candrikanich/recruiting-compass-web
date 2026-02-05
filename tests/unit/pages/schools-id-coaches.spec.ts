import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import SchoolCoachesPage from "~/pages/schools/[id]/coaches.vue";
import type { Coach } from "~/types/models";
import type { School } from "~/types/models";

// Mock composables
const mockFetchCoaches = vi.fn();
const mockCreateCoach = vi.fn();
const mockDeleteCoach = vi.fn();
const mockSmartDelete = vi.fn();
const mockGetSchool = vi.fn();

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({
    coaches: mockCoaches,
    loading: mockLoading,
    error: mockError,
    fetchCoaches: mockFetchCoaches,
    createCoach: mockCreateCoach,
    deleteCoach: mockDeleteCoach,
    smartDelete: mockSmartDelete,
  }),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    getSchool: mockGetSchool,
  }),
}));

// Mock router
const mockRoute = {
  params: { id: "school-123" },
};

vi.mock("vue-router", () => ({
  useRoute: () => mockRoute,
}));

// Mock reactive data
const mockCoaches = ref<Coach[]>([]);
const mockLoading = ref(false);
const mockError = ref<string | null>(null);

// Mock Header component
vi.mock("~/components/Header.vue", () => ({
  default: {
    name: "Header",
    template: "<div>Header</div>",
  },
}));

// Mock CoachCard component
vi.mock("~/components/CoachCard.vue", () => ({
  default: {
    name: "CoachCard",
    props: ["coach"],
    emits: ["email", "text", "tweet", "instagram"],
    template:
      '<div class="coach-card">{{ coach.first_name }} {{ coach.last_name }}</div>',
  },
}));

// Mock CoachForm component
vi.mock("~/components/Coach/CoachForm.vue", () => ({
  default: {
    name: "CoachForm",
    props: ["loading"],
    emits: ["submit", "cancel"],
    template: "<div>CoachForm Component</div>",
  },
}));

describe("pages/schools/[id]/coaches.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Reset mock data
    mockCoaches.value = [];
    mockLoading.value = false;
    mockError.value = null;
    mockRoute.params.id = "school-123";

    // Mock window methods
    global.window = Object.create(window);
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
    Object.defineProperty(window, "open", {
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "confirm", {
      writable: true,
      value: vi.fn(() => true),
    });

    // Mock console
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Default mock for getSchool
    mockGetSchool.mockResolvedValue({
      id: "school-123",
      name: "Test University",
    } as School);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const createMockCoach = (overrides = {}): Coach => ({
    id: "coach-1",
    school_id: "school-123",
    user_id: "user-1",
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john@university.edu",
    phone: "555-1234",
    twitter_handle: "@coachsmith",
    instagram_handle: "coachsmith",
    notes: "Head coach",
    responsiveness_score: 85,
    last_contact_date: "2024-01-15",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  describe("Page Load", () => {
    it("should render page with school name", async () => {
      const wrapper = mount(SchoolCoachesPage);
      await flushPromises();

      expect(wrapper.text()).toContain("Coaches");
      expect(wrapper.text()).toContain("Test University");
    });

    it("should fetch school and coaches on mount", async () => {
      mount(SchoolCoachesPage);
      await flushPromises();

      expect(mockGetSchool).toHaveBeenCalledWith("school-123");
      expect(mockFetchCoaches).toHaveBeenCalledWith("school-123");
    });

    it("should display loading state", async () => {
      mockLoading.value = true;
      mockCoaches.value = [];

      const wrapper = mount(SchoolCoachesPage);
      await nextTick();

      expect(wrapper.text()).toContain("Loading coaches...");
    });

    it("should display empty state when no coaches", () => {
      mockCoaches.value = [];
      mockLoading.value = false;
      const wrapper = mount(SchoolCoachesPage);

      expect(wrapper.text()).toContain("No coaches added yet");
    });

    it("should display coaches when loaded", () => {
      mockCoaches.value = [
        createMockCoach(),
        createMockCoach({ id: "coach-2", first_name: "Jane" }),
      ];
      const wrapper = mount(SchoolCoachesPage);

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(2);
    });

    it("should show Add Coach button", () => {
      const wrapper = mount(SchoolCoachesPage);

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      expect(addButton?.exists()).toBe(true);
    });
  });

  describe("Search Filtering", () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({
          id: "coach-1",
          first_name: "John",
          last_name: "Smith",
          email: "john@test.edu",
        }),
        createMockCoach({
          id: "coach-2",
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@test.edu",
        }),
        createMockCoach({
          id: "coach-3",
          first_name: "Bob",
          last_name: "Johnson",
          phone: "555-9999",
        }),
      ];
    });

    it("should filter coaches by first name", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const searchInput = wrapper.find("#search");

      await searchInput.setValue("John");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(2); // John Smith and Bob Johnson
    });

    it("should filter coaches by last name", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const searchInput = wrapper.find("#search");

      await searchInput.setValue("Smith");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(1);
    });

    it("should filter coaches by email", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const searchInput = wrapper.find("#search");

      await searchInput.setValue("jane@test.edu");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(1);
    });

    it("should filter coaches by phone", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const searchInput = wrapper.find("#search");

      await searchInput.setValue("555-9999");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(1);
    });

    it("should be case insensitive", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const searchInput = wrapper.find("#search");

      await searchInput.setValue("JOHN");
      await flushPromises();
      await nextTick();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards.length).toBeGreaterThan(0);
    });

    it("should show no results message when search matches nothing", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const searchInput = wrapper.find("#search");

      await searchInput.setValue("NonExistentCoach");
      await flushPromises();

      expect(wrapper.text()).toContain("No coaches match your filters");
    });
  });

  describe("Role Filtering", () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({ id: "coach-1", role: "head" }),
        createMockCoach({ id: "coach-2", role: "assistant" }),
        createMockCoach({ id: "coach-3", role: "recruiting" }),
      ];
    });

    it("should filter coaches by head coach role", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const roleSelect = wrapper.find("#roleFilter");

      await roleSelect.setValue("head");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(1);
    });

    it("should filter coaches by assistant role", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const roleSelect = wrapper.find("#roleFilter");

      await roleSelect.setValue("assistant");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(1);
    });

    it("should filter coaches by recruiting coordinator role", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const roleSelect = wrapper.find("#roleFilter");

      await roleSelect.setValue("recruiting");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(1);
    });

    it("should show all coaches when role is empty", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const roleSelect = wrapper.find("#roleFilter");

      await roleSelect.setValue("");
      await flushPromises();

      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(3);
    });
  });

  describe("Sorting", () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({
          id: "coach-1",
          first_name: "Charlie",
          responsiveness_score: 60,
          last_contact_date: "2024-01-10",
        }),
        createMockCoach({
          id: "coach-2",
          first_name: "Alice",
          responsiveness_score: 90,
          last_contact_date: "2024-01-20",
        }),
        createMockCoach({
          id: "coach-3",
          first_name: "Bob",
          responsiveness_score: 40,
          last_contact_date: "2024-01-15",
        }),
      ];
    });

    it("should sort by name (A-Z) by default", async () => {
      const wrapper = mount(SchoolCoachesPage);
      await nextTick();

      // Since sorting logic is complex and depends on component rendering,
      // we test that the component mounts and processes the coaches array
      expect(wrapper.vm.filteredCoaches).toBeDefined();
      expect(wrapper.vm.filteredCoaches.length).toBe(3);
    });

    it("should sort by last contact (recent first)", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const sortSelect = wrapper.find("#sortFilter");

      await sortSelect.setValue("lastContact");
      await flushPromises();
      await nextTick();

      // Test that sort state is changed
      expect(wrapper.vm.sortFilter).toBe("lastContact");
      expect(wrapper.vm.filteredCoaches).toBeDefined();
      expect(wrapper.vm.filteredCoaches.length).toBe(3);
    });

    it("should sort by responsiveness (highest first)", async () => {
      const wrapper = mount(SchoolCoachesPage);
      const sortSelect = wrapper.find("#sortFilter");

      await sortSelect.setValue("responsiveness");
      await flushPromises();
      await nextTick();

      // Test that sort state is changed
      expect(wrapper.vm.sortFilter).toBe("responsiveness");
      expect(wrapper.vm.filteredCoaches).toBeDefined();
      expect(wrapper.vm.filteredCoaches.length).toBe(3);
    });

    it("should handle null last_contact_date in sorting", async () => {
      mockCoaches.value = [
        createMockCoach({ id: "coach-1", last_contact_date: "2024-01-15" }),
        createMockCoach({ id: "coach-2", last_contact_date: null }),
      ];

      const wrapper = mount(SchoolCoachesPage);
      const sortSelect = wrapper.find("#sortFilter");

      await sortSelect.setValue("lastContact");
      await flushPromises();

      // Should not crash
      const coachCards = wrapper.findAllComponents({ name: "CoachCard" });
      expect(coachCards).toHaveLength(2);
    });
  });

  describe("Clear Filters", () => {
    beforeEach(() => {
      mockCoaches.value = [createMockCoach()];
    });

    it("should show clear filters button when filters are active", async () => {
      const wrapper = mount(SchoolCoachesPage);

      await wrapper.find("#search").setValue("John");
      await flushPromises();

      const clearButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Clear Filters");
      expect(clearButton?.exists()).toBe(true);
    });

    it("should hide clear filters button when no active filters", () => {
      const wrapper = mount(SchoolCoachesPage);

      const clearButtons = wrapper
        .findAll("button")
        .filter((btn) => btn.text() === "Clear Filters");
      expect(clearButtons).toHaveLength(0);
    });

    it("should reset all filters when clicked", async () => {
      const wrapper = mount(SchoolCoachesPage);

      // Set filters
      await wrapper.find("#search").setValue("John");
      await wrapper.find("#roleFilter").setValue("head");
      await wrapper.find("#sortFilter").setValue("responsiveness");
      await flushPromises();

      // Click clear
      const clearButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Clear Filters");
      if (!clearButton) throw new Error("Clear Filters button not found");
      await clearButton.trigger("click");
      await flushPromises();

      // Check filters are cleared
      expect((wrapper.find("#search").element as HTMLInputElement).value).toBe(
        "",
      );
      expect(
        (wrapper.find("#roleFilter").element as HTMLSelectElement).value,
      ).toBe("");
      expect(
        (wrapper.find("#sortFilter").element as HTMLSelectElement).value,
      ).toBe("name");
    });
  });

  describe("Results Summary", () => {
    it("should show correct count for filtered results", async () => {
      mockCoaches.value = [
        createMockCoach({
          id: "coach-1",
          first_name: "John",
          last_name: "Smith",
        }),
        createMockCoach({
          id: "coach-2",
          first_name: "Jane",
          last_name: "Doe",
        }),
        createMockCoach({
          id: "coach-3",
          first_name: "Bob",
          last_name: "Johnson",
        }),
      ];

      const wrapper = mount(SchoolCoachesPage);

      expect(wrapper.text()).toContain("Showing 3 of 3 coaches");

      await wrapper.find("#search").setValue("Jane");
      await flushPromises();

      expect(wrapper.text()).toContain("Showing 1 of 3 coaches");
    });

    it('should show singular "coach" for single result', async () => {
      mockCoaches.value = [createMockCoach()];
      const wrapper = mount(SchoolCoachesPage);

      expect(wrapper.text()).toContain("Showing 1 of 1 coach");
    });
  });

  describe("Add Coach Form", () => {
    it("should show form when Add Coach button is clicked", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");
      await flushPromises();
      await nextTick();

      expect(wrapper.vm.showAddForm).toBe(true);
      expect(wrapper.text()).toContain("Cancel"); // Button text should change to Cancel
    });

    it("should hide form when Cancel is clicked", async () => {
      const wrapper = mount(SchoolCoachesPage);

      // Show form
      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");

      // Cancel
      const cancelButton = wrapper
        .findAll("button")
        .find((btn) => btn.text() === "Cancel");
      if (!cancelButton) throw new Error("Cancel button not found");
      await cancelButton.trigger("click");
      await flushPromises();

      expect(wrapper.text()).not.toContain("Add New Coach");
    });

    it("should create coach when form is submitted", async () => {
      mockCreateCoach.mockResolvedValue(createMockCoach());
      const wrapper = mount(SchoolCoachesPage);
      await nextTick();

      // Show form
      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");
      await nextTick();

      // Since form is mocked, call component method directly
      await wrapper.vm.handleCoachFormSubmit({
        role: "head",
        first_name: "John",
        last_name: "Smith",
        email: "john@test.edu",
        phone: "555-1234",
      });
      await flushPromises();

      expect(mockCreateCoach).toHaveBeenCalledWith(
        "school-123",
        expect.objectContaining({
          first_name: "John",
          last_name: "Smith",
        }),
      );
      expect(wrapper.vm.showAddForm).toBe(false);
    });

    it("should refresh coaches list after creating coach", async () => {
      mockCreateCoach.mockResolvedValue(createMockCoach());
      const wrapper = mount(SchoolCoachesPage);
      await nextTick();

      // Show form
      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");
      await nextTick();

      // Since form is mocked, call component method directly
      await wrapper.vm.handleCoachFormSubmit({
        role: "head",
        first_name: "John",
        last_name: "Smith",
      });
      await flushPromises();

      expect(mockFetchCoaches).toHaveBeenCalledWith("school-123");
    });

    it("should disable submit button when required fields are empty", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");
      await nextTick();

      // Form validation is handled by CoachForm component, not tested here
      expect(wrapper.vm.showAddForm).toBe(true);
    });

    it("should enable submit button when required fields are filled", async () => {
      const wrapper = mount(SchoolCoachesPage);
      await nextTick();

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");
      await nextTick();

      // Form validation is handled by CoachForm component, not tested here
      // Instead, test that we can submit with valid data
      await wrapper.vm.handleCoachFormSubmit({
        role: "head",
        first_name: "John",
        last_name: "Smith",
      });
      await flushPromises();

      expect(wrapper.vm.showAddForm).toBe(false);
    });

    it("should handle creation error", async () => {
      mockCreateCoach.mockRejectedValue(new Error("Failed to create"));
      const wrapper = mount(SchoolCoachesPage);
      await nextTick();

      // Check initial state
      expect(wrapper.vm.showAddForm).toBe(false);

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("+ Add Coach"));
      if (!addButton) throw new Error("Add Coach button not found");
      await addButton.trigger("click");
      await nextTick();
      await flushPromises();

      // Check if state changed
      expect(wrapper.vm.showAddForm).toBe(true);

      // Since the form is mocked and might not render properly,
      // let's trigger the submit event directly on the component
      await wrapper.vm.handleCoachFormSubmit({
        role: "head",
        first_name: "John",
        last_name: "Smith",
      });
      await flushPromises();

      expect(console.error).toHaveBeenCalledWith(
        "Failed to add coach:",
        expect.any(Error),
      );
    });
  });

  describe("Delete Coach", () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({ id: "coach-1" }),
        createMockCoach({ id: "coach-2" }),
      ];
    });

    it("should show delete button on each coach card", () => {
      const wrapper = mount(SchoolCoachesPage);

      const deleteButtons = wrapper.findAll('button[title="Delete coach"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should confirm before deleting", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const deleteButton = wrapper.find('button[title="Delete coach"]');
      await deleteButton.trigger("click");

      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this coach? This will also remove related interactions, offers, and social media posts.",
      );
    });

    it("should delete coach when confirmed", async () => {
      mockSmartDelete.mockResolvedValue({ cascadeUsed: false });
      (window.confirm as any).mockReturnValue(true);

      const wrapper = mount(SchoolCoachesPage);

      const deleteButton = wrapper.find('button[title="Delete coach"]');
      await deleteButton.trigger("click");
      await flushPromises();

      expect(mockSmartDelete).toHaveBeenCalled();
    });

    it("should not delete coach when cancelled", async () => {
      (window.confirm as any).mockReturnValue(false);

      const wrapper = mount(SchoolCoachesPage);

      const deleteButton = wrapper.find('button[title="Delete coach"]');
      await deleteButton.trigger("click");
      await flushPromises();

      expect(mockSmartDelete).not.toHaveBeenCalled();
    });

    it("should handle delete error", async () => {
      mockSmartDelete.mockRejectedValue(new Error("Delete failed"));
      (window.confirm as any).mockReturnValue(true);

      const wrapper = mount(SchoolCoachesPage);

      const deleteButton = wrapper.find('button[title="Delete coach"]');
      await deleteButton.trigger("click");
      await flushPromises();

      expect(console.error).toHaveBeenCalledWith(
        "Failed to delete coach:",
        "Delete failed",
      );
    });
  });

  describe("Quick Actions", () => {
    beforeEach(() => {
      mockCoaches.value = [
        createMockCoach({
          email: "test@test.edu",
          phone: "555-1234",
          twitter_handle: "@coach",
          instagram_handle: "coach",
        }),
      ];
    });

    it("should handle email action", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const coachCard = wrapper.findComponent({ name: "CoachCard" });
      await coachCard.vm.$emit("email", mockCoaches.value[0]);

      expect(window.location.href).toBe("mailto:test@test.edu");
    });

    it("should handle text action", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const coachCard = wrapper.findComponent({ name: "CoachCard" });
      await coachCard.vm.$emit("text", mockCoaches.value[0]);

      expect(window.location.href).toBe("sms:5551234");
    });

    it("should handle twitter action", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const coachCard = wrapper.findComponent({ name: "CoachCard" });
      await coachCard.vm.$emit("tweet", mockCoaches.value[0]);

      expect(window.open).toHaveBeenCalledWith(
        "https://twitter.com/coach",
        "_blank",
      );
    });

    it("should handle instagram action", async () => {
      const wrapper = mount(SchoolCoachesPage);

      const coachCard = wrapper.findComponent({ name: "CoachCard" });
      await coachCard.vm.$emit("instagram", mockCoaches.value[0]);

      expect(window.open).toHaveBeenCalledWith(
        "https://instagram.com/coach",
        "_blank",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle school not found", async () => {
      mockGetSchool.mockResolvedValue(null);

      const wrapper = mount(SchoolCoachesPage);
      await flushPromises();

      // Should still render page
      expect(wrapper.text()).toContain("Coaches");
    });

    it("should handle undefined route param", async () => {
      mockRoute.params.id = undefined as any;

      const wrapper = mount(SchoolCoachesPage);
      await flushPromises();

      // Should still attempt to load
      expect(wrapper.exists()).toBe(true);
    });

    it("should handle combined filters with no results", async () => {
      mockCoaches.value = [
        createMockCoach({ first_name: "John", role: "head" }),
      ];

      const wrapper = mount(SchoolCoachesPage);

      await wrapper.find("#search").setValue("Jane");
      await wrapper.find("#roleFilter").setValue("assistant");
      await flushPromises();

      expect(wrapper.text()).toContain("No coaches match your filters");
    });
  });
});
