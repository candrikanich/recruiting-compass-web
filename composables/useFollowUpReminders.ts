import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { FollowUpReminder } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type FollowUpReminderInsert =
  Database["public"]["Tables"]["follow_up_reminders"]["Insert"];
type FollowUpReminderUpdate =
  Database["public"]["Tables"]["follow_up_reminders"]["Update"];

export const useFollowUpReminders = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const reminders = ref<FollowUpReminder[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const activeReminders = computed(() => {
    return reminders.value.filter((r) => !r.is_completed);
  });

  const overdueReminders = computed(() => {
    const now = new Date();
    return activeReminders.value.filter((r) => new Date(r.due_date) < now);
  });

  const upcomingReminders = computed(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return activeReminders.value.filter(
      (r) =>
        new Date(r.due_date) >= now && new Date(r.due_date) <= oneWeekFromNow,
    );
  });

  const completedReminders = computed(() => {
    return reminders.value.filter((r) => r.is_completed);
  });

  const highPriorityReminders = computed(() => {
    return activeReminders.value.filter((r) => r.priority === "high");
  });

  const loadReminders = async () => {
    if (!userStore.user) return;

    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: err } = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("due_date", { ascending: true });

      if (err) throw err;
      reminders.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load reminders";
      console.error("Load reminders error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  const createReminder = async (
    title: string,
    dueDate: string,
    reminderType: FollowUpReminder["reminder_type"],
    _priority: FollowUpReminder["priority"] = "medium",
    description?: string,
    schoolId?: string,
    coachId?: string,
    interactionId?: string,
  ): Promise<FollowUpReminder | null> => {
    if (!userStore.user) return null;

    error.value = null;

    try {
      const newReminder: FollowUpReminderInsert = {
        user_id: userStore.user.id,
        notes: description,
        reminder_date: dueDate,
        reminder_type: reminderType as "email" | "sms" | "phone_call" | null,
        school_id: schoolId,
        coach_id: coachId,
        interaction_id: interactionId,
        is_completed: false,
      };

      const { data, error: err } = await supabase
        .from("follow_up_reminders")
        .insert([newReminder] as FollowUpReminderInsert[])
        .select()
        .single();

      if (err) throw err;

      reminders.value = [data, ...reminders.value];
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to create reminder";
      console.error("Create reminder error:", err);
      return null;
    }
  };

  const completeReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("follow_up_reminders")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        } as FollowUpReminderUpdate)
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index].is_completed = true;
        reminders.value[index].completed_at = new Date().toISOString();
      }

      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to complete reminder";
      console.error("Complete reminder error:", err);
      return false;
    }
  };

  const deleteReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("follow_up_reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      reminders.value = reminders.value.filter((r) => r.id !== id);
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete reminder";
      console.error("Delete reminder error:", err);
      return false;
    }
  };

  const updateReminder = async (
    id: string,
    updates: Partial<FollowUpReminder>,
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("follow_up_reminders")
        .update(updates as FollowUpReminderUpdate)
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index] = { ...reminders.value[index], ...updates };
      }

      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update reminder";
      console.error("Update reminder error:", err);
      return false;
    }
  };

  const getRemindersFor = (
    entityType: "school" | "coach" | "interaction",
    entityId: string,
  ): FollowUpReminder[] => {
    const key =
      entityType === "school"
        ? "school_id"
        : entityType === "coach"
          ? "coach_id"
          : "interaction_id";
    return reminders.value.filter(
      (r) => r[key as keyof FollowUpReminder] === entityId,
    );
  };

  const formatDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const dateAtMidnight = new Date(date);
    dateAtMidnight.setHours(0, 0, 0, 0);

    if (dateAtMidnight.getTime() === today.getTime()) {
      return "Today";
    }
    if (dateAtMidnight.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }
    if (dateAtMidnight < today) {
      const daysOverdue = Math.floor(
        (today.getTime() - dateAtMidnight.getTime()) / (24 * 60 * 60 * 1000),
      );
      return "Overdue by " + daysOverdue + " day(s)";
    }
    if (dateAtMidnight <= oneWeekFromNow) {
      const daysUntil = Math.floor(
        (dateAtMidnight.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      return "In " + daysUntil + " day(s)";
    }

    return date.toLocaleDateString();
  };

  return {
    reminders,
    isLoading,
    error,
    activeReminders,
    overdueReminders,
    upcomingReminders,
    completedReminders,
    highPriorityReminders,
    loadReminders,
    createReminder,
    completeReminder,
    deleteReminder,
    updateReminder,
    getRemindersFor,
    formatDueDate,
  };
};
