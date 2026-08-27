import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAdminResource } from "~/composables/useAdminResource";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";

vi.mock("~/composables/useAdminAuthHeaders");

const mockGetAuthHeaders = vi.fn();
const mockFetch = vi.fn();

const options = {
  failLabel: "Failed to load thing",
  fallbackMessage: "Could not load the thing.",
};

describe("useAdminResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.mocked(useAdminAuthHeaders).mockReturnValue({
      getAuthHeaders: mockGetAuthHeaders,
    });
    mockGetAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with null data, not loading, no error", () => {
    const { data, loading, error } = useAdminResource<{ ok: boolean }>(
      () => "/api/admin/thing",
      options,
    );
    expect(data.value).toBeNull();
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("sets data from the JSON body on success and clears error", async () => {
    const payload = { ok: true, count: 3 };
    mockFetch.mockResolvedValue({ ok: true, json: async () => payload });

    const { data, loading, error, load } = useAdminResource<typeof payload>(
      () => "/api/admin/thing",
      options,
    );
    await load();

    expect(data.value).toEqual(payload);
    expect(error.value).toBeNull();
    expect(loading.value).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/thing", {
      headers: { Authorization: "Bearer token" },
    });
  });

  it("passes load() args through to the URL builder", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const buildUrl = vi.fn((id: string) => `/api/admin/thing/${id}`);

    const { load } = useAdminResource<unknown, [string]>(buildUrl, options);
    await load("abc");

    expect(buildUrl).toHaveBeenCalledWith("abc");
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/thing/abc", {
      headers: { Authorization: "Bearer token" },
    });
  });

  it("sets error to `${failLabel}: <status>` on a non-OK response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    const { data, error, load } = useAdminResource(() => "/api/admin/thing", options);
    await load();

    expect(error.value).toBe("Failed to load thing: 503");
    expect(data.value).toBeNull();
  });

  it("surfaces a thrown Error's message", async () => {
    mockGetAuthHeaders.mockRejectedValue(new Error("Not authenticated"));

    const { error, load } = useAdminResource(() => "/api/admin/thing", options);
    await load();

    expect(error.value).toBe("Not authenticated");
  });

  it("falls back to fallbackMessage for a non-Error throw", async () => {
    mockFetch.mockRejectedValue("boom");

    const { error, load } = useAdminResource(() => "/api/admin/thing", options);
    await load();

    expect(error.value).toBe("Could not load the thing.");
  });

  it("resets loading to false after a failure", async () => {
    mockFetch.mockRejectedValue(new Error("nope"));

    const { loading, load } = useAdminResource(() => "/api/admin/thing", options);
    await load();

    expect(loading.value).toBe(false);
  });
});
