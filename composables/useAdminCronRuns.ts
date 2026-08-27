import { computed } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import { useAdminResource } from "~/composables/useAdminResource";
import type {
  AdminCronRunsResponse,
  CronJobSummary,
  CronRunRow,
} from "~/server/api/admin/cron-runs.get";

export type { CronJobSummary, CronRunRow };

export function useAdminCronRuns() {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const {
    data,
    loading: cronLoading,
    error: cronError,
    load: loadCronRuns,
  } = useAdminResource<AdminCronRunsResponse>(() => "/api/admin/cron-runs", {
    failLabel: "Failed to load cron runs",
    fallbackMessage: "Failed to load cron runs",
  });

  const jobs = computed<CronJobSummary[]>(() => data.value?.jobs ?? []);
  const recent = computed<CronRunRow[]>(() => data.value?.recent ?? []);

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
