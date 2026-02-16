import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import type { Coach, Interaction } from "~/types/models";

// Mock vue-router
const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useRoute: vi.fn(() => ({
    params: { id: "coach-123" },
  })),
}));

// Mock composables with default values
const mockGetCoach = vi.fn();
const mockUpdateCoach = vi.fn();
const mockSmartDelete = vi.fn();
const mockGetSchool = vi.fn();
const mockFetchInteractions = vi.fn();
const mockOpenCommunication = vi.fn();
const mockHandleInteractionLogged = vi.fn();

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: vi.fn(() => ({
    getCoach: mockGetCoach,
    updateCoach: mockUpdateCoach,
    smartDelete: mockSmartDelete,
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
    showPanel: ref(false),
    communicationType: ref("email"),
    openCommunication: mockOpenCommunication,
    handleInteractionLogged: mockHandleInteractionLogged,
  })),
}));

vi.mock("~/composables/useCoachStats", () => ({
  useCoachStats: vi.fn(() => ({
    stats: ref({
      totalInteractions: 5,
      daysSinceContact: 3,
      preferredMethod: "Email",
    }),
  })),
}));

vi.mock("~/composables/useFocusTrap", () => ({
  useFocusTrap: vi.fn(() => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user-123" },
  })),
}));

vi.mock("~/utils/socialMediaHandlers", () => ({
  openTwitter: vi.fn(),
  openInstagram: vi.fn(),
}));

// Mock Heroicons
vi.mock("@heroicons/vue/24/outline", () => ({
  ArrowLeftIcon: { name: "ArrowLeftIcon", template: "<svg />" },
  XMarkIcon: { name: "XMarkIcon", template: "<svg />" },
}));

// Mock child components
vi.mock("~/components/Coach/CoachHeader.vue", () => ({
  default: {
    name: "CoachHeader",
    props: ["coach", "schoolName"],
    emits: [
      "send-email",
      "send-text",
      "call-coach",
      "open-twitter",
      "open-instagram",
      "edit-coach",
      "delete-coach",
    ],
    template: `
      <div data-test="coach-header">
        <button @click="$emit('send-email')" data-test="send-email-btn">Email</button>
        <button @click="$emit('send-text')" data-test="send-text-btn">Text</button>
        <button @click="$emit('call-coach')" data-test="call-coach-btn">Call</button>
        <button @click="$emit('open-twitter')" data-test="open-twitter-btn">Twitter</button>
        <button @click="$emit('open-instagram')" data-test="open-instagram-btn">Instagram</button>
        <button @click="$emit('edit-coach')" data-test="edit-coach-btn">Edit</button>
        <button @click="$emit('delete-coach')" data-test="coach-detail-delete-btn">Delete</button>
      </div>
    `,
  },
}));

vi.mock("~/components/Coach/CoachStatsGrid.vue", () => ({
  default: {
    name: "CoachStatsGrid",
    props: ["stats"],
    template: '<div data-test="coach-stats-grid">Stats</div>',
  },
}));

vi.mock("~/components/Coach/CoachNotesEditor.vue", () => ({
  default: {
    name: "CoachNotesEditor",
    props: ["modelValue", "title", "subtitle", "placeholder"],
    emits: ["update:modelValue", "save"],
    template: `
      <div data-test="coach-notes-editor">
        <input
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          data-test="notes-input"
        />
        <button @click="$emit('save', modelValue)" data-test="save-notes-btn">Save</button>
      </div>
    `,
  },
}));

vi.mock("~/components/Coach/CoachRecentInteractions.vue", () => ({
  default: {
    name: "CoachRecentInteractions",
    props: ["interactions", "coachName"],
    template: '<div data-test="coach-recent-interactions">Interactions</div>',
  },
}));

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
    props: ["coach", "isOpen"],
    emits: ["close", "updated"],
    template: `
      <div v-if="isOpen" data-test="edit-coach-modal">
        <button @click="$emit('close')" data-test="close-edit-btn">Close</button>
        <button @click="$emit('updated', coach)" data-test="update-coach-btn">Update</button>
      </div>
    `,
  },
}));

vi.mock("~/components/CommunicationPanel.vue", () => ({
  default: {
    name: "CommunicationPanel",
    props: ["coach", "schoolName", "initialType"],
    emits: ["close", "interaction-logged"],
    template: `
      <div data-test="communication-panel">
        <button @click="$emit('close')" data-test="close-panel-btn">Close</button>
        <button @click="$emit('interaction-logged', { type: 'email', direction: 'outbound', content: 'Test' })"
                data-test="log-interaction-btn">
          Log Interaction
        </button>
      </div>
    `,
  },
}));

describe("Coach Detail Page", () => {
  const mockCoach: Coach = {
    id: "coach-123",
    first_name: "John",
    last_name: "Doe",
    role: "head",
    school_id: "school-123",
    email: "john@example.com",
    phone: "555-1234",
    notes: "Initial notes",
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Data Loading", () => {
    it("displays coach data after loading", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      // Should show coach data after loading
      expect(wrapper.find('[data-test="coach-header"]').exists()).toBe(true);
    });

    it("loads and displays coach data on mount", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(mockGetCoach).toHaveBeenCalledWith("coach-123");
      expect(wrapper.find('[data-test="coach-header"]').exists()).toBe(true);
    });

    it("fetches school name for the coach", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(mockGetSchool).toHaveBeenCalledWith("school-123");
    });

    it("fetches interactions for the coach", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(mockFetchInteractions).toHaveBeenCalledWith({
        schoolId: "school-123",
        coachId: "coach-123",
      });
    });

    it("displays error message when coach fetch fails", async () => {
      mockGetCoach.mockRejectedValue(new Error("Failed to load"));

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("Failed to load");
    });

    it("shows coach not found when coach is null", async () => {
      mockGetCoach.mockResolvedValue(null);

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("Coach not found");
    });

    it("sets error when coach data is undefined", async () => {
      mockGetCoach.mockResolvedValue(undefined);

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(wrapper.text()).toContain("Coach not found");
    });
  });

  describe("Communication Features", () => {
    it("opens communication panel for email", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const emailBtn = wrapper.find('[data-test="send-email-btn"]');
      await emailBtn.trigger("click");

      expect(mockOpenCommunication).toHaveBeenCalledWith(
        expect.objectContaining({ id: "coach-123" }),
        "email",
      );
    });

    it("opens communication panel for text", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const textBtn = wrapper.find('[data-test="send-text-btn"]');
      await textBtn.trigger("click");

      expect(mockOpenCommunication).toHaveBeenCalledWith(
        expect.objectContaining({ id: "coach-123" }),
        "text",
      );
    });

    it("handles call coach action", async () => {
      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: "" };

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const callBtn = wrapper.find('[data-test="call-coach-btn"]');
      await callBtn.trigger("click");

      expect(window.location.href).toBe("tel:555-1234");
    });

    it("handles Twitter action", async () => {
      const { openTwitter } = await import("~/utils/socialMediaHandlers");

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const twitterBtn = wrapper.find('[data-test="open-twitter-btn"]');
      await twitterBtn.trigger("click");

      expect(openTwitter).toHaveBeenCalled();
    });

    it("handles Instagram action", async () => {
      const { openInstagram } = await import("~/utils/socialMediaHandlers");

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const instagramBtn = wrapper.find('[data-test="open-instagram-btn"]');
      await instagramBtn.trigger("click");

      expect(openInstagram).toHaveBeenCalled();
    });
  });

  describe("Coach Management", () => {
    it("opens edit modal when edit is clicked", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: {
            NuxtLink: { template: "<a><slot /></a>" },
            Teleport: true,
            EditCoachModal: {
              name: "EditCoachModal",
              props: ["coach", "isOpen"],
              template:
                '<div v-if="isOpen" data-test="edit-coach-modal">Edit Modal</div>',
            },
          },
        },
      });

      await flushPromises();

      const editBtn = wrapper.find('[data-test="edit-coach-btn"]');
      expect(editBtn.exists()).toBe(true);

      await editBtn.trigger("click");
      await wrapper.vm.$nextTick();

      const modal = wrapper.find('[data-test="edit-coach-modal"]');
      expect(modal.exists()).toBe(true);
    });

    it("closes edit modal when close event is emitted", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: {
            NuxtLink: { template: "<a><slot /></a>" },
            Teleport: true,
            EditCoachModal: {
              name: "EditCoachModal",
              props: ["coach", "isOpen"],
              emits: ["close", "updated"],
              template: `
                <div v-if="isOpen" data-test="edit-coach-modal">
                  <button @click="$emit('close')" data-test="close-modal-btn">Close</button>
                </div>
              `,
            },
          },
        },
      });

      await flushPromises();

      // Open modal
      const editBtn = wrapper.find('[data-test="edit-coach-btn"]');
      await editBtn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="edit-coach-modal"]').exists()).toBe(
        true,
      );

      // Close modal
      const closeBtn = wrapper.find('[data-test="close-modal-btn"]');
      await closeBtn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="edit-coach-modal"]').exists()).toBe(
        false,
      );
    });

    it("opens delete modal when delete is clicked", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
      await deleteBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(true);
    });

    it("deletes coach and navigates when confirmed", async () => {
      mockSmartDelete.mockResolvedValue({ cascadeUsed: false });

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
      await deleteBtn.trigger("click");
      await flushPromises();

      const confirmBtn = wrapper.find('[data-test="confirm-delete-btn"]');
      await confirmBtn.trigger("click");
      await flushPromises();

      expect(mockSmartDelete).toHaveBeenCalledWith("coach-123");
      expect(mockPush).toHaveBeenCalledWith("/coaches");
    });

    it("closes delete modal when cancelled", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
      await deleteBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(true);

      const cancelBtn = wrapper.find('[data-test="cancel-delete-btn"]');
      await cancelBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find('[data-test="delete-modal"]').exists()).toBe(false);
    });

    it("handles delete error gracefully", async () => {
      mockSmartDelete.mockRejectedValue(new Error("Delete failed"));

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
      await deleteBtn.trigger("click");
      await flushPromises();

      const confirmBtn = wrapper.find('[data-test="confirm-delete-btn"]');
      await confirmBtn.trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Delete failed");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Notes Management", () => {
    it("saves regular notes when save is clicked", async () => {
      mockUpdateCoach.mockResolvedValue(undefined);

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const notesEditors = wrapper.findAll('[data-test="coach-notes-editor"]');
      const regularNotesEditor = notesEditors[0];

      const input = regularNotesEditor.find('[data-test="notes-input"]');
      await input.setValue("Updated notes");

      const saveBtn = regularNotesEditor.find('[data-test="save-notes-btn"]');
      await saveBtn.trigger("click");
      await flushPromises();

      expect(mockUpdateCoach).toHaveBeenCalledWith("coach-123", {
        notes: "Updated notes",
      });
    });

    it("saves private notes for current user", async () => {
      mockUpdateCoach.mockResolvedValue(undefined);

      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      const notesEditors = wrapper.findAll('[data-test="coach-notes-editor"]');
      const privateNotesEditor = notesEditors[1];

      const input = privateNotesEditor.find('[data-test="notes-input"]');
      await input.setValue("My private thoughts");

      const saveBtn = privateNotesEditor.find('[data-test="save-notes-btn"]');
      await saveBtn.trigger("click");
      await flushPromises();

      expect(mockUpdateCoach).toHaveBeenCalledWith("coach-123", {
        private_notes: {
          "user-123": "My private thoughts",
        },
      });
    });
  });

  describe("Stats and Interactions", () => {
    it("renders stats grid component", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(wrapper.find('[data-test="coach-stats-grid"]').exists()).toBe(
        true,
      );
    });

    it("renders recent interactions component", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      await flushPromises();

      expect(
        wrapper.find('[data-test="coach-recent-interactions"]').exists(),
      ).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("has skip link", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      const skipLink = wrapper.find('a[href="#main-content"]');
      expect(skipLink.exists()).toBe(true);
      expect(skipLink.text()).toBe("Skip to main content");
    });

    it("main content has proper id for skip link", async () => {
      const CoachDetailPage = await import("~/pages/coaches/[id].vue").then(
        (m) => m.default,
      );
      const wrapper = mount(CoachDetailPage, {
        global: {
          stubs: { NuxtLink: { template: "<a><slot /></a>" }, Teleport: true },
        },
      });

      const mainContent = wrapper.find("#main-content");
      expect(mainContent.exists()).toBe(true);
    });
  });
});
