<template>
  <div
    v-if="showTasks"
    class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6"
  >
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md"
        >
          <CheckIcon class="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div class="flex items-center gap-2">
          <h2 class="text-slate-900 font-semibold">Quick Tasks</h2>
          <span
            v-if="pendingCount > 0"
            class="px-3 py-1 bg-brand-blue-100 text-brand-blue-700 rounded-full text-xs font-semibold"
            aria-label="pending tasks count"
          >
            {{ pendingCount }} pending
          </span>
        </div>
      </div>
      <button
        @click="showTaskForm = !showTaskForm"
        :aria-expanded="showTaskForm"
        aria-controls="task-form"
        class="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 text-white rounded-lg text-sm font-medium hover:from-brand-blue-600 hover:to-brand-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon class="w-4 h-4" aria-hidden="true" />
        Add Task
      </button>
    </div>

    <!-- Add Task Form -->
    <form
      v-if="showTaskForm"
      id="task-form"
      @submit.prevent="handleAddTask"
      class="mb-4 p-3 rounded-xl border-2 border-brand-blue-500 bg-brand-blue-100"
    >
      <label
        for="new-task-input"
        class="block text-sm font-medium text-slate-700 mb-2"
      >
        Enter your task
      </label>
      <input
        id="new-task-input"
        v-model="newTask"
        type="text"
        placeholder="e.g., Email coach, Review videos"
        class="w-full bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 mb-2 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
        @keydown.escape="showTaskForm = false"
        autofocus
        required
        minlength="3"
        maxlength="200"
      />
      <div class="flex gap-2 justify-end">
        <button
          type="submit"
          aria-label="Save task"
          class="px-3 py-1.5 text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <CheckIcon class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="showTaskForm = false"
          aria-label="Cancel adding task"
          class="px-3 py-1.5 text-slate-500 hover:text-slate-700 font-medium hover:bg-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </form>

    <!-- Tasks List -->
    <ul
      v-if="tasks.length > 0"
      class="space-y-2 max-h-48 overflow-y-auto"
      role="list"
      aria-label="Quick tasks list"
    >
      <li
        v-for="task in tasks"
        :key="task.id"
        role="listitem"
        :class="[
          'flex items-center gap-3 p-3 rounded-xl border-2 transition-all group',
          task.completed
            ? 'bg-slate-50 border-slate-200'
            : 'bg-white border-slate-200 hover:border-blue-300',
        ]"
      >
        <input
          type="checkbox"
          :id="`task-${task.id}`"
          :checked="task.completed"
          @change="$emit('toggle-task', task.id)"
          class="w-5 h-5 rounded-md border-2 border-slate-300 checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
          :aria-label="`${task.text}, toggle completion status`"
        />
        <label
          :for="`task-${task.id}`"
          :class="[
            'flex-1 text-sm transition-all cursor-pointer',
            task.completed ? 'text-slate-400 line-through' : 'text-slate-700',
          ]"
        >
          {{ task.text }}
        </label>
        <button
          @click="$emit('delete-task', task.id)"
          :aria-label="`Delete task: ${task.text}`"
          class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-all p-1 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:opacity-100"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </li>
    </ul>

    <!-- Empty State -->
    <div v-else class="text-center py-8 text-slate-500">
      <p class="text-sm mb-2">No tasks yet</p>
      <p class="text-xs text-slate-400">Click "Add Task" to get started</p>
    </div>

    <!-- Clear Completed -->
    <button
      v-if="completedCount > 0"
      @click="$emit('clear-completed')"
      :aria-label="`Clear ${completedCount} completed tasks`"
      class="mt-4 w-full py-2 text-slate-500 text-sm hover:text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 rounded"
    >
      Clear {{ completedCount }} completed
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/vue/24/outline";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Props {
  tasks?: Task[];
  showTasks?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  tasks: () => [],
  showTasks: true,
});

const emit = defineEmits<{
  "add-task": [text: string];
  "toggle-task": [id: string];
  "delete-task": [id: string];
  "clear-completed": [];
}>();

const showTaskForm = ref(false);
const newTask = ref("");

const handleAddTask = () => {
  if (newTask.value.trim()) {
    emit("add-task", newTask.value);
    newTask.value = "";
    showTaskForm.value = false;
  }
};

const pendingCount = computed(
  () => props.tasks.filter((t) => !t.completed).length,
);
const completedCount = computed(
  () => props.tasks.filter((t) => t.completed).length,
);
</script>
