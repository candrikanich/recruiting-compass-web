import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.stubGlobal("navigateTo", vi.fn());
import { useSessionTimeout } from "~/composables/useSessionTimeout";
import type { SessionPreferences } from "~/types/session";

describe("useSessionTimeout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  const setSessionPreferences = (rememberMe: boolean = true) => {
    const prefs: SessionPreferences = {
      rememberMe,
      lastActivity: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    localStorage.setItem("session_preferences", JSON.stringify(prefs));
  };

  describe("Initialization", () => {
    it("should initialize with warning hidden", () => {
      setSessionPreferences();

      const { isWarningVisible } = useSessionTimeout();

      expect(isWarningVisible.value).toBe(false);
    });

    it("should initialize secondsUntilLogout as 0", () => {
      setSessionPreferences();

      const { secondsUntilLogout } = useSessionTimeout();

      expect(secondsUntilLogout.value).toBe(0);
    });

    it("should not initialize tracking if no session preferences", () => {
      const { initializeTracking } = useSessionTimeout();

      expect(() => {
        initializeTracking();
      }).not.toThrow();
    });
  });

  describe("Activity Tracking", () => {
    it("should add activity event listeners when initialized", () => {
      setSessionPreferences();
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const { initializeTracking } = useSessionTimeout();
      initializeTracking();

      expect(addEventListenerSpy).toHaveBeenCalled();
      // Should add listeners for mouse, keyboard, scroll, touch events
      expect(addEventListenerSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it("should update lastActivity on user activity", () => {
      setSessionPreferences();

      const { initializeTracking, handleActivity } = useSessionTimeout();
      initializeTracking();

      const prefs = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;
      const originalActivity = prefs.lastActivity;

      // Advance time by 30 seconds (throttle period)
      vi.advanceTimersByTime(31000);

      handleActivity();

      const updatedPrefs = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;

      expect(updatedPrefs.lastActivity).toBeGreaterThan(originalActivity);
    });

    it("should throttle activity updates to 30-second intervals", () => {
      setSessionPreferences();

      const { initializeTracking, handleActivity } = useSessionTimeout();
      initializeTracking();

      const prefs1 = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;

      handleActivity();
      const prefs2 = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;

      // First call should update (initial throttle)
      expect(prefs2.lastActivity).toBeGreaterThanOrEqual(prefs1.lastActivity);

      // Advance 10 seconds (less than throttle period)
      vi.advanceTimersByTime(10000);
      handleActivity();

      const prefs3 = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;

      // Should NOT update (throttled)
      expect(prefs3.lastActivity).toBe(prefs2.lastActivity);

      // Advance 25 more seconds (31 total, exceeds throttle)
      vi.advanceTimersByTime(25000);
      handleActivity();

      const prefs4 = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;

      expect(prefs4.lastActivity).toBeGreaterThan(prefs3.lastActivity);
    });

    it("should remove event listeners on cleanup", () => {
      setSessionPreferences();
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const { initializeTracking, cleanup } = useSessionTimeout();
      initializeTracking();
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it("should clear interval timers on cleanup", () => {
      setSessionPreferences();
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { initializeTracking, cleanup } = useSessionTimeout();
      initializeTracking();
      cleanup();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("Session Timeout Checking", () => {
    it("should NOT trigger timeout if rememberMe is false", () => {
      setSessionPreferences(false); // rememberMe = false
      const { checkTimeout, isWarningVisible } = useSessionTimeout();

      // Advance 30+ days
      vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

      checkTimeout();

      // Should not show warning or trigger logout
      expect(isWarningVisible.value).toBe(false);
    });

    it("should show warning when within 5-minute window before timeout", () => {
      setSessionPreferences(true);

      // Set lastActivity to 29 days + 56 minutes ago (4 minutes until timeout)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const prefs: SessionPreferences = {
        rememberMe: true,
        lastActivity: Date.now() - (thirtyDays - 4 * 60 * 1000),
        expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem("session_preferences", JSON.stringify(prefs));

      const { checkTimeout, isWarningVisible, secondsUntilLogout } =
        useSessionTimeout();
      checkTimeout();

      expect(isWarningVisible.value).toBe(true);
      expect(secondsUntilLogout.value).toBeGreaterThan(0);
    });

    it("should trigger logout when session is expired", async () => {
      setSessionPreferences(true);

      // Set lastActivity to 30+ days ago
      const prefs: SessionPreferences = {
        rememberMe: true,
        lastActivity: Date.now() - 31 * 24 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1 * 60 * 1000, // Already expired
      };
      localStorage.setItem("session_preferences", JSON.stringify(prefs));

      const { checkTimeout, handleTimeout } = useSessionTimeout();
      const handleTimeoutSpy = vi.spyOn({ handleTimeout }, "handleTimeout");

      checkTimeout();

      // Should clear preferences and possibly trigger logout
      expect(localStorage.getItem("session_preferences")).toBeNull();
    });

    it("should countdown before logout when warning is visible", () => {
      setSessionPreferences(true);

      // Set lastActivity to 29 days + 56 minutes ago (4 minutes until timeout)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const prefs: SessionPreferences = {
        rememberMe: true,
        lastActivity: Date.now() - (thirtyDays - 4 * 60 * 1000),
        expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem("session_preferences", JSON.stringify(prefs));

      const { checkTimeout, isWarningVisible, secondsUntilLogout } =
        useSessionTimeout();

      checkTimeout();
      const initialSeconds = secondsUntilLogout.value;

      // Advance 1 second
      vi.advanceTimersByTime(1000);
      checkTimeout();

      expect(isWarningVisible.value).toBe(true);
      expect(secondsUntilLogout.value).toBeLessThan(initialSeconds);
    });
  });

  describe("Warning Modal", () => {
    it("should display warning modal with correct countdown", () => {
      setSessionPreferences(true);

      // Set lastActivity to 29 days + 56 minutes ago (4 minutes until timeout)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const prefs: SessionPreferences = {
        rememberMe: true,
        lastActivity: Date.now() - (thirtyDays - 4 * 60 * 1000),
        expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem("session_preferences", JSON.stringify(prefs));

      const { checkTimeout, isWarningVisible, secondsUntilLogout } =
        useSessionTimeout();

      checkTimeout();

      expect(isWarningVisible.value).toBe(true);
      expect(secondsUntilLogout.value).toBeGreaterThan(0);
      expect(secondsUntilLogout.value).toBeLessThanOrEqual(5 * 60); // 5 minutes
    });

    it("should dismiss warning and extend session when dismissWarning is called", () => {
      setSessionPreferences(true);

      // Set lastActivity to 29 days + 56 minutes ago (4 minutes until timeout)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const prefs: SessionPreferences = {
        rememberMe: true,
        lastActivity: Date.now() - (thirtyDays - 4 * 60 * 1000),
        expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem("session_preferences", JSON.stringify(prefs));

      const { checkTimeout, isWarningVisible, dismissWarning } =
        useSessionTimeout();

      checkTimeout();
      expect(isWarningVisible.value).toBe(true);

      dismissWarning();

      expect(isWarningVisible.value).toBe(false);

      // lastActivity should be updated
      const updatedPrefs = JSON.parse(
        localStorage.getItem("session_preferences")!,
      ) as SessionPreferences;
      expect(updatedPrefs.lastActivity).toBeGreaterThan(prefs.lastActivity);
    });
  });

  describe("Session Preferences Validation", () => {
    it("should handle missing session preferences gracefully", () => {
      localStorage.clear();

      const { checkTimeout } = useSessionTimeout();

      expect(() => {
        checkTimeout();
      }).not.toThrow();
    });

    it("should handle corrupted session preferences", () => {
      localStorage.setItem("session_preferences", "invalid json");

      const { checkTimeout } = useSessionTimeout();

      expect(() => {
        checkTimeout();
      }).not.toThrow();

      // Should clear invalid preferences
      expect(localStorage.getItem("session_preferences")).toBeNull();
    });

    it("should handle invalid preference structure", () => {
      localStorage.setItem(
        "session_preferences",
        JSON.stringify({
          invalidField: true,
        }),
      );

      const { checkTimeout } = useSessionTimeout();

      expect(() => {
        checkTimeout();
      }).not.toThrow();
    });
  });
});
