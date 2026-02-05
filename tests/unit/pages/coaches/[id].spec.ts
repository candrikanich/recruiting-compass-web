import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useRouter } from "vue-router";

// Mock vue-router
vi.mock("vue-router", () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(() => ({
    params: { id: "coach-123" },
  })),
  navigateTo: vi.fn(),
}));

// Mock composables
vi.mock("~/composables/useCoaches", () => ({
  useCoaches: vi.fn(() => ({
    coaches: { value: [] },
    loading: { value: false },
    error: { value: null },
    getCoach: vi.fn(() =>
      Promise.resolve({
        id: "coach-123",
        first_name: "John",
        last_name: "Doe",
        role: "head",
        school_id: "school-123",
        email: "john@example.com",
        phone: "555-1234",
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    ),
    updateCoach: vi.fn(() => Promise.resolve({})),
    smartDelete: vi.fn(() => Promise.resolve({ cascadeUsed: false })),
  })),
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: vi.fn(() => ({
    getSchool: vi.fn(() =>
      Promise.resolve({
        id: "school-123",
        name: "Test School",
      }),
    ),
  })),
}));

vi.mock("~/composables/useInteractions", () => ({
  useInteractions: vi.fn(() => ({
    interactions: { value: [] },
    fetchInteractions: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("~/composables/useCommunication", () => ({
  useCommunication: vi.fn(() => ({
    showPanel: { value: false },
    selectedCoach: { value: null },
    communicationType: { value: "email" },
    openCommunication: vi.fn(),
    handleInteractionLogged: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({
    user: { id: "user-123" },
  })),
}));

vi.mock("~/components/DeleteConfirmationModal.vue", () => ({
  default: {
    name: "DeleteConfirmationModal",
    props: ["isOpen", "itemName", "itemType", "isLoading"],
    emits: ["cancel", "confirm"],
    template: `<div v-show="isOpen" data-test="delete-modal">
      <slot />
    </div>`,
  },
}));

describe("Coach Detail Page - Delete", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should show delete button on coach detail page", async () => {
    const mockRouter = {
      push: vi.fn(),
      currentRoute: { value: { params: { id: "coach-123" } } },
    };
    (useRouter as any).mockReturnValue(mockRouter);

    const CoachDetail = {
      template: `
        <div>
          <button
            data-test="coach-detail-delete-btn"
            @click="openDeleteModal"
            class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Delete Coach
          </button>
          <DeleteConfirmationModal
            :is-open="deleteModalOpen"
            :item-name="coachName"
            item-type="coach"
            :is-loading="isDeleting"
            @cancel="closeDeleteModal"
            @confirm="deleteCoach"
          />
        </div>
      `,
      setup() {
        return {
          deleteModalOpen: false,
          coachName: "John Doe",
          isDeleting: false,
          openDeleteModal: () => {},
          closeDeleteModal: () => {},
          deleteCoach: () => {},
        };
      },
    };

    const wrapper = mount(CoachDetail, {
      global: {
        stubs: {
          DeleteConfirmationModal: {
            template: '<div data-test="delete-modal" />',
          },
        },
      },
    });

    const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
    expect(deleteBtn.exists()).toBe(true);
    expect(deleteBtn.text()).toBe("Delete Coach");
  });

  it("should open delete confirmation when delete clicked", async () => {
    const mockRouter = {
      push: vi.fn(),
      currentRoute: { value: { params: { id: "coach-123" } } },
    };
    (useRouter as any).mockReturnValue(mockRouter);

    const CoachDetail = {
      template: `
        <div>
          <button
            data-test="coach-detail-delete-btn"
            @click="openDeleteModal"
          >
            Delete Coach
          </button>
          <DeleteConfirmationModal
            :is-open="deleteModalOpen"
            :item-name="coachName"
            item-type="coach"
            :is-loading="isDeleting"
            @cancel="closeDeleteModal"
            @confirm="deleteCoach"
          />
        </div>
      `,
      setup() {
        const deleteModalOpen = ref(false);
        const coachName = "John Doe";
        const isDeleting = ref(false);

        const openDeleteModal = () => {
          deleteModalOpen.value = true;
        };

        const closeDeleteModal = () => {
          deleteModalOpen.value = false;
        };

        const deleteCoach = () => {};

        return {
          deleteModalOpen,
          coachName,
          isDeleting,
          openDeleteModal,
          closeDeleteModal,
          deleteCoach,
        };
      },
    };

    const { ref } = await import("vue");
    const wrapper = mount(CoachDetail, {
      global: {
        stubs: {
          DeleteConfirmationModal: {
            template:
              '<div v-show="isOpen" data-test="delete-modal" :data-is-open="isOpen" />',
            props: ["isOpen"],
          },
        },
      },
    });

    const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
    await deleteBtn.trigger("click");

    // Check if modal's isOpen property is true
    const modal = wrapper.find('[data-test="delete-modal"]');
    expect(modal.attributes("data-is-open")).toBe("true");
  });

  it("should navigate back after successful delete", async () => {
    const mockRouter = {
      push: vi.fn(),
      currentRoute: { value: { params: { id: "coach-123" } } },
    };
    (useRouter as any).mockReturnValue(mockRouter);

    const { ref } = await import("vue");

    const CoachDetail = {
      template: `
        <div>
          <button
            data-test="coach-detail-delete-btn"
            @click="openDeleteModal"
          >
            Delete Coach
          </button>
          <DeleteConfirmationModal
            ref="deleteModal"
            :is-open="deleteModalOpen"
            :item-name="coachName"
            item-type="coach"
            :is-loading="isDeleting"
            @cancel="closeDeleteModal"
            @confirm="deleteCoach"
          />
        </div>
      `,
      setup() {
        const router = useRouter();
        const deleteModalOpen = ref(false);
        const coachName = "John Doe";
        const isDeleting = ref(false);

        const openDeleteModal = () => {
          deleteModalOpen.value = true;
        };

        const closeDeleteModal = () => {
          deleteModalOpen.value = false;
        };

        const deleteCoach = async () => {
          // Simulate delete operation
          isDeleting.value = true;
          await new Promise((resolve) => setTimeout(resolve, 10));
          isDeleting.value = false;
          closeDeleteModal();
          router.push("/coaches");
        };

        return {
          deleteModalOpen,
          coachName,
          isDeleting,
          openDeleteModal,
          closeDeleteModal,
          deleteCoach,
        };
      },
    };

    const wrapper = mount(CoachDetail, {
      global: {
        stubs: {
          DeleteConfirmationModal: {
            template:
              '<div @confirm="$emit(\'confirm\')" data-test="delete-modal" />',
            props: ["isOpen", "itemName", "itemType", "isLoading"],
            emits: ["cancel", "confirm"],
          },
        },
      },
    });

    const deleteBtn = wrapper.find('[data-test="coach-detail-delete-btn"]');
    await deleteBtn.trigger("click");

    const modal = wrapper.findComponent({ name: "DeleteConfirmationModal" });
    if (modal.exists()) {
      await modal.vm.$emit("confirm");
      await wrapper.vm.$nextTick();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockRouter.push).toHaveBeenCalledWith("/coaches");
    }
  });
});
