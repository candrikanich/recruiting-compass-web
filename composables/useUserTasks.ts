import { ref, computed } from "vue";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";

export interface UserTask {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  completed_at?: string | null;
}

const logger = createClientLogger("useUserTasks");

export const useUserTasks = () => {
  // Lazy-load store to avoid Pinia timing issues
  let userStore: ReturnType<typeof useUserStore> | undefined;

  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore();
    }
    return userStore;
  };

  const tasks = ref<UserTask[]>([]);
  const loading = ref(false);

  const STORAGE_KEY = "user_tasks";

  // Fetch tasks from localStorage
  const fetchTasks = async () => {
    const store = getUserStore();
    if (!store.user) return;

    loading.value = true;
    try {
      const savedTasks = localStorage.getItem(
        `${STORAGE_KEY}-${store.user.id}`,
      );
      if (savedTasks) {
        tasks.value = JSON.parse(savedTasks);
      } else {
        tasks.value = [];
      }
    } catch (e) {
      logger.error("Failed to fetch tasks:", e);
      tasks.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Save tasks to localStorage
  const saveTasks = async () => {
    const store = getUserStore();
    if (!store.user) return;

    try {
      localStorage.setItem(
        `${STORAGE_KEY}-${store.user.id}`,
        JSON.stringify(tasks.value),
      );
    } catch (e) {
      logger.error("Failed to save tasks:", e);
    }
  };

  // Add a new task
  const addTask = async (text: string) => {
    const newTask: UserTask = {
      id: `task-${Date.now()}`,
      text,
      completed: false,
      created_at: new Date().toISOString(),
    };
    tasks.value.push(newTask);
    await saveTasks();
    return newTask;
  };

  // Toggle task completion
  const toggleTask = async (taskId: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completed_at = task.completed ? new Date().toISOString() : null;
      await saveTasks();
    }
  };

  // Delete a task
  const deleteTask = async (taskId: string) => {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    await saveTasks();
  };

  // Update task text
  const updateTask = async (taskId: string, text: string) => {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.text = text;
      await saveTasks();
    }
  };

  // Clear completed tasks
  const clearCompleted = async () => {
    tasks.value = tasks.value.filter((t) => !t.completed);
    await saveTasks();
  };

  // Computed properties
  const pendingTasks = computed(() => tasks.value.filter((t) => !t.completed));
  const completedTasks = computed(() => tasks.value.filter((t) => t.completed));
  const taskCount = computed(() => tasks.value.length);
  const pendingCount = computed(() => pendingTasks.value.length);
  const completedCount = computed(() => completedTasks.value.length);

  return {
    tasks: computed(() => tasks.value),
    loading: computed(() => loading.value),
    pendingTasks,
    completedTasks,
    taskCount,
    pendingCount,
    completedCount,
    fetchTasks,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    clearCompleted,
  };
};
