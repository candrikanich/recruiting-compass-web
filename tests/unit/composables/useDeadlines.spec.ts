import { describe, it, expect, vi, beforeEach } from "vitest";
import { computed } from "vue";
import { setActivePinia, createPinia } from "pinia";
import type { PlayerDetails } from "~/types/models";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => mockLogger,
}));

const mockPlayerDetails = { value: null as PlayerDetails | null };
vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    getPlayerDetails: () => mockPlayerDetails.value,
  }),
}));

vi.mock("~/composables/useRecruitingDeadlines", () => ({
  useRecruitingDeadlines: () => ({
    systemDeadlines: computed(() => [
      {
        id: "system-sat-1",
        label: "SAT Test Date",
        date: "2026-10-03",
        category: "test",
        source: "system",
      },
    ]),
    isStale: computed(() => false),
  }),
}));

describe("useDeadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockPlayerDetails.value = null;
  });

  it("exports fetchDeadlines, createDeadline, and removeDeadline", async () => {
    const mod = await import("~/composables/useDeadlines");
    expect(typeof mod.useDeadlines).toBe("function");
    const { fetchDeadlines, createDeadline, removeDeadline } =
      mod.useDeadlines();
    expect(typeof fetchDeadlines).toBe("function");
    expect(typeof createDeadline).toBe("function");
    expect(typeof removeDeadline).toBe("function");
  });

  it("fetchDeadlines calls GET /api/deadlines", async () => {
    mockFetchAuth.mockResolvedValue({ deadlines: [] });
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines } = useDeadlines();
    await fetchDeadlines();
    expect(mockFetchAuth).toHaveBeenCalledWith("/api/deadlines");
  });

  it("fetchDeadlines unwraps the { deadlines: [...] } envelope the real endpoint returns (server/api/deadlines/index.get.ts) into a plain array", async () => {
    const item = {
      id: "dead-1",
      label: "App deadline",
      deadline_date: "2026-11-01",
      category: "application",
    };
    mockFetchAuth.mockResolvedValue({ deadlines: [item] });
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, deadlines } = useDeadlines();
    await fetchDeadlines();

    expect(Array.isArray(deadlines.value)).toBe(true);
    expect(deadlines.value).toEqual([item]);
  });

  it("fetchDeadlines sets error when $fetchAuth rejects and resets loading to false", async () => {
    mockFetchAuth.mockRejectedValue(new Error("Network error"));
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, error, loading } = useDeadlines();
    await fetchDeadlines();
    expect(error.value).toBe("Failed to load deadlines");
    expect(loading.value).toBe(false);
  });

  it("createDeadline POSTs to /api/deadlines, re-fetches, and returns the deadline", async () => {
    const newDeadline = {
      id: "dead-2",
      label: "Visit",
      deadline_date: "2026-12-01",
      category: "visit",
    };
    mockFetchAuth
      .mockResolvedValueOnce({ success: true, deadline: newDeadline }) // POST
      .mockResolvedValueOnce({ deadlines: [newDeadline] }); // re-fetch GET
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { createDeadline } = useDeadlines();
    const result = await createDeadline({
      label: "Visit",
      deadline_date: "2026-12-01",
      category: "visit",
    });
    expect(mockFetchAuth).toHaveBeenCalledWith("/api/deadlines", {
      method: "POST",
      body: { label: "Visit", deadline_date: "2026-12-01", category: "visit" },
    });
    expect(mockFetchAuth).toHaveBeenCalledWith("/api/deadlines");
    expect(result).toEqual(newDeadline);
  });

  it("createDeadline logs error and re-throws when $fetchAuth rejects", async () => {
    const fetchError = new Error("Create failed");
    mockFetchAuth.mockRejectedValue(fetchError);
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { createDeadline } = useDeadlines();
    await expect(
      createDeadline({
        label: "X",
        deadline_date: "2026-01-01",
        category: "other",
      }),
    ).rejects.toThrow("Create failed");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to create deadline",
      fetchError,
    );
  });

  it("removeDeadline removes item from local state optimistically", async () => {
    mockFetchAuth
      .mockResolvedValueOnce({
        deadlines: [
          {
            id: "dead-1",
            label: "App deadline",
            deadline_date: "2026-11-01",
            category: "application",
          },
        ],
      })
      .mockResolvedValue(undefined);
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, removeDeadline, deadlines } = useDeadlines();
    await fetchDeadlines();
    expect(deadlines.value).toHaveLength(1);
    await removeDeadline("dead-1");
    expect(deadlines.value).toHaveLength(0);
    expect(mockFetchAuth).toHaveBeenCalledWith("/api/deadlines/dead-1", {
      method: "DELETE",
    });
  });

  it("removeDeadline logs error and re-throws when $fetchAuth rejects", async () => {
    const fetchError = new Error("Delete failed");
    mockFetchAuth.mockRejectedValue(fetchError);
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { removeDeadline } = useDeadlines();
    await expect(removeDeadline("dead-99")).rejects.toThrow("Delete failed");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to remove deadline",
      fetchError,
    );
  });
});

describe("unified view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockPlayerDetails.value = null;
  });

  it("merges user + system deadlines into unifiedDeadlines sorted by date", async () => {
    mockFetchAuth.mockResolvedValue({
      deadlines: [
        {
          id: "u1",
          label: "Stanford App",
          deadline_date: "2026-11-01",
          category: "application",
        },
      ],
    });
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, unifiedDeadlines } = useDeadlines();
    await fetchDeadlines();
    expect(unifiedDeadlines.value).toHaveLength(2);
    expect(unifiedDeadlines.value[0].id).toBe("system-sat-1"); // Oct before Nov
    expect(unifiedDeadlines.value[1].label).toBe("Stanford App");
  });

  it("upcomingDeadlines excludes past items", async () => {
    mockFetchAuth.mockResolvedValue({
      deadlines: [
        {
          id: "u1",
          label: "Old",
          deadline_date: "2020-01-01",
          category: "custom",
        },
      ],
    });
    const { useDeadlines } = await import("~/composables/useDeadlines");
    const { fetchDeadlines, upcomingDeadlines, pastDeadlines } =
      useDeadlines();
    await fetchDeadlines();
    expect(pastDeadlines.value.some((d) => d.label === "Old")).toBe(true);
    expect(upcomingDeadlines.value.some((d) => d.label === "Old")).toBe(
      false,
    );
  });
});
