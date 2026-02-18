import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { createClientLogger } from "~/utils/logger";
import type { Notification } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type _NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
type _NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];

const logger = createClientLogger("useNotifications");

export const useNotifications = (): {
  notifications: ComputedRef<Notification[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  unreadCount: ComputedRef<number>;
  unreadNotifications: ComputedRef<Notification[]>;
  highPriorityNotifications: ComputedRef<Notification[]>;
  fetchNotifications: (filters?: {
    isRead?: boolean;
    type?: string;
    limit?: number;
  }) => Promise<void>;
  createNotification: (
    notificationData: Omit<Notification, "id" | "created_at" | "updated_at">,
  ) => Promise<Notification>;
  markAsRead: (id: string) => Promise<Notification>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
} => {
  const supabase = useSupabase();
  let userStore: ReturnType<typeof useUserStore> | undefined;

  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore();
    }
    return userStore;
  };

  const notifications = ref<Notification[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchNotifications = async (filters?: {
    isRead?: boolean;
    type?: string;
    limit?: number;
  }) => {
    const store = getUserStore();
    if (!store.user) return;

    loading.value = true;
    error.value = null;

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", getUserStore().user!.id)
        .order("scheduled_for", { ascending: false });

      if (filters?.isRead !== undefined) {
        if (filters.isRead) {
          query = query.not("read_at", "is", null);
        } else {
          query = query.is("read_at", null);
        }
      }

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      notifications.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch notifications";
      error.value = message;
      logger.error("Notification fetch error:", message);
    } finally {
      loading.value = false;
    }
  };

  const createNotification = async (
    notificationData: Omit<Notification, "id" | "created_at" | "updated_at">,
  ) => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: insertError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("notifications") as any)
          .insert([
            {
              ...notificationData,
              user_id: store.user.id,
            },
          ])
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Notification; error: any };

      if (insertError) throw insertError;

      notifications.value.unshift(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create notification";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const markAsRead = async (id: string) => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { data, error: updateError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("notifications") as any)
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: Notification; error: any };

      if (updateError) throw updateError;

      const index = notifications.value.findIndex((n) => n.id === id);
      if (index !== -1) {
        notifications.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update notification";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const markAllAsRead = async () => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const unreadIds = notifications.value
        .filter((n) => !n.read_at)
        .map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error: updateError } =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("notifications") as any)
          .update({ read_at: new Date().toISOString() })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in("id", unreadIds)) as { error: any };

      if (updateError) throw updateError;

      const now = new Date().toISOString();
      notifications.value = notifications.value.map((n) => ({
        ...n,
        read_at: n.read_at || now,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to mark all as read";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteNotification = async (id: string) => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      notifications.value = notifications.value.filter((n) => n.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete notification";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteAllRead = async () => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const readIds = notifications.value
        .filter((n) => n.read_at)
        .map((n) => n.id);

      if (readIds.length === 0) return;

      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .in("id", readIds);

      if (deleteError) throw deleteError;

      notifications.value = notifications.value.filter((n) => !n.read_at);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to delete read notifications";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const unreadCount = computed(
    () => notifications.value.filter((n) => !n.read_at).length,
  );
  const unreadNotifications = computed(() =>
    notifications.value.filter((n) => !n.read_at),
  );
  const highPriorityNotifications = computed(() =>
    notifications.value.filter((n) => n.priority === "high" && !n.read_at),
  );

  return {
    notifications: computed(() => notifications.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    unreadCount,
    unreadNotifications,
    highPriorityNotifications,
    fetchNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  };
};
