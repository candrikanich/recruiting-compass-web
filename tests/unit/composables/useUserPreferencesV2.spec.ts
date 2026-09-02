import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

const { mockFetchAuth, mockLogger } = vi.hoisted(() => ({
  mockFetchAuth: vi.fn(),
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => mockLogger,
}));

import { useUserPreferencesV2 } from "~/composables/useUserPreferencesV2";

describe("useUserPreferencesV2", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    localStorageMock = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        localStorageMock[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Initial state ──────────────────────────────────────────────

  it("returns empty preferences and idle state initially", () => {
    const { preferences, isLoading, isSaving, error, hasChanges, lastSavedAt } =
      useUserPreferencesV2("filters");

    expect(preferences.value).toEqual({});
    expect(isLoading.value).toBe(false);
    expect(isSaving.value).toBe(false);
    expect(error.value).toBeNull();
    expect(hasChanges.value).toBe(false);
    expect(lastSavedAt.value).toBeNull();
  });

  // ── loadPreferences ────────────────────────────────────────────

  describe("loadPreferences", () => {
    it("fetches from the correct category endpoint", async () => {
      mockFetchAuth.mockResolvedValue({ data: { theme: "dark" } });
      const { loadPreferences } = useUserPreferencesV2("display");

      await loadPreferences();

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/display",
        { method: "GET" },
      );
    });

    it("populates preferences from server response", async () => {
      mockFetchAuth.mockResolvedValue({
        data: { activeFilters: ["d1"], sortBy: "name" },
      });
      const { loadPreferences, preferences, hasChanges } =
        useUserPreferencesV2("filters");

      await loadPreferences();

      expect(preferences.value).toEqual({
        activeFilters: ["d1"],
        sortBy: "name",
      });
      expect(hasChanges.value).toBe(false);
    });

    it("sets loading true during fetch, false after", async () => {
      let resolve: (v: unknown) => void;
      mockFetchAuth.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      const { loadPreferences, isLoading } = useUserPreferencesV2("session");

      const promise = loadPreferences();
      expect(isLoading.value).toBe(true);

      resolve!({ data: {} });
      await promise;
      expect(isLoading.value).toBe(false);
    });

    it("keeps preferences empty when response has no data", async () => {
      mockFetchAuth.mockResolvedValue({ exists: false });
      const { loadPreferences, preferences } =
        useUserPreferencesV2("filters");

      await loadPreferences();

      expect(preferences.value).toEqual({});
    });

    it("falls back to localStorage on fetch error", async () => {
      localStorageMock["user_prefs_filters"] = JSON.stringify({
        cached: true,
      });
      mockFetchAuth.mockRejectedValue(new Error("Network error"));
      const { loadPreferences, preferences, error } =
        useUserPreferencesV2("filters");

      await loadPreferences();

      expect(preferences.value).toEqual({ cached: true });
      expect(error.value).toBe("Network error");
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("handles corrupt localStorage gracefully on fallback", async () => {
      localStorageMock["user_prefs_display"] = "not-json{{{";
      mockFetchAuth.mockRejectedValue(new Error("offline"));
      const { loadPreferences, preferences } =
        useUserPreferencesV2("display");

      await loadPreferences();

      expect(preferences.value).toEqual({});
    });

    it("sets generic error message for non-Error throws", async () => {
      mockFetchAuth.mockRejectedValue("string-error");
      const { loadPreferences, error } = useUserPreferencesV2("session");

      await loadPreferences();

      expect(error.value).toBe("Failed to load preferences");
    });

    it("clears previous error on new load", async () => {
      mockFetchAuth.mockRejectedValueOnce(new Error("fail"));
      const { loadPreferences, error } = useUserPreferencesV2("session");

      await loadPreferences();
      expect(error.value).toBe("fail");

      mockFetchAuth.mockResolvedValueOnce({ data: {} });
      await loadPreferences();
      expect(error.value).toBeNull();
    });

    it("sets loading false even on error", async () => {
      mockFetchAuth.mockRejectedValue(new Error("fail"));
      const { loadPreferences, isLoading } = useUserPreferencesV2("filters");

      await loadPreferences();

      expect(isLoading.value).toBe(false);
    });
  });

  // ── savePreferences ────────────────────────────────────────────

  describe("savePreferences", () => {
    it("posts preferences to the correct endpoint", async () => {
      mockFetchAuth.mockResolvedValue({ ok: true });
      const { savePreferences, updatePreference } =
        useUserPreferencesV2("filters");

      updatePreference("sortBy", "date");
      await savePreferences();

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/filters",
        { method: "POST", body: { data: { sortBy: "date" } } },
      );
    });

    it("updates lastSavedAt and clears isDirty on success", async () => {
      mockFetchAuth.mockResolvedValue({ ok: true });
      const { savePreferences, updatePreference, hasChanges, lastSavedAt } =
        useUserPreferencesV2("display");

      updatePreference("theme", "dark");
      expect(hasChanges.value).toBe(true);

      await savePreferences();

      expect(hasChanges.value).toBe(false);
      expect(lastSavedAt.value).toBeInstanceOf(Date);
    });

    it("caches to localStorage on success", async () => {
      mockFetchAuth.mockResolvedValue({ ok: true });
      const { savePreferences, updatePreference } =
        useUserPreferencesV2("session");

      updatePreference("timeout", 30);
      await savePreferences();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "user_prefs_session",
        JSON.stringify({ timeout: 30 }),
      );
    });

    it("sets saving true during save, false after", async () => {
      let resolve: (v: unknown) => void;
      mockFetchAuth.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      const { savePreferences, isSaving } = useUserPreferencesV2("filters");

      const promise = savePreferences();
      expect(isSaving.value).toBe(true);

      resolve!({ ok: true });
      await promise;
      expect(isSaving.value).toBe(false);
    });

    it("throws and sets error on failure, still caches to localStorage", async () => {
      const saveError = new Error("Server 500");
      mockFetchAuth.mockRejectedValue(saveError);
      const { savePreferences, updatePreference, error } =
        useUserPreferencesV2("filters");

      updatePreference("x", 1);
      await expect(savePreferences()).rejects.toThrow("Server 500");

      expect(error.value).toBe("Server 500");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "user_prefs_filters",
        JSON.stringify({ x: 1 }),
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("sets saving false even on error", async () => {
      mockFetchAuth.mockRejectedValue(new Error("fail"));
      const { savePreferences, isSaving } = useUserPreferencesV2("filters");

      await savePreferences().catch(() => {});

      expect(isSaving.value).toBe(false);
    });

    it("sets generic error message for non-Error throws", async () => {
      mockFetchAuth.mockRejectedValue(42);
      const { savePreferences, error } = useUserPreferencesV2("display");

      await savePreferences().catch(() => {});

      expect(error.value).toBe("Failed to save preferences");
    });

    it("returns the server response on success", async () => {
      const serverResponse = { id: "pref-123", updated: true };
      mockFetchAuth.mockResolvedValue(serverResponse);
      const { savePreferences } = useUserPreferencesV2("filters");

      const result = await savePreferences();

      expect(result).toEqual(serverResponse);
    });
  });

  // ── deletePreferences ──────────────────────────────────────────

  describe("deletePreferences", () => {
    it("sends DELETE to the correct endpoint", async () => {
      mockFetchAuth.mockResolvedValue(undefined);
      const { deletePreferences } = useUserPreferencesV2("display");

      await deletePreferences();

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/display",
        { method: "DELETE" },
      );
    });

    it("clears preferences and isDirty on success", async () => {
      mockFetchAuth.mockResolvedValue(undefined);
      const { deletePreferences, updatePreference, preferences, hasChanges } =
        useUserPreferencesV2("filters");

      updatePreference("sortBy", "name");
      expect(hasChanges.value).toBe(true);

      await deletePreferences();

      expect(preferences.value).toEqual({});
      expect(hasChanges.value).toBe(false);
    });

    it("removes localStorage entry on success", async () => {
      mockFetchAuth.mockResolvedValue(undefined);
      const { deletePreferences } = useUserPreferencesV2("session");

      await deletePreferences();

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "user_prefs_session",
      );
    });

    it("throws and sets error on failure", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Forbidden"));
      const { deletePreferences, error } = useUserPreferencesV2("filters");

      await expect(deletePreferences()).rejects.toThrow("Forbidden");

      expect(error.value).toBe("Forbidden");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("sets saving false even on error", async () => {
      mockFetchAuth.mockRejectedValue(new Error("fail"));
      const { deletePreferences, isSaving } =
        useUserPreferencesV2("display");

      await deletePreferences().catch(() => {});

      expect(isSaving.value).toBe(false);
    });

    it("sets generic error for non-Error throws", async () => {
      mockFetchAuth.mockRejectedValue(null);
      const { deletePreferences, error } = useUserPreferencesV2("session");

      await deletePreferences().catch(() => {});

      expect(error.value).toBe("Failed to delete preferences");
    });
  });

  // ── updatePreference ───────────────────────────────────────────

  describe("updatePreference", () => {
    it("sets a single key and marks dirty", () => {
      const { updatePreference, preferences, hasChanges } =
        useUserPreferencesV2("display");

      updatePreference("theme", "dark");

      expect(preferences.value).toEqual({ theme: "dark" });
      expect(hasChanges.value).toBe(true);
    });

    it("overwrites an existing key", () => {
      const { updatePreference, preferences } =
        useUserPreferencesV2("filters");

      updatePreference("sortBy", "name");
      updatePreference("sortBy", "date");

      expect(preferences.value.sortBy).toBe("date");
    });
  });

  // ── updatePreferences (bulk) ───────────────────────────────────

  describe("updatePreferences", () => {
    it("merges multiple keys and marks dirty", () => {
      const { updatePreferences, preferences, hasChanges } =
        useUserPreferencesV2("filters");

      updatePreferences({ a: 1, b: 2 });

      expect(preferences.value).toEqual({ a: 1, b: 2 });
      expect(hasChanges.value).toBe(true);
    });

    it("preserves existing keys not in the update", () => {
      const { updatePreference, updatePreferences, preferences } =
        useUserPreferencesV2("display");

      updatePreference("existing", "keep");
      updatePreferences({ newKey: "added" });

      expect(preferences.value).toEqual({ existing: "keep", newKey: "added" });
    });
  });

  // ── clear ──────────────────────────────────────────────────────

  describe("clear", () => {
    it("empties preferences, marks dirty, clears error", () => {
      const { updatePreference, clear, preferences, hasChanges, error } =
        useUserPreferencesV2("session");

      updatePreference("x", 1);

      clear();

      expect(preferences.value).toEqual({});
      expect(hasChanges.value).toBe(true);
    });

    it("clears a previous error", async () => {
      mockFetchAuth.mockRejectedValue(new Error("load fail"));
      const { loadPreferences, clear, error } =
        useUserPreferencesV2("filters");

      await loadPreferences();
      expect(error.value).toBe("load fail");

      clear();
      expect(error.value).toBeNull();
    });
  });

  // ── Category isolation ─────────────────────────────────────────

  describe("category isolation", () => {
    it("uses the provided category in all API calls", async () => {
      mockFetchAuth.mockResolvedValue({ data: {} });
      const custom = useUserPreferencesV2("my-custom-category");

      await custom.loadPreferences();
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/my-custom-category",
        { method: "GET" },
      );

      mockFetchAuth.mockResolvedValue({ ok: true });
      await custom.savePreferences();
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/preferences/my-custom-category",
        { method: "POST", body: { data: {} } },
      );
    });
  });
});
