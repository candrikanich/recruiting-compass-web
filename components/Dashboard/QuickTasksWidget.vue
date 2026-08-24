<template>
  <div
    v-if="showTasks"
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-md"
        >
          <UIcon
            name="i-heroicons-check"
            class="h-5 w-5 text-white"
            aria-hidden="true"
          />
        </div>
        <div class="flex items-center gap-2">
          <h2 class="font-semibold text-slate-900">Quick Tasks</h2>
          <span
            v-if="pendingCount > 0"
            class="rounded-full bg-brand-blue-100 px-3 py-1 text-xs font-semibold text-brand-blue-700"
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
        class="flex items-center gap-2 rounded-lg bg-linear-to-r from-brand-blue-500 to-brand-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:from-brand-blue-600 hover:to-brand-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <UIcon name="i-heroicons-plus" class="h-4 w-4" aria-hidden="true" />
        Add Task
      </button>
    </div>

    <!-- Add Task Form -->
    <form
      v-if="showTaskForm"
      id="task-form"
      @submit.prevent="handleAddTask"
      class="mb-4 rounded-xl border-2 border-brand-blue-500 bg-brand-blue-100 p-3"
    >
      <label
        for="new-task-input"
        class="mb-2 block text-sm font-medium text-slate-700"
      >
        Enter your task
      </label>
      <input
        id="new-task-input"
        v-model="newTask"
        type="text"
        placeholder="e.g., Email coach, Review videos"
        class="mb-2 w-full rounded-sm border-none bg-transparent px-2 py-1 text-sm text-slate-700 outline-hidden placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
        @keydown.escape="showTaskForm = false"
        autofocus
        required
        minlength="3"
        maxlength="200"
      />
      <div class="flex justify-end gap-2">
        <button
          type="submit"
          aria-label="Save task"
          class="rounded-sm px-3 py-1.5 font-medium text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          <UIcon name="i-heroicons-check" class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="showTaskForm = false"
          aria-label="Cancel adding task"
          class="rounded-sm px-3 py-1.5 font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:ring-2 focus:ring-slate-500"
        >
          <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
        </button>
      </div>
    </form>

    <!-- Tasks List -->
    <ul
      v-if="tasks.length > 0"
      class="max-h-48 space-y-2 overflow-y-auto"
      role="list"
      aria-label="Quick tasks list"
    >
      <li
        v-for="task in tasks"
        :key="task.id"
        role="listitem"
        :class="[
          'group flex items-center gap-3 rounded-xl border-2 p-3 transition-all',
          task.completed
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-200 bg-white hover:border-blue-300',
        ]"
      >
        <input
          type="checkbox"
          :id="`task-${task.id}`"
          :checked="task.completed"
          @change="$emit('toggle-task', task.id)"
          class="h-5 w-5 cursor-pointer rounded-md border-2 border-slate-300 checked:border-blue-500 checked:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :aria-label="`${task.text}, toggle completion status`"
        />
        <label
          :for="`task-${task.id}`"
          :class="[
            'flex-1 cursor-pointer text-sm transition-all',
            task.completed ? 'text-slate-400 line-through' : 'text-slate-700',
          ]"
        >
          {{ task.text }}
        </label>
        <button
          @click="$emit('delete-task', task.id)"
          :aria-label="`Delete task: ${task.text}`"
          class="rounded-sm p-1 text-red-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:ring-2 focus:ring-red-500"
        >
          <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <!-- Empty State -->
    <div v-else class="py-8 text-center text-slate-500">
      <p class="mb-2 text-sm">No tasks yet</p>
      <p class="text-xs text-slate-400">Click "Add Task" to get started</p>
    </div>

    <!-- Clear Completed -->
    <button
      v-if="completedCount > 0"
      @click="$emit('clear-completed')"
      :aria-label="`Clear ${completedCount} completed tasks`"
      class="mt-4 w-full rounded-sm py-2 text-sm text-slate-500 transition hover:text-slate-700 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
    >
      Clear {{ completedCount }} completed
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
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
