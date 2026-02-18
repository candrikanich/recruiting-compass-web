import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthFetch, SessionExpiredError } from "~/composables/useAuthFetch";

// $fetch is a Nuxt global — stub it at module level
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// navigateTo is a Nuxt global
vi.stubGlobal("navigateTo", vi.fn());

// useSupabase is globally mocked in tests/setup.ts, but we need control
// over getSession per-test, so we override with a module-level vi.mock.
const mockGetSession = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

// useCsrf — stub addCsrfHeader to return headers unchanged (no HTTP calls)
vi.mock("~/composables/useCsrf", () => ({
  useCsrf: () => ({
    addCsrfHeader: vi.fn(async (h: Record<string, string>) => h),
  }),
}));

// useToast — stub showToast so no side effects
vi.mock("~/composables/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const VALID_SESSION = {
  data: {
    session: {
      access_token: "test-access-token",
      user: { id: "user-123" },
    },
  },
};

describe("useAuthFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid session
    mockGetSession.mockResolvedValue(VALID_SESSION);
    // Default: $fetch succeeds
    mockFetch.mockResolvedValue({ ok: true });
    // Default: no correlation ID in sessionStorage
    vi.spyOn(sessionStorage, "getItem").mockReturnValue(null);
  });

  describe("$fetchAuth — auth header injection", () => {
    it("injects Authorization header from the active session token", async () => {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-access-token",
          }),
        }),
      );
    });

    it("throws SessionExpiredError and redirects when there is no session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const { $fetchAuth } = useAuthFetch();

      await expect($fetchAuth("/api/test")).rejects.toThrow(SessionExpiredError);
    });

    it("throws SessionExpiredError when the API returns 401", async () => {
      const fetchError = Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      });
      // make it look like ofetch FetchError
      Object.setPrototypeOf(
        fetchError,
        (await import("ofetch")).FetchError.prototype,
      );
      mockFetch.mockRejectedValue(fetchError);

      const { $fetchAuth } = useAuthFetch();
      await expect($fetchAuth("/api/test")).rejects.toThrow(SessionExpiredError);
    });
  });

  describe("$fetchAuth — correlation ID header injection", () => {
    it("sends x-request-id when correlation ID exists in sessionStorage", async () => {
      vi.spyOn(sessionStorage, "getItem").mockReturnValue(
        "test-correlation-id-123",
      );

      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/data",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-request-id": "test-correlation-id-123",
          }),
        }),
      );
    });

    it("does not send x-request-id when sessionStorage has no correlation ID", async () => {
      vi.spyOn(sessionStorage, "getItem").mockReturnValue(null);

      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data");

      const calledHeaders = (mockFetch.mock.calls[0][1] as any).headers;
      expect(calledHeaders).not.toHaveProperty("x-request-id");
    });

    it("reads the correlation ID from the correct sessionStorage key", async () => {
      const getItemSpy = vi
        .spyOn(sessionStorage, "getItem")
        .mockReturnValue("some-id");

      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data");

      expect(getItemSpy).toHaveBeenCalledWith("correlation-id");
    });

    it("forwards caller-supplied headers alongside the correlation ID", async () => {
      vi.spyOn(sessionStorage, "getItem").mockReturnValue("corr-abc");

      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data", {
        headers: { "Content-Type": "application/json" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/data",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-request-id": "corr-abc",
          }),
        }),
      );
    });
  });
});
