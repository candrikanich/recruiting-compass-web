import { ref, computed, shallowRef, inject, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import { useToast } from "~/composables/useToast";
import { createClientLogger } from "~/utils/logger";
import type { FollowUpReminder } from "~/types/models";
import type { Database } from "~/types/database";

const logger = createClientLogger("useInteractionReminders");

type FollowUpRemindersTable =
  Database["public"]["Tables"]["follow_up_reminders"];
type FollowUpReminderInsert = FollowUpRemindersTable["Insert"];

export const useInteractionReminders = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily ?? useFamilyContext();
  const toast = useToast();

  const reminders = shallowRef<FollowUpReminder[]>([]);
  const remindersLoadingRef = ref(false);
  const remindersErrorRef = ref<string | null>(null);

  const remindersLoading: ComputedRef<boolean> = computed(
    () => remindersLoadingRef.value,
  );
  const remindersError: ComputedRef<string | null> = computed(
    () => remindersErrorRef.value,
  );

  const activeReminders = computed(() =>
    reminders.value.filter((r) => !r.is_completed),
  );

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

  const completedReminders = computed(() =>
    reminders.value.filter((r) => r.is_completed),
  );

  const highPriorityReminders = computed(() =>
    activeReminders.value.filter((r) => r.priority === "high"),
  );

  const loadReminders = async () => {
    if (!userStore.user) return;

    remindersLoadingRef.value = true;
    remindersErrorRef.value = null;

    try {
      const remindersResponse = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("due_date", { ascending: true });

      const { data, error: err } = remindersResponse as {
        data: FollowUpReminder[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;
      reminders.value = data || [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load reminders";
      remindersErrorRef.value = message;
      logger.error("Load reminders error:", err);
      toast.showToast("Failed to load reminders. Please try again.");
    } finally {
      remindersLoadingRef.value = false;
    }
  };

  const createReminder = async (
    title: string,
    dueDate: string,
    reminderType: FollowUpReminder["reminder_type"],
    priority: FollowUpReminder["priority"] = "medium",
    description?: string,
    schoolId?: string,
    coachId?: string,
    interactionId?: string,
  ): Promise<FollowUpReminder | null> => {
    if (!userStore.user) return null;

    remindersErrorRef.value = null;

    const dataOwnerUserId = activeFamily.getDataOwnerUserId();
    if (!dataOwnerUserId) {
      remindersErrorRef.value = "No user ID available";
      return null;
    }

    try {
      const newReminder: FollowUpReminderInsert = {
        user_id: dataOwnerUserId,
        title,
        description,
        due_date: dueDate,
        reminder_type: reminderType,
        priority,
        school_id: schoolId,
        coach_id: coachId,
        interaction_id: interactionId,
        is_completed: false,
      };

      const reminderResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("follow_up_reminders") as any)
          .insert([newReminder])
          .select()
          .single();

      const { data, error: err } = reminderResponse as {
        data: FollowUpReminder;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;

      reminders.value = [data, ...reminders.value];
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create reminder";
      remindersErrorRef.value = message;
      logger.error("Create reminder error:", err);
      toast.showToast("Failed to create reminder. Please try again.");
      return null;
    }
  };

  const completeReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersErrorRef.value = null;

    try {
      const completeResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("follow_up_reminders") as any)
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = completeResponse as { error: any };

      if (err) throw err;

      reminders.value = reminders.value.map((r) =>
        r.id === id
          ? { ...r, is_completed: true, completed_at: new Date().toISOString() }
          : r,
      );

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete reminder";
      remindersErrorRef.value = message;
      logger.error("Complete reminder error:", err);
      toast.showToast("Failed to complete reminder. Please try again.");
      return false;
    }
  };

  const deleteReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersErrorRef.value = null;

    try {
      const deleteResponse = await supabase
        .from("follow_up_reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = deleteResponse as { error: any };

      if (err) throw err;

      reminders.value = reminders.value.filter((r) => r.id !== id);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete reminder";
      remindersErrorRef.value = message;
      logger.error("Delete reminder error:", err);
      toast.showToast("Failed to delete reminder. Please try again.");
      return false;
    }
  };

  const updateReminder = async (
    id: string,
    updates: Partial<FollowUpReminder>,
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersErrorRef.value = null;

    try {
      const updateReminderResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("follow_up_reminders") as any)
          .update(updates)
          .eq("id", id)
          .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = updateReminderResponse as { error: any };

      if (err) throw err;

      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index] = { ...reminders.value[index], ...updates };
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update reminder";
      remindersErrorRef.value = message;
      logger.error("Update reminder error:", err);
      toast.showToast("Failed to update reminder. Please try again.");
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
    reminders: computed(() => reminders.value),
    remindersLoading,
    remindersError,
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
