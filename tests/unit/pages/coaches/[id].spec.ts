import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import type { Coach } from "~/types/models";

// Mock vue-router
const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useRoute: vi.fn(() => ({
    params: { id: "coach-123" },
    query: {},
  })),
}));

// Mock composables with default values
const mockGetCoach = vi.fn();
const mockUpdateCoach = vi.fn();
const mockSmartDelete = vi.fn();
const mockGetSchool = vi.fn();
const mockFetchInteractions = vi.fn();
const mockFetchCoaches = vi.fn();
const mockUpdateCoachTags = vi.fn();
const mockOpenCommunication = vi.fn();
const mockHandleInteractionLogged = vi.fn();

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: vi.fn(() => ({
    getCoach: mockGetCoach,
    updateCoach: mockUpdateCoach,
    smartDelete: mockSmartDelete,
    fetchCoaches: mockFetchCoaches,
  })),
}));

vi.mock("~/stores/coaches", () => ({
  useCoachStore: vi.fn(() => ({
    updateCoachTags: mockUpdateCoachTags,
  })),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: vi.fn(() => ({
    getSchool: mockGetSchool,
  })),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: vi.fn(() => ({
    interactions: ref([]),
    fetchInteractions: mockFetchInteractions,
  })),
}));

vi.mock("~/composables/useCommunication", () => ({
  useCommunication: vi.fn(() => ({
    openCommunication: mockOpenCommunication,
    handleInteractionLogged: mockHandleInteractionLogged,
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user-123" },
  })),
}));

// Mock child components to isolate the page's composition/wiring
vi.mock("~/components/DeleteConfirmationModal.vue", () => ({
  default: {
    name: "DeleteConfirmationModal",
    props: ["isOpen", "itemName", "itemType", "isLoading"],
    emits: ["cancel", "confirm"],
    template: `
      <div v-if="isOpen" data-test="delete-modal">
        <button @click="$emit('cancel')" data-test="cancel-delete-btn">Cancel</button>
        <button @click="$emit('confirm')" data-test="confirm-delete-btn">Confirm</button>
      </div>
    `,
  },
}));

vi.mock("~/components/EditCoachModal.vue", () => ({
  default: {
    name: "EditCoachModal",
    props: ["coach", "isOpen", "updateFn"],
    emits: ["close", "updated"],
    template: `
      <div v-if="isOpen" data-test="edit-coach-modal">
        <button @click="$emit('close')" data-test="close-edit-btn">Close</button>
        <button @click="$emit('updated', coach)" data-test="update-coach-btn">Update</button>
      </div>
    `,
  },
}));

vi.mock("~/components/coaches/CoachProfileLink.vue", () => ({
  default: {
    name: "CoachProfileLink",
    props: ["coachId", "coachEmail", "coachPhone", "coachLastName", "schoolId"],
    template: '<div data-test="coach-profile-link">Profile link</div>',
  },
}));

// setup.ts registers a global name-matched CommunicationPanel stub
// (`<div><slot /></div>`) that overrides any component import — override it
// here with one that exposes the interaction-logged flow for assertions.
const globalStubs = {
  NuxtLink: { template: "<a><slot /></a>" },
  CommunicationPanel: {
    name: "CommunicationPanel",
    props: ["coach", "school", "schoolName"],
    emits: ["interaction-logged"],
    template: `
      <div data-test="communication-panel">
        <button @click="$emit('interaction-logged', { type: 'email', direction: 'outbound', content: 'Test' })"
                data-test="log-interaction-btn">
          Log Interaction
        </button>
      </div>
    `,
  },
};

describe("Coach Detail Page", () => {
  const mockCoach: Coach = {
    id: "coach-123",
    first_name: "John",
    last_name: "Doe",
    role: "head",
    school_id: "school-123",
    email: "john@example.com",
    phone: "555-1234",
    twitter_handle: null,
    instagram_handle: null,
    notes: "Initial notes",
    tags: ["fastball"],
    source: null,
    last_contact_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSchool = {
    id: "school-123",
    name: "Test University",
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockGetCoach.mockResolvedValue(mockCoach);
    mockGetSchool.mockResolvedValue(mockSchool);
    mockFetchInteractions.mockResolvedValue(undefined);
    mockFetchCoaches.mockResolvedValue(undefined);
    mockUpdateCoachTags.mockResolvedValue({ ...mockCoach, tags: ["fastball", "new-tag"] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function mountPage() {
    const CoachDetailPage = await import("~/pages/coaches/[id]/index.vue").then(
      (m) => m.default,
    );
    const wrapper = mount(CoachDetailPage, {
      global: { stubs: globalStubs },
    });
    await flushPromises();
    return wrapper;
  }

  describe("Data Loading", () => {
    it("displays coach data after loading", async () => {
      const wrapper = await mountPage();

      expect(wrapper.findComponent({ name: "CoachIdentityCard" }).exists()).toBe(
        true,
      );
    });

    it("loads coach data on mount", async () => {
      await mountPage();

      expect(mockGetCoach).toHaveBeenCalledWith("coach-123");
    });

    it("fetches school name for the coach", async () => {
      await mountPage();

      expect(mockGetSchool).toHaveBeenCalledWith("school-123");
    });

    it("fetches interactions and coaches for the coach's school", async () => {
      await mountPage();

      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
      });
      expect(mockFetchCoaches).toHaveBeenCalledWith("school-123");
    });

    it("displays error message when coach fetch fails", async () => {
      mockGetCoach.mockRejectedValue(new Error("Failed to load"));

      const wrapper = await mountPage();

      expect(wrapper.text()).toContain("Failed to load");
    });

    it("shows coach not found when coach is null", async () => {
      mockGetCoach.mockResolvedValue(null);

      const wrapper = await mountPage();

      expect(wrapper.text()).toContain("Coach not found");
    });
  });

  describe("Two-column composition", () => {
    it("renders the left rail and right column components", async () => {
      const wrapper = await mountPage();

      expect(wrapper.findComponent({ name: "CoachIdentityCard" }).exists()).toBe(
        true,
      );
      expect(
        wrapper.findComponent({ name: "CoachChannelActions" }).exists(),
      ).toBe(true);
      expect(
        wrapper.findComponent({ name: "CoachInternalNotes" }).exists(),
      ).toBe(true);
      expect(wrapper.findComponent({ name: "CoachTagsCard" }).exists()).toBe(
        true,
      );
      expect(wrapper.findComponent({ name: "CoachProfileMeta" }).exists()).toBe(
        true,
      );
      expect(wrapper.findComponent({ name: "CoachAlerts" }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: "CoachStatCards" }).exists()).toBe(
        true,
      );
      expect(
        wrapper.find('[data-test="communication-panel"]').exists(),
      ).toBe(true);
      expect(
        wrapper.findComponent({ name: "CoachInteractionsTable" }).exists(),
      ).toBe(true);
    });
  });

  describe("Tags", () => {
    it("adds a tag via updateCoachTags with existing tags preserved", async () => {
      const wrapper = await mountPage();

      const tagsCard = wrapper.findComponent({ name: "CoachTagsCard" });
      tagsCard.vm.$emit("add", "new-tag");
      await flushPromises();

      expect(mockUpdateCoachTags).toHaveBeenCalledWith("coach-123", [
        "fastball",
        "new-tag",
      ]);
    });

    it("removes a tag via updateCoachTags", async () => {
      const wrapper = await mountPage();

      const tagsCard = wrapper.findComponent({ name: "CoachTagsCard" });
      tagsCard.vm.$emit("remove", "fastball");
      await flushPromises();

      expect(mockUpdateCoachTags).toHaveBeenCalledWith("coach-123", []);
    });
  });

  describe("Interaction logging", () => {
    it("routes CommunicationPanel's interaction-logged event through handleInteractionLogged", async () => {
      const wrapper = await mountPage();

      await wrapper.find('[data-test="log-interaction-btn"]').trigger("click");
      await flushPromises();

      expect(mockOpenCommunication).toHaveBeenCalledWith(
        expect.objectContaining({ id: "coach-123" }),
        "email",
      );
      expect(mockHandleInteractionLogged).toHaveBeenCalled();
    });
  });

  describe("Coach Management", () => {
    it("opens edit modal when header edit button is clicked", async () => {
      const wrapper = await mountPage();

      const editBtn = wrapper.find('[data-test="edit-coach-btn"]');
      expect(editBtn.exists()).toBe(true);
      await editBtn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="edit-coach-modal"]').exists()).toBe(
        true,
      );
    });

    it("opens edit modal when CoachInternalNotes emits edit", async () => {
      const wrapper = await mountPage();

      const notes = wrapper.findComponent({ name: "CoachInternalNotes" });
      notes.vm.$emit("edit");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="edit-coach-modal"]').exists()).toBe(
        true,
      );
    });

    it("closes edit modal on close event", async () => {
      const wrapper = await mountPage();

      await wrapper.find('[data-test="edit-coach-btn"]').trigger("click");
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-test="close-edit-btn"]').trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="edit-coach-modal"]').exists()).toBe(
        false,
      );
    });

    it("opens delete modal when delete is clicked", async () => {
      const wrapper = await mountPage();

      const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
      await deleteBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(true);
    });

    it("deletes coach and navigates when confirmed", async () => {
      mockSmartDelete.mockResolvedValue({ cascadeUsed: false });

      const wrapper = await mountPage();

      await wrapper.find('[data-test="coach-detail-delete-btn"]').trigger("click");
      await flushPromises();

      await wrapper.find('[data-test="confirm-delete-btn"]').trigger("click");
      await flushPromises();

      expect(mockSmartDelete).toHaveBeenCalledWith("coach-123");
      expect(mockPush).toHaveBeenCalledWith("/coaches");
    });

    it("closes delete modal when cancelled", async () => {
      const wrapper = await mountPage();

      await wrapper.find('[data-test="coach-detail-delete-btn"]').trigger("click");
      await flushPromises();

      const cancelBtn = wrapper.find('[data-test="cancel-delete-btn"]');
      await cancelBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(false);
    });

    it("handles delete error gracefully", async () => {
      mockSmartDelete.mockRejectedValue(new Error("Delete failed"));

      const wrapper = await mountPage();

      await wrapper.find('[data-test="coach-detail-delete-btn"]').trigger("click");
      await flushPromises();

      await wrapper.find('[data-test="confirm-delete-btn"]').trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Delete failed");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has skip link", async () => {
      const wrapper = await mountPage();

      const skipLink = wrapper.find('a[href="#main-content"]');
      expect(skipLink.exists()).toBe(true);
      expect(skipLink.text()).toBe("Skip to main content");
    });

    it("main content has proper id for skip link", async () => {
      const wrapper = await mountPage();

      expect(wrapper.find("#main-content").exists()).toBe(true);
    });
  });
});
