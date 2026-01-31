<template>
  <div v-if="showCard" class="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-blue-900">
        <span class="mr-1">🔒</span>Your Private Notes
      </h3>
      <button
        v-if="!editing"
        @click="startEdit"
        class="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
      >
        {{ noteContent ? "Edit" : "Add Notes" }}
      </button>
    </div>

    <div v-if="!editing" class="mt-2 text-sm text-blue-800">
      <p v-if="noteContent" class="whitespace-pre-wrap">{{ noteContent }}</p>
      <p v-else class="text-blue-600 italic">No private notes yet. Add your own thoughts here.</p>
    </div>

    <div v-else class="mt-2 space-y-2">
      <textarea
        v-model="editedContent"
        class="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows="4"
        placeholder="Your private notes (only you can see these)..."
      />
      <div class="flex gap-2">
        <button
          @click="saveNote"
          :disabled="saving"
          class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {{ saving ? "Saving..." : "Save" }}
        </button>
        <button
          @click="cancelEdit"
          class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 transition"
        >
          Cancel
        </button>
        <button
          v-if="noteContent && !saving"
          @click="deleteNote"
          class="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useUserNotes } from "~/composables/useUserNotes";
import { useUserStore } from "~/stores/user";

interface Props {
  entityType: "school" | "coach" | "interaction";
  entityId: string;
}

const props = withDefaults(defineProps<Props>(), {});
const userStore = useUserStore();
const userNotes = useUserNotes();

const noteContent = ref<string>("");
const editing = ref(false);
const editedContent = ref<string>("");
const saving = ref(false);
const loadingNote = ref(false);

const showCard = computed(() => {
  // Show for students and parents, not for admins
  return !userStore.isAdmin;
});

const startEdit = () => {
  editedContent.value = noteContent.value;
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
  editedContent.value = "";
};

const saveNote = async () => {
  saving.value = true;
  try {
    const success = await userNotes.saveNote(
      props.entityType,
      props.entityId,
      editedContent.value
    );

    if (success) {
      noteContent.value = editedContent.value;
      editing.value = false;
    }
  } catch (err) {
    console.error("Failed to save note:", err);
  } finally {
    saving.value = false;
  }
};

const deleteNote = async () => {
  saving.value = true;
  try {
    const success = await userNotes.deleteNote(props.entityType, props.entityId);

    if (success) {
      noteContent.value = "";
      editing.value = false;
    }
  } catch (err) {
    console.error("Failed to delete note:", err);
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  loadingNote.value = true;
  try {
    const note = await userNotes.getNote(props.entityType, props.entityId);
    noteContent.value = note || "";
  } catch (err) {
    console.error("Failed to load note:", err);
  } finally {
    loadingNote.value = false;
  }
});
</script>
