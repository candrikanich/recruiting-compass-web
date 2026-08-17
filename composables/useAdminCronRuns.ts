import { ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import type {
  AdminCronRunsResponse,
  CronJobSummary,
  CronRunRow,
} from "~/server/api/admin/cron-runs.get";

export type { CronJobSummary, CronRunRow };

export function useAdminCronRuns() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const jobs = ref<CronJobSummary[]>([]);
  const recent = ref<CronRunRow[]>([]);
  const cronLoading = ref(false);
  const cronError = ref<string | null>(null);

  const loadCronRuns = async () => {
    cronLoading.value = true;
    cronError.value = null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/cron-runs", { headers });
      if (!res.ok) throw new Error(`Failed to load cron runs: ${res.status}`);
      const data = (await res.json()) as AdminCronRunsResponse;
      jobs.value = data.jobs;
      recent.value = data.recent;
    } catch (err) {
      cronError.value =
        err instanceof Error ? err.message : "Failed to load cron runs";
    } finally {
      cronLoading.value = false;
    }
  };

  async function triggerJob(
    jobName: string,
    dryRun = false,
  ): Promise<{ ok: true; jobName: string; dryRun: boolean; result?: unknown }> {
    const headers = await getAuthHeaders();
    const res = await $fetch<{
      ok: true;
      jobName: string;
      dryRun: boolean;
      result?: unknown;
    }>("/api/admin/cron/trigger", {
      method: "POST",
      headers,
      body: { jobName, dryRun },
    });
    await loadCronRuns();
    return res;
  }

  return { jobs, recent, cronLoading, cronError, loadCronRuns, triggerJob };
}
