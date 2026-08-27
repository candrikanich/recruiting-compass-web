import { describe, it, expect, vi, beforeEach } from "vitest";

// The inbox composable must authenticate through useAuthFetch (Bearer token),
// NOT bare $fetch — the app sets no auth cookie, so a bare $fetch 401s in prod.
// Mocking useAuthFetch (and leaving global $fetch unstubbed) makes a regression
// to bare $fetch fail here instead of only in production.
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

const sampleLead = {
  id: "lead-1",
  type: "interest" as const,
  coach_name: "Coach Smith",
  coach_email: "coach@school.edu",
  coach_title: "Head Coach",
  school_name: "State University",
  program: "Baseball",
  note: "Loved your highlight film.",
  matched_coach_id: null,
  created_at: "2026-08-01T00:00:00.000Z",
};

const sampleCounts = {
  interestThisMonth: 2,
  contactThisMonth: 1,
  totalThisMonth: 3,
};

describe("useProfileContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty leads and zeroed counts", async () => {
    mockFetchAuth.mockResolvedValue({ leads: [], counts: null });
    const { useProfileContacts } = await import(
      "~/composables/useProfileContacts"
    );
    const { leads, counts } = useProfileContacts();
    expect(leads.value).toEqual([]);
    expect(counts.value).toEqual({
      interestThisMonth: 0,
      contactThisMonth: 0,
      totalThisMonth: 0,
    });
  });

  it("fetchContacts populates leads and counts from GET /api/player/profile/contacts", async () => {
    mockFetchAuth.mockResolvedValue({
      leads: [sampleLead],
      counts: sampleCounts,
    });
    const { useProfileContacts } = await import(
      "~/composables/useProfileContacts"
    );
    const { leads, counts, fetchContacts, loading } = useProfileContacts();
    const promise = fetchContacts();
    expect(loading.value).toBe(true);
    await promise;
    expect(mockFetchAuth).toHaveBeenCalledWith("/api/player/profile/contacts");
    expect(leads.value).toEqual([sampleLead]);
    expect(counts.value).toEqual(sampleCounts);
    expect(loading.value).toBe(false);
  });

  it("fetchContacts sets a user-friendly error and resets loading when the request rejects", async () => {
    mockFetchAuth.mockRejectedValue(new Error("Network error"));
    const { useProfileContacts } = await import(
      "~/composables/useProfileContacts"
    );
    const { fetchContacts, error, loading, leads } = useProfileContacts();
    await fetchContacts();
    expect(error.value).toBe("Failed to load your inbox. Please try again.");
    expect(loading.value).toBe(false);
    expect(leads.value).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("resolveLead POSTs status=resolved with interactionId to the resolve endpoint and refetches", async () => {
    mockFetchAuth.mockResolvedValue({ leads: [], counts: sampleCounts });
    const { useProfileContacts } = await import(
      "~/composables/useProfileContacts"
    );
    const { resolveLead } = useProfileContacts();
    mockFetchAuth.mockClear();
    mockFetchAuth
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ leads: [], counts: sampleCounts });
    await resolveLead("lead-1", "interaction-1");
    expect(mockFetchAuth).toHaveBeenNthCalledWith(
      1,
      "/api/player/profile/contacts/lead-1/resolve",
      { method: "POST", body: { status: "resolved", interactionId: "interaction-1" } },
    );
    expect(mockFetchAuth).toHaveBeenNthCalledWith(
      2,
      "/api/player/profile/contacts",
    );
  });

  it("dismissLead POSTs status=dismissed to the resolve endpoint and refetches", async () => {
    mockFetchAuth.mockResolvedValue({ leads: [], counts: sampleCounts });
    const { useProfileContacts } = await import(
      "~/composables/useProfileContacts"
    );
    const { dismissLead } = useProfileContacts();
    mockFetchAuth.mockClear();
    mockFetchAuth
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ leads: [], counts: sampleCounts });
    await dismissLead("lead-1");
    expect(mockFetchAuth).toHaveBeenNthCalledWith(
      1,
      "/api/player/profile/contacts/lead-1/resolve",
      { method: "POST", body: { status: "dismissed" } },
    );
    expect(mockFetchAuth).toHaveBeenNthCalledWith(
      2,
      "/api/player/profile/contacts",
    );
  });
});
