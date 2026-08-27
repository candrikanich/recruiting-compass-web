import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";
import { useAdminGrowth } from "~/composables/useAdminGrowth";
import { useAdminAuditLog } from "~/composables/useAdminAuditLog";
import { useAdminCronRuns } from "~/composables/useAdminCronRuns";
import { useAdminUserDetail } from "~/composables/useAdminUserDetail";
import { useAdminStats } from "~/composables/useAdminStats";
import { useAdminHealthCheck } from "~/composables/useAdminHealthCheck";

vi.mock("~/composables/useAdminAuthHeaders");

const mockGetAuthHeaders = vi.fn();
const mockFetch = vi.fn();

const okJson = (body: unknown) => ({ ok: true, json: async () => body });

describe("admin composable migration to useAdminResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.mocked(useAdminAuthHeaders).mockReturnValue({
      getAuthHeaders: mockGetAuthHeaders,
    });
    mockGetAuthHeaders.mockResolvedValue({ Authorization: "Bearer t" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("useAdminGrowth defaults days to 30 in the request URL", async () => {
    mockFetch.mockResolvedValue(okJson({ funnel: [] }));
    const { fetchGrowth, data } = useAdminGrowth();
    await fetchGrowth();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/growth?days=30",
      expect.anything(),
    );
    expect(data.value).toEqual({ funnel: [] });
  });

  it("useAdminGrowth forwards an explicit day count", async () => {
    mockFetch.mockResolvedValue(okJson({}));
    await useAdminGrowth().fetchGrowth(7);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/growth?days=7",
      expect.anything(),
    );
  });

  it("useAdminAuditLog exposes rows/total derived from the payload", async () => {
    const { rows, total, fetchAuditLog } = useAdminAuditLog();
    expect(rows.value).toEqual([]);
    expect(total.value).toBe(0);

    mockFetch.mockResolvedValue(okJson({ rows: [{ id: "a" }], total: 42 }));
    await fetchAuditLog({ limit: 10, action: "view_as.start" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/audit-log?limit=10&action=view_as.start",
      expect.anything(),
    );
    expect(rows.value).toEqual([{ id: "a" }]);
    expect(total.value).toBe(42);
  });

  it("useAdminAuditLog builds a bare URL when no options are given", async () => {
    mockFetch.mockResolvedValue(okJson({ rows: [], total: 0 }));
    await useAdminAuditLog().fetchAuditLog();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/audit-log",
      expect.anything(),
    );
  });

  it("useAdminCronRuns exposes jobs/recent + cronLoading/cronError", async () => {
    const { jobs, recent, cronLoading, cronError, loadCronRuns } =
      useAdminCronRuns();
    expect(jobs.value).toEqual([]);
    expect(recent.value).toEqual([]);
    expect(cronLoading.value).toBe(false);
    expect(cronError.value).toBeNull();

    mockFetch.mockResolvedValue(
      okJson({ jobs: [{ jobName: "x" }], recent: [{ id: "r" }] }),
    );
    await loadCronRuns();

    expect(jobs.value).toEqual([{ jobName: "x" }]);
    expect(recent.value).toEqual([{ id: "r" }]);
  });

  it("useAdminUserDetail fetches by id", async () => {
    mockFetch.mockResolvedValue(okJson({ id: "u1" }));
    const { fetchDetail, data } = useAdminUserDetail();
    await fetchDetail("u1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/users/u1",
      expect.anything(),
    );
    expect(data.value).toEqual({ id: "u1" });
  });

  it("useAdminStats exposes stats/statsLoading/statsError + loadStats", async () => {
    const { stats, statsLoading, statsError, loadStats } = useAdminStats();
    expect(stats.value).toBeNull();
    expect(statsLoading.value).toBe(false);
    expect(statsError.value).toBeNull();

    mockFetch.mockResolvedValue(okJson({ users: 5 }));
    await loadStats();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/stats",
      expect.anything(),
    );
    expect(stats.value).toEqual({ users: 5 });
  });

  it("useAdminStats surfaces the status error string on non-OK", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const { statsError, loadStats } = useAdminStats();
    await loadStats();
    expect(statsError.value).toBe("Failed to load stats: 500");
  });

  it("useAdminHealthCheck exposes health/healthLoading/healthError + loadHealth", async () => {
    mockFetch.mockResolvedValue(okJson({ ok: true, checks: [] }));
    const { health, healthLoading, healthError, loadHealth } =
      useAdminHealthCheck();
    expect(health.value).toBeNull();
    expect(healthLoading.value).toBe(false);
    expect(healthError.value).toBeNull();

    await loadHealth();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/health",
      expect.anything(),
    );
    expect(health.value).toEqual({ ok: true, checks: [] });
  });
});
