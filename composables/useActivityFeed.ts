import { ref, readonly, onUnmounted } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useAuth } from "~/composables/useAuth";
import type { Interaction, School } from "~/types/models";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface InteractionPayload {
  id: string;
  school_id: string;
  type: Interaction["type"];
  content?: string | null;
  subject?: string | null;
  occurred_at?: string | null;
  created_at: string;
}

interface SchoolStatusPayload {
  id: string;
  school_id: string;
  new_status: string;
  notes?: string | null;
  changed_at: string;
}

interface DocumentPayload {
  id: string;
  title: string;
  type: string;
  created_at: string;
}

export type ActivityEventType =
  | "interaction"
  | "school_status_change"
  | "document_upload"
  | "offer_change"
  | "suggestion_action"
  | "school_added"
  | "notification";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  title: string;
  description: string;
  icon: string;
  entityType?: "school" | "coach" | "document" | "task" | "interaction";
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
  clickable: boolean;
  clickUrl?: string;
}

export const useActivityFeed = () => {
  const supabase = useSupabase();
  const { session } = useAuth();

  const activities = ref<ActivityEvent[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const limit = ref(10);
  const offset = ref(0);

  const getInteractionIcon = (type: Interaction["type"]): string => {
    const iconMap: Record<Interaction["type"], string> = {
      email: "📧",
      phone_call: "☎️",
      text: "💬",
      in_person_visit: "🤝",
      virtual_meeting: "💻",
      camp: "⛺",
      showcase: "🎬",
      tweet: "🐦",
      dm: "📱",
    };
    return iconMap[type] || "📝";
  };

  const getInteractionTitle = (
    interaction: Interaction,
    school?: School,
  ): string => {
    const schoolName = school?.name || "Unknown School";
    const typeLabel = interaction.type.replace(/_/g, " ");
    return `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} with ${schoolName}`;
  };

  const getInteractionDescription = (interaction: Interaction): string => {
    if (interaction.content) {
      return (
        interaction.content.substring(0, 50) +
        (interaction.content.length > 50 ? "..." : "")
      );
    }
    if (interaction.subject) {
      return (
        interaction.subject.substring(0, 50) +
        (interaction.subject.length > 50 ? "..." : "")
      );
    }
    return "No additional details";
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const fetchActivities = async (options?: {
    limit?: number;
    offset?: number;
  }): Promise<void> => {
    if (!session.value?.user?.id) return;

    loading.value = true;
    error.value = null;

    try {
      const fetchLimit = options?.limit || limit.value;
      const fetchOffset = options?.offset || offset.value;

      const events: ActivityEvent[] = [];

      // Fetch interactions
      const interactionsResponse = await supabase
        .from("interactions")
        .select(
          "id, school_id, type, content, subject, occurred_at, created_at",
        )
        .eq("logged_by", session.value!.user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: interactions } = interactionsResponse as {
        data: Array<{
          id: string;
          school_id: string;
          type: string;
          content: string | null;
          subject: string | null;
          occurred_at: string | null;
          created_at: string;
        }> | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (interactions && interactions.length > 0) {
        // Get school details for interactions
        const schoolIds = [
          ...new Set(interactions.map((i) => i.school_id).filter(Boolean)),
        ];
        const schoolsResponse = await supabase
          .from("schools")
          .select("id, name")
          .in("id", schoolIds);

        const { data: schools } = schoolsResponse as {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: Array<{ id: string; name: string }> | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        const schoolMap = new Map(schools?.map((s) => [s.id, s]) || []);

        interactions.forEach((interaction) => {
          const school = schoolMap.get(interaction.school_id);
          events.push({
            id: `interaction-${interaction.id}`,
            type: "interaction",
            timestamp:
              interaction.occurred_at ||
              interaction.created_at ||
              new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            title: getInteractionTitle(
              interaction as Interaction,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              school as any,
            ),
            description: getInteractionDescription(interaction as Interaction),
            icon: getInteractionIcon(interaction.type as Interaction["type"]),
            entityType: "interaction",
            entityId: interaction.id,
            entityName: school?.name,
            clickable: true,
            clickUrl: `/interactions?id=${interaction.id}`,
          });
        });
      }

      // Fetch school status changes
      const statusChangesResponse = await supabase
        .from("school_status_history")
        .select("id, school_id, new_status, notes, changed_at")
        .eq("changed_by", session.value!.user!.id)
        .order("changed_at", { ascending: false })
        .limit(50);

      const { data: statusChanges } = statusChangesResponse as {
        data: Array<{
          id: string;
          school_id: string;
          new_status: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          notes: string | null;
          changed_at: string;
        }> | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (statusChanges && statusChanges.length > 0) {
        // Get school details for status changes
        const statusSchoolIds = [
          ...new Set(statusChanges.map((s) => s.school_id).filter(Boolean)),
        ];
        const statusSchoolsResponse = await supabase
          .from("schools")
          .select("id, name")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in("id", statusSchoolIds);

        const { data: statusSchools } = statusSchoolsResponse as {
          data: Array<{ id: string; name: string }> | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        const statusSchoolMap = new Map(
          statusSchools?.map((s) => [s.id, s]) || [],
        );

        statusChanges.forEach((change) => {
          const school = statusSchoolMap.get(change.school_id);
          const statusLabel = change.new_status.replace(/_/g, " ");
          events.push({
            id: `status-${change.id}`,
            type: "school_status_change",
            timestamp: change.changed_at,
            title: `${school?.name} status changed to ${statusLabel}`,
            description: change.notes || "No additional notes",
            icon: "📍",
            entityType: "school",
            entityId: change.school_id,
            entityName: school?.name,
            clickable: true,
            clickUrl: `/schools/${change.school_id}`,
          });
        });
      }

      // Fetch documents
      const documentsResponse = await supabase
        .from("documents")
        .select("id, title, type, created_at")
        .eq("user_id", session.value!.user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: documents } = documentsResponse as {
        data: Array<{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: string;
          title: string;
          type: string;
          created_at: string;
        }> | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (documents && documents.length > 0) {
        documents.forEach((doc) => {
          const typeLabel = doc.type.replace(/_/g, " ");
          events.push({
            id: `doc-${doc.id}`,
            type: "document_upload",
            timestamp: doc.created_at,
            title: `Uploaded ${typeLabel}`,
            description: doc.title,
            icon: "📄",
            entityType: "document",
            entityId: doc.id,
            entityName: doc.title,
            clickable: false,
          });
        });
      }

      // Sort all events by timestamp descending
      events.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      // Apply limit and offset
      const paginatedEvents = events.slice(
        fetchOffset,
        fetchOffset + fetchLimit,
      );

      // Format relative time for display
      paginatedEvents.forEach((event) => {
        event.metadata = {
          relativeTime: formatRelativeTime(event.timestamp),
        };
      });

      activities.value = paginatedEvents;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch activities";
      console.error("Error fetching activities:", err);
      activities.value = [];
    } finally {
      loading.value = false;
    }
  };

  const subscribeToUpdates = (): void => {
    if (!session.value?.user?.id) return;

    let channel: RealtimeChannel | null = null;

    try {
      channel = supabase.channel("activity-feed");

      // Subscribe to new interactions
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interactions",
          filter: `logged_by=eq.${session.value!.user!.id}`,
        },
        async (payload) => {
          const interaction = payload.new as unknown as InteractionPayload;
          const schoolResponse = await supabase
            .from("schools")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("id, name")
            .eq("id", interaction.school_id)
            .single();

          const { data: school } = schoolResponse as {
            data: { id: string; name: string } | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: any;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newEvent: ActivityEvent = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: `interaction-${interaction.id}`,
            type: "interaction",
            timestamp:
              interaction.occurred_at ||
              interaction.created_at ||
              new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            title: getInteractionTitle(interaction as any, school as any),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            description: getInteractionDescription(interaction as any),
            icon: getInteractionIcon(interaction.type),
            entityType: "interaction",
            entityId: interaction.id,
            entityName: school?.name,
            clickable: true,
            clickUrl: `/interactions?id=${interaction.id}`,
            metadata: {
              relativeTime: formatRelativeTime(
                interaction.occurred_at || interaction.created_at,
              ),
            },
          };

          // Prepend to feed
          activities.value = [
            newEvent,
            ...activities.value.slice(0, limit.value - 1),
          ];
        },
      );

      // Subscribe to school status changes
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "school_status_history",
          filter: `changed_by=eq.${session.value!.user!.id}`,
        },
        async (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const change = payload.new as unknown as SchoolStatusPayload;
          const schoolResponse = await supabase
            .from("schools")
            .select("id, name")
            .eq("id", change.school_id)
            .single();

          const { data: school } = schoolResponse as {
            data: { id: string; name: string } | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: any;
          };

          const statusLabel = change.new_status.replace(/_/g, " ");
          const newEvent: ActivityEvent = {
            id: `status-${change.id}`,
            type: "school_status_change",
            timestamp: change.changed_at,
            title: `${school?.name} status changed to ${statusLabel}`,
            description: change.notes || "No additional notes",
            icon: "📍",
            entityType: "school",
            entityId: change.school_id,
            entityName: school?.name,
            clickable: true,
            clickUrl: `/schools/${change.school_id}`,
            metadata: {
              relativeTime: formatRelativeTime(change.changed_at),
            },
          };

          activities.value = [
            newEvent,
            ...activities.value.slice(0, limit.value - 1),
          ];
        },
      );

      // Subscribe to document uploads
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "documents",
          filter: `user_id=eq.${session.value!.user!.id}`,
        },
        (payload) => {
          const doc = payload.new as unknown as DocumentPayload;
          const typeLabel = doc.type.replace(/_/g, " ");
          const newEvent: ActivityEvent = {
            id: `doc-${doc.id}`,
            type: "document_upload",
            timestamp: doc.created_at,
            title: `Uploaded ${typeLabel}`,
            description: doc.title,
            icon: "📄",
            entityType: "document",
            entityId: doc.id,
            entityName: doc.title,
            clickable: false,
            metadata: {
              relativeTime: formatRelativeTime(doc.created_at),
            },
          };

          activities.value = [
            newEvent,
            ...activities.value.slice(0, limit.value - 1),
          ];
        },
      );

      channel.subscribe();
    } catch (err) {
      console.error("Error subscribing to activity updates:", err);
    }

    onUnmounted(() => {
      if (channel) {
        channel.unsubscribe();
      }
    });
  };

  return {
    activities: readonly(activities),
    loading: readonly(loading),
    error: readonly(error),
    limit,
    offset,
    fetchActivities,
    subscribeToUpdates,
    formatRelativeTime,
  };
};
