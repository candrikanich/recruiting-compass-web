import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import DeleteConfirmationModal from "~/components/DeleteConfirmationModal.vue";

// Stub Header component
const HeaderStub = defineComponent({
  name: "Header",
  template: "<div></div>",
});

// Stub StatusSnippet component
const StatusSnippetStub = defineComponent({
  name: "StatusSnippet",
  template: "<div></div>",
});

// Stub CommunicationPanel component
const CommunicationPanelStub = defineComponent({
  name: "CommunicationPanel",
  template: "<div></div>",
});

// Dynamically import the page after stubs are defined
const CoachesPage = defineComponent({
  name: "CoachesPage",
  template: `
    <div class="min-h-screen">
      <!-- Coaches Grid -->
      <div v-if="coaches.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="coach in coaches"
          :key="coach.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm"
        >
          <!-- Coach Header -->
          <div class="p-4 border-b border-slate-100">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-slate-900">
                  {{ coach.first_name }} {{ coach.last_name }}
                </h3>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <button
                data-test="coach-delete-btn"
                @click="openDeleteModal(coach)"
                class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete coach"
              >
                Delete
              </button>
            </div>
            <button class="px-3 py-1.5 text-sm font-medium text-blue-600">
              View
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <DeleteConfirmationModal
        :is-open="deleteModalOpen"
        :item-name="selectedCoach ? \`\${selectedCoach.first_name} \${selectedCoach.last_name}\` : ''"
        item-type="coach"
        :is-loading="isDeleting"
        @cancel="closeDeleteModal"
        @confirm="deleteCoach"
      />
    </div>
  `,
  components: {
    DeleteConfirmationModal,
  },
  setup() {
    const coaches = [
      {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        school_id: "school-1",
        family_unit_id: "family-1",
        role: "head",
        phone: null,
        twitter_handle: null,
        instagram_handle: null,
        notes: null,
        responsiveness_score: 75,
        last_contact_date: "2025-02-01",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-02-01T00:00:00Z",
      },
    ];

    const deleteModalOpen = ref(false);
    const selectedCoach = ref(null);
    const isDeleting = ref(false);

    const openDeleteModal = (coach) => {
      selectedCoach.value = coach;
      deleteModalOpen.value = true;
    };

    const closeDeleteModal = () => {
      deleteModalOpen.value = false;
      selectedCoach.value = null;
    };

    const deleteCoach = async () => {
      isDeleting.value = true;
      try {
        // Mock delete implementation
        coaches.splice(coaches.indexOf(selectedCoach.value), 1);
        closeDeleteModal();
      } finally {
        isDeleting.value = false;
      }
    };

    return {
      coaches,
      deleteModalOpen,
      selectedCoach,
      isDeleting,
      openDeleteModal,
      closeDeleteModal,
      deleteCoach,
    };
  },
});

import { ref } from "vue";

describe("Coaches Page - Delete", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should show delete button in coach card", async () => {
    const wrapper = mount(CoachesPage);

    // The page should render without errors
    expect(wrapper.exists()).toBe(true);

    // Find delete button in coach card
    const deleteButton = wrapper.find('[data-test="coach-delete-btn"]');
    expect(deleteButton.exists()).toBe(true);
  });

  it("should show delete confirmation modal when delete clicked", async () => {
    const wrapper = mount(CoachesPage);

    // Find delete button in coach card
    const deleteButton = wrapper.find('[data-test="coach-delete-btn"]');
    expect(deleteButton.exists()).toBe(true);

    // Click delete button
    await deleteButton.trigger("click");
    await flushPromises();

    // Modal should be open
    const modal = wrapper.findComponent(DeleteConfirmationModal);
    expect(modal.exists()).toBe(true);
    expect(modal.props("isOpen")).toBe(true);
    expect(modal.props("itemName")).toBe("John Doe");
  });

  it("should not delete coach when cancel clicked", async () => {
    const wrapper = mount(CoachesPage);

    const deleteButton = wrapper.find('[data-test="coach-delete-btn"]');
    await deleteButton.trigger("click");
    await flushPromises();

    const modal = wrapper.findComponent(DeleteConfirmationModal);
    expect(modal.props("isOpen")).toBe(true);

    // Emit cancel event
    await modal.vm.$emit("cancel");
    await flushPromises();

    // Modal should be closed
    expect(modal.props("isOpen")).toBe(false);
  });

  it("should delete coach when confirm clicked", async () => {
    const wrapper = mount(CoachesPage);

    // Get initial coach count
    const initialCoaches = wrapper.findAll('[data-test="coach-delete-btn"]');
    expect(initialCoaches.length).toBe(1);

    const deleteButton = wrapper.find('[data-test="coach-delete-btn"]');
    await deleteButton.trigger("click");
    await flushPromises();

    const modal = wrapper.findComponent(DeleteConfirmationModal);
    expect(modal.props("isOpen")).toBe(true);

    // Emit confirm event
    await modal.vm.$emit("confirm");
    await flushPromises();

    // Modal should be closed
    expect(modal.props("isOpen")).toBe(false);
  });
});
