import { ref } from "vue";
import { useAuthFetch } from "~/composables/useAuthFetch";
import type { VideoLinkRow } from "~/types/models";

export interface CreateVideoLinkPayload {
  platform: VideoLinkRow["platform"];
  url: string;
  title?: string;
}

export type UpdateVideoLinkPayload = Partial<
  Pick<VideoLinkRow, "platform" | "url" | "title">
>;

/**
 * Thin per-row CRUD client over /api/video-links.
 *
 * Deliberately NOT a bulk JSONB save: the health-check cron writes
 * `health_status`/`last_health_check` directly on each row, so overwriting
 * the whole list on every edit would clobber that data. Each mutation talks
 * to exactly one row.
 */
export function useVideoLinks() {
  const { $fetchAuth } = useAuthFetch();

  const links = ref<VideoLinkRow[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetchAuth<{ videoLinks: VideoLinkRow[] }>(
        "/api/video-links",
      );
      links.value = res.videoLinks ?? [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load video links";
    } finally {
      isLoading.value = false;
    }
  };

  const add = async (
    payload: CreateVideoLinkPayload,
  ): Promise<VideoLinkRow> => {
    const res = await $fetchAuth<{ videoLink: VideoLinkRow }>(
      "/api/video-links",
      {
        method: "POST",
        body: payload,
      },
    );
    links.value = [...links.value, res.videoLink];
    return res.videoLink;
  };

  const update = async (
    id: string,
    patch: UpdateVideoLinkPayload,
  ): Promise<VideoLinkRow> => {
    const res = await $fetchAuth<{ videoLink: VideoLinkRow }>(
      `/api/video-links/${id}`,
      {
        method: "PATCH",
        body: patch,
      },
    );
    links.value = links.value.map((link) =>
      link.id === id ? res.videoLink : link,
    );
    return res.videoLink;
  };

  const remove = async (id: string): Promise<void> => {
    await $fetchAuth(`/api/video-links/${id}`, { method: "DELETE" });
    links.value = links.value.filter((link) => link.id !== id);
  };

  return {
    links,
    isLoading,
    error,
    load,
    add,
    update,
    remove,
  };
}
