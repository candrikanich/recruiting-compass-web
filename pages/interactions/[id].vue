<template>
  <main id="main-content" class="max-w-4xl mx-auto">
    <div v-if="interaction" class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold">{{ interaction.subject }}</h1>
          <p class="text-gray-600 mt-2">
            {{ formatDateTime(interaction.occurred_at) }}
          </p>
        </div>
        <InteractionActions @export="handleExport" @delete="openDeleteModal" />
      </div>

      <!-- Status Badges -->
      <StatusBadges
        :type="interaction.type"
        :direction="interaction.direction"
        :sentiment="interaction.sentiment"
      />

      <!-- Main Content -->
      <section aria-labelledby="content-heading">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 id="content-heading" class="text-xl font-bold mb-4">Content</h2>
          <p class="text-gray-700 whitespace-pre-wrap">
            {{ interaction.content }}
          </p>
        </div>
      </section>

      <!-- Details Grid -->
      <section aria-labelledby="details-heading">
        <h2 id="details-heading" class="sr-only">Details</h2>
        <div class="grid grid-cols-2 gap-4">
          <DetailCard
            label="School"
            :value="school?.name"
            :link-to="school ? `/schools/${school.id}` : undefined"
          />

          <DetailCard
            label="Coach"
            :value="coachFullName"
            :link-to="coach ? `/coaches/${coach.id}` : undefined"
          />

          <DetailCard
            label="Event"
            :value="event?.name"
            :link-to="event ? `/events/${event.id}` : undefined"
          />

          <DetailCard label="Logged By" :value="loggedByName" />
        </div>
      </section>

      <!-- Attachments -->
      <AttachmentList
        v-if="interaction.attachments && interaction.attachments.length > 0"
        :attachments="interaction.attachments"
      />

      <!-- Metadata -->
      <section aria-labelledby="metadata-heading">
        <h2 id="metadata-heading" class="sr-only">Metadata</h2>
        <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
          <p>
            <span class="font-semibold">Created:</span>
            {{ formatDateTime(interaction.created_at) }}
          </p>
        </div>
      </section>
    </div>

    <!-- Loading -->
    <div
      v-else
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="text-center py-12"
    >
      <p class="text-gray-600">Loading interaction details...</p>
      <div class="sr-only">Please wait while the page loads.</div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="showDeleteConfirm"
      title="Delete Interaction"
      message="Are you sure you want to delete this interaction? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="closeDeleteModal"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useInteractions } from "~/composables/useInteractions";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useEvents } from "~/composables/useEvents";
import { useUsers } from "~/composables/useUsers";
import { useUserStore } from "~/stores/user";
import { useDeleteModal } from "~/composables/useDeleteModal";
import { formatDateTime } from "~/utils/dateFormatters";
import { downloadSingleInteractionCSV } from "~/utils/interactions/exportSingleCSV";
import type { Interaction } from "~/types/models";
import DetailCard from "~/components/Interaction/DetailCard.vue";
import StatusBadges from "~/components/Interaction/StatusBadges.vue";
import InteractionActions from "~/components/Interaction/InteractionActions.vue";
import AttachmentList from "~/components/Interaction/AttachmentList.vue";
import ConfirmDialog from "~/components/DesignSystem/ConfirmDialog.vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { getInteraction, deleteInteraction: deleteInt } = useInteractions();
const { schools } = useSchools();
const { coaches } = useCoaches();
const { events } = useEvents();
const { getUserById } = useUsers();

const interactionId = route.params.id as string;
const interaction = ref<Interaction | null>(null);
const loggedByUser = ref<{ full_name?: string } | null>(null);

// Delete modal management
const {
  isOpen: showDeleteConfirm,
  isDeleting,
  open: openDeleteModal,
  close: closeDeleteModal,
  confirm: confirmDeleteAction,
} = useDeleteModal(deleteInt);

onMounted(async () => {
  // Redirect to add page if trying to create new interaction
  if (interactionId === "new") {
    await router.push("/interactions/add");
    return;
  }

  interaction.value = await getInteraction(interactionId);

  // Fetch user who logged this interaction
  if (interaction.value?.logged_by) {
    loggedByUser.value = await getUserById(interaction.value.logged_by);
  }
});

const school = computed(() => {
  if (!interaction.value?.school_id) return null;
  return (
    schools.value?.find((s) => s.id === interaction.value?.school_id) ?? null
  );
});

const coach = computed(() => {
  if (!interaction.value?.coach_id) return null;
  return (
    coaches.value?.find((c) => c.id === interaction.value?.coach_id) ?? null
  );
});

const event = computed(() => {
  if (!interaction.value?.event_id) return null;
  return (
    events.value?.find((e) => e.id === interaction.value?.event_id) ?? null
  );
});

const coachFullName = computed(() => {
  if (!coach.value) return null;
  return `${coach.value.first_name} ${coach.value.last_name}`;
});

const loggedByName = computed(() => {
  if (!interaction.value?.logged_by) return "Unknown";

  if (userStore.user?.id === interaction.value.logged_by) {
    return "You";
  }

  if (loggedByUser.value?.full_name) {
    return loggedByUser.value.full_name;
  }

  return "Unknown User";
});

const handleExport = () => {
  if (!interaction.value) return;
  downloadSingleInteractionCSV(interaction.value, school.value, coach.value);
};

const confirmDelete = async () => {
  await confirmDeleteAction(interactionId, () => {
    router.push("/interactions");
  });
};
</script>
