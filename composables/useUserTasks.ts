import { ref, computed } from 'vue'
import { useSupabase } from './useSupabase'
import { useUserStore } from '~/stores/user'

export interface UserTask {
  id: string
  text: string
  completed: boolean
  created_at: string
  completed_at?: string | null
}

export const useUserTasks = () => {
  const supabase = useSupabase()
  const userStore = useUserStore()

  const tasks = ref<UserTask[]>([])
  const loading = ref(false)

  // Fetch tasks from Supabase user_preferences
  const fetchTasks = async () => {
    if (!userStore.user) return

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('user_tasks')
        .eq('user_id', userStore.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch tasks:', error)
        return
      }

      if (data?.user_tasks?.tasks) {
        tasks.value = data.user_tasks.tasks
      } else {
        // Migrate from localStorage if exists
        const savedTasks = localStorage.getItem('recruitingTasks')
        if (savedTasks) {
          const localTasks = JSON.parse(savedTasks)
          tasks.value = localTasks.map((t: { text: string; completed: boolean }, idx: number) => ({
            id: `migrated-${idx}-${Date.now()}`,
            text: t.text,
            completed: t.completed,
            created_at: new Date().toISOString(),
            completed_at: t.completed ? new Date().toISOString() : null,
          }))
          // Save migrated tasks to Supabase
          await saveTasks()
          // Clear localStorage
          localStorage.removeItem('recruitingTasks')
        } else {
          tasks.value = []
        }
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e)
    } finally {
      loading.value = false
    }
  }

  // Save tasks to Supabase
  const saveTasks = async () => {
    if (!userStore.user) return

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          user_tasks: { tasks: tasks.value }
        })
        .eq('user_id', userStore.user.id)

      if (error) {
        console.error('Failed to save tasks:', error)
      }
    } catch (e) {
      console.error('Failed to save tasks:', e)
    }
  }

  // Add a new task
  const addTask = async (text: string) => {
    const newTask: UserTask = {
      id: `task-${Date.now()}`,
      text,
      completed: false,
      created_at: new Date().toISOString(),
    }
    tasks.value.push(newTask)
    await saveTasks()
    return newTask
  }

  // Toggle task completion
  const toggleTask = async (taskId: string) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.completed = !task.completed
      task.completed_at = task.completed ? new Date().toISOString() : null
      await saveTasks()
    }
  }

  // Delete a task
  const deleteTask = async (taskId: string) => {
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    await saveTasks()
  }

  // Update task text
  const updateTask = async (taskId: string, text: string) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.text = text
      await saveTasks()
    }
  }

  // Clear completed tasks
  const clearCompleted = async () => {
    tasks.value = tasks.value.filter(t => !t.completed)
    await saveTasks()
  }

  // Computed properties
  const pendingTasks = computed(() => tasks.value.filter(t => !t.completed))
  const completedTasks = computed(() => tasks.value.filter(t => t.completed))
  const taskCount = computed(() => tasks.value.length)
  const pendingCount = computed(() => pendingTasks.value.length)
  const completedCount = computed(() => completedTasks.value.length)

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
  }
}
