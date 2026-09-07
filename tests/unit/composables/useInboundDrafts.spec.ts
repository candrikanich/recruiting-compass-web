import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchAuthMock = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: fetchAuthMock }),
}));

import { useInboundDrafts } from "~/composables/useInboundDrafts";

describe("useInboundDrafts", () => {
  beforeEach(() => {
    fetchAuthMock.mockReset();
  });

  it("fetches pending drafts on load", async () => {
    fetchAuthMock.mockResolvedValue({
      drafts: [{ id: "draft-1", status: "pending" }],
    });
    const { drafts, fetchDrafts, loading, error } = useInboundDrafts();
    await fetchDrafts();
    expect(fetchAuthMock).toHaveBeenCalledWith("/api/inbound-drafts");
    expect(drafts.value).toEqual([{ id: "draft-1", status: "pending" }]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("removes a draft from the list after confirming it", async () => {
    fetchAuthMock.mockResolvedValueOnce({
      drafts: [{ id: "draft-1", status: "pending" }],
    });
    const { drafts, fetchDrafts, confirmDraft } = useInboundDrafts();
    await fetchDrafts();
    fetchAuthMock.mockResolvedValueOnce({
      ok: true,
      interactionId: "interaction-1",
    });
    await confirmDraft("draft-1");
    expect(fetchAuthMock).toHaveBeenCalledWith(
      "/api/inbound-drafts/draft-1/confirm",
      {
        method: "POST",
        body: {},
      },
    );
    expect(drafts.value).toEqual([]);
  });

  it("removes a draft from the list after discarding it", async () => {
    fetchAuthMock.mockResolvedValueOnce({
      drafts: [{ id: "draft-1", status: "pending" }],
    });
    const { drafts, fetchDrafts, discardDraft } = useInboundDrafts();
    await fetchDrafts();
    fetchAuthMock.mockResolvedValueOnce({ ok: true });
    await discardDraft("draft-1");
    expect(fetchAuthMock).toHaveBeenCalledWith(
      "/api/inbound-drafts/draft-1/discard",
      { method: "POST" },
    );
    expect(drafts.value).toEqual([]);
  });

  it("surfaces a fetch error without throwing", async () => {
    fetchAuthMock.mockRejectedValue(new Error("network down"));
    const { fetchDrafts, error, loading } = useInboundDrafts();
    await fetchDrafts();
    expect(error.value).toBe("Failed to load drafts");
    expect(loading.value).toBe(false);
  });
});
