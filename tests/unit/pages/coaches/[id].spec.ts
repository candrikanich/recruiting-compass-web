import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import type { Coach } from "~/types/models";

// Nuxt auto-imports navigateTo as a global; the page calls it bare.
global.navigateTo = vi.fn();

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
const mockCreateInteraction = vi.fn();
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
    createInteraction: mockCreateInteraction,
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

const globalStubs = {
  NuxtLink: { template: "<a><slot /></a>" },
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
    mockCreateInteraction.mockResolvedValue({ id: "interaction-1" });
    mockUpdateCoachTags.mockResolvedValue({
      ...mockCoach,
      tags: ["fastball", "new-tag"],
    });
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

      expect(
        wrapper.findComponent({ name: "CoachIdentityCard" }).exists(),
      ).toBe(true);
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

      expect(
        wrapper.findComponent({ name: "CoachIdentityCard" }).exists(),
      ).toBe(true);
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
      expect(wrapper.findComponent({ name: "CoachAlerts" }).exists()).toBe(
        true,
      );
      expect(wrapper.findComponent({ name: "CoachStatCards" }).exists()).toBe(
        true,
      );
      expect(
        wrapper.findComponent({ name: "CoachCommunicationAnalytics" }).exists(),
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

    it("does not call updateCoachTags when the tag is already present", async () => {
      const wrapper = await mountPage();

      const tagsCard = wrapper.findComponent({ name: "CoachTagsCard" });
      tagsCard.vm.$emit("add", "fastball");
      await flushPromises();

      expect(mockUpdateCoachTags).not.toHaveBeenCalled();
    });

    it("does not call updateCoachTags when the tag exceeds 40 characters", async () => {
      const wrapper = await mountPage();

      const tagsCard = wrapper.findComponent({ name: "CoachTagsCard" });
      const overLongTag = "a".repeat(41);
      tagsCard.vm.$emit("add", overLongTag);
      await flushPromises();

      expect(mockUpdateCoachTags).not.toHaveBeenCalled();
    });
  });

  describe("Interaction logging", () => {
    it("navigates to the interaction-create page prefilled when CoachChannelActions emits log-interaction", async () => {
      const wrapper = await mountPage();

      const channelActions = wrapper.findComponent({
        name: "CoachChannelActions",
      });
      channelActions.vm.$emit("log-interaction");
      await flushPromises();

      expect(global.navigateTo).toHaveBeenCalledWith(
        "/interactions/add?coachId=coach-123&schoolId=school-123",
      );
    });
  });

  describe("Social DM logging", () => {
    it("logs a best-effort dm interaction when CoachChannelActions emits open-social for twitter", async () => {
      const wrapper = await mountPage();

      const channelActions = wrapper.findComponent({
        name: "CoachChannelActions",
      });
      channelActions.vm.$emit("open-social", "twitter");
      await flushPromises();

      expect(mockCreateInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          coach_id: "coach-123",
          school_id: "school-123",
          type: "dm",
          direction: "outbound",
        }),
      );
      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
      });
    });

    it("logs a best-effort dm interaction when CoachChannelActions emits open-social for instagram", async () => {
      const wrapper = await mountPage();

      const channelActions = wrapper.findComponent({
        name: "CoachChannelActions",
      });
      channelActions.vm.$emit("open-social", "instagram");
      await flushPromises();

      expect(mockCreateInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          coach_id: "coach-123",
          type: "dm",
          direction: "outbound",
        }),
      );
    });

    it("swallows createInteraction failure — social-open logging is best-effort", async () => {
      mockCreateInteraction.mockRejectedValue(new Error("insert failed"));

      const wrapper = await mountPage();

      const channelActions = wrapper.findComponent({
        name: "CoachChannelActions",
      });
      channelActions.vm.$emit("open-social", "twitter");
      await flushPromises();

      expect(wrapper.text()).not.toContain("insert failed");
    });
  });

  describe("Coach Management", () => {
    it("opens edit modal when header edit button is clicked", async () => {
      const wrapper = await mountPage();

      const editBtn = wrapper.find('[data-testid="coach-header-edit"]');
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

      await wrapper.find('[data-testid="coach-header-edit"]').trigger("click");
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-test="close-edit-btn"]').trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="edit-coach-modal"]').exists()).toBe(
        false,
      );
    });

    it("opens delete modal when delete is clicked", async () => {
      const wrapper = await mountPage();

      const deleteBtn = wrapper.find('[data-testid="coach-header-delete"]');
      await deleteBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(true);
    });

    it("deletes coach and navigates when confirmed", async () => {
      mockSmartDelete.mockResolvedValue({ cascadeUsed: false });

      const wrapper = await mountPage();

      await wrapper
        .find('[data-testid="coach-header-delete"]')
        .trigger("click");
      await flushPromises();

      await wrapper.find('[data-test="confirm-delete-btn"]').trigger("click");
      await flushPromises();

      expect(mockSmartDelete).toHaveBeenCalledWith("coach-123");
      expect(mockPush).toHaveBeenCalledWith("/coaches");
    });

    it("closes delete modal when cancelled", async () => {
      const wrapper = await mountPage();

      await wrapper
        .find('[data-testid="coach-header-delete"]')
        .trigger("click");
      await flushPromises();

      const cancelBtn = wrapper.find('[data-test="cancel-delete-btn"]');
      await cancelBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(false);
    });

    it("handles delete error gracefully", async () => {
      mockSmartDelete.mockRejectedValue(new Error("Delete failed"));

      const wrapper = await mountPage();

      await wrapper
        .find('[data-testid="coach-header-delete"]')
        .trigger("click");
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
