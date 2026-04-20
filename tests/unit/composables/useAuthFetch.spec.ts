import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserStore } from "~/stores/user";

// The global setup.ts mocks useAuthFetch — unmock here to test the real implementation
vi.unmock("~/composables/useAuthFetch");

import { useAuthFetch, SessionExpiredError } from "~/composables/useAuthFetch";

// $fetch is a Nuxt global — stub it at module level
const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

// navigateTo is a Nuxt global — named so tests can assert on it
const mockNavigateTo = vi.fn();
vi.stubGlobal("navigateTo", mockNavigateTo);

// useSupabase is globally mocked in tests/setup.ts, but we need control
// over getSession per-test, so we override with a module-level vi.mock.
const mockGetSession = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

// useCsrf — hoist addCsrfHeader spy so tests can assert on it
const mockAddCsrfHeader = vi.fn(async (h: Record<string, string>) => h);

vi.mock("~/composables/useCsrf", () => ({
  useCsrf: () => ({
    addCsrfHeader: mockAddCsrfHeader,
  }),
}));

// useAppToast — named showToast so tests can assert on it
const mockShowToast = vi.fn();
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: mockShowToast }),
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
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid session
    mockGetSession.mockResolvedValue(VALID_SESSION);
    // Default: $fetch succeeds
    mockFetch.mockResolvedValue({ ok: true });
    // Default: no correlation ID in sessionStorage
    vi.spyOn(sessionStorage, "getItem").mockReturnValue(null);
    // Default: addCsrfHeader returns headers unchanged
    mockAddCsrfHeader.mockImplementation(async (h) => h);
    // Get the real Pinia store (set up in global beforeEach via setActivePinia)
    userStore = useUserStore();
    // Default: user is authenticated (normal usage)
    userStore.isAuthenticated = true;
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

    it("shows session-expired toast and redirects when authenticated user has no session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      userStore.isAuthenticated = true;
      const { $fetchAuth } = useAuthFetch();

      await expect($fetchAuth("/api/test")).rejects.toThrow(
        SessionExpiredError,
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining("expired"),
        "warning",
        expect.any(Number),
      );
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.stringContaining("session_expired"),
      );
    });

    it("throws SessionExpiredError silently when logged-out user has no session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      userStore.isAuthenticated = false;
      const { $fetchAuth } = useAuthFetch();

      await expect($fetchAuth("/api/test")).rejects.toThrow(
        SessionExpiredError,
      );
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it("shows session-expired toast and redirects when authenticated user gets 401", async () => {
      const fetchError = Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      });
      Object.setPrototypeOf(
        fetchError,
        (await import("ofetch")).FetchError.prototype,
      );
      mockFetch.mockRejectedValue(fetchError);
      userStore.isAuthenticated = true;

      const { $fetchAuth } = useAuthFetch();
      await expect($fetchAuth("/api/test")).rejects.toThrow(
        SessionExpiredError,
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining("expired"),
        "warning",
        expect.any(Number),
      );
    });

    it("throws SessionExpiredError silently when logged-out user gets 401", async () => {
      const fetchError = Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      });
      Object.setPrototypeOf(
        fetchError,
        (await import("ofetch")).FetchError.prototype,
      );
      mockFetch.mockRejectedValue(fetchError);
      userStore.isAuthenticated = false;

      const { $fetchAuth } = useAuthFetch();
      await expect($fetchAuth("/api/test")).rejects.toThrow(
        SessionExpiredError,
      );
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockNavigateTo).not.toHaveBeenCalled();
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

  describe("$fetchAuth — CSRF header injection", () => {
    it("calls addCsrfHeader for POST requests", async () => {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data", { method: "POST" });

      expect(mockAddCsrfHeader).toHaveBeenCalled();
    });

    it("calls addCsrfHeader for PUT requests", async () => {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data", { method: "PUT" });

      expect(mockAddCsrfHeader).toHaveBeenCalled();
    });

    it("calls addCsrfHeader for PATCH requests", async () => {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data", { method: "PATCH" });

      expect(mockAddCsrfHeader).toHaveBeenCalled();
    });

    it("calls addCsrfHeader for DELETE requests", async () => {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data", { method: "DELETE" });

      expect(mockAddCsrfHeader).toHaveBeenCalled();
    });

    it("does not call addCsrfHeader for GET requests", async () => {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/data", { method: "GET" });

      expect(mockAddCsrfHeader).not.toHaveBeenCalled();
    });
  });
});
