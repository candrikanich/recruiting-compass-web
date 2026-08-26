import { describe, it, expect, vi, beforeEach } from "vitest";

vi.stubGlobal("$fetch", vi.fn());

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
    const mockFetch = vi.fn().mockResolvedValue({ leads: [], counts: null });
    vi.stubGlobal("$fetch", mockFetch);
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
    const mockFetch = vi.fn().mockResolvedValue({
      leads: [sampleLead],
      counts: sampleCounts,
    });
    vi.stubGlobal("$fetch", mockFetch);
    const { useProfileContacts } = await import(
      "~/composables/useProfileContacts"
    );
    const { leads, counts, fetchContacts, loading } = useProfileContacts();
    const promise = fetchContacts();
    expect(loading.value).toBe(true);
    await promise;
    expect(mockFetch).toHaveBeenCalledWith("/api/player/profile/contacts");
    expect(leads.value).toEqual([sampleLead]);
    expect(counts.value).toEqual(sampleCounts);
    expect(loading.value).toBe(false);
  });

  it("fetchContacts sets a user-friendly error and resets loading when $fetch rejects", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("$fetch", mockFetch);
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
});
