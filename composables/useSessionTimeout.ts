import { ref, onMounted, onBeforeUnmount } from "vue";
import type { SessionPreferences } from "~/types/session";
import { DEFAULT_TIMEOUT_CONFIG } from "~/types/session";

export const useSessionTimeout = () => {
  const isWarningVisible = ref(false);
  const secondsUntilLogout = ref(0);

  let checkInterval: ReturnType<typeof setInterval> | null = null;
  let warningInterval: ReturnType<typeof setInterval> | null = null;
  let isLoggingOut = false;
  let _lastActivityTime = Date.now();
  let activityThrottleTimeout: ReturnType<typeof setTimeout> | null = null;
  let boundActivityHandler: (() => void) | null = null;

  const getSessionPreferences = (): SessionPreferences | null => {
    try {
      const stored = localStorage.getItem("session_preferences");
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Validate structure
      if (
        typeof parsed.rememberMe !== "boolean" ||
        typeof parsed.lastActivity !== "number" ||
        typeof parsed.expiresAt !== "number"
      ) {
        localStorage.removeItem("session_preferences");
        return null;
      }

      return parsed as SessionPreferences;
    } catch {
      localStorage.removeItem("session_preferences");
      return null;
    }
  };

  const updateActivity = () => {
    try {
      const prefs = getSessionPreferences();
      if (!prefs) return;

      prefs.lastActivity = Date.now();
      localStorage.setItem("session_preferences", JSON.stringify(prefs));
      _lastActivityTime = Date.now();
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  const handleActivity = () => {
    // Throttle activity updates to 30 seconds
    if (activityThrottleTimeout) return;

    updateActivity();

    activityThrottleTimeout = setTimeout(() => {
      activityThrottleTimeout = null;
    }, DEFAULT_TIMEOUT_CONFIG.activityThrottleMs);
  };

  const showWarning = (secondsRemaining: number) => {
    isWarningVisible.value = true;
    secondsUntilLogout.value = secondsRemaining;

    // Start countdown timer
    if (warningInterval) clearInterval(warningInterval);

    warningInterval = setInterval(() => {
      secondsUntilLogout.value = Math.max(0, secondsUntilLogout.value - 1);

      if (secondsUntilLogout.value <= 0) {
        clearInterval(warningInterval as ReturnType<typeof setInterval>);
        warningInterval = null;
        if (isLoggingOut) return;
        isLoggingOut = true;
        handleTimeout();
      }
    }, 1000);
  };

  const dismissWarning = () => {
    isWarningVisible.value = false;

    if (warningInterval) {
      clearInterval(warningInterval);
      warningInterval = null;
    }

    updateActivity();
  };

  const handleTimeout = async () => {
    isWarningVisible.value = false;

    if (warningInterval) {
      clearInterval(warningInterval);
      warningInterval = null;
    }

    localStorage.removeItem("session_preferences");

    const { useUserStore } = await import("~/stores/user");
    const userStore = useUserStore();
    await userStore.logout();

    if (typeof window !== "undefined") {
      await navigateTo("/login?reason=timeout");
    }
  };

  const checkTimeout = () => {
    const prefs = getSessionPreferences();

    if (!prefs) {
      if (checkInterval) clearInterval(checkInterval);
      return;
    }

    // Only track timeout if rememberMe is true
    if (!prefs.rememberMe) return;

    const now = Date.now();
    const timeSinceActivity = now - prefs.lastActivity;
    const timeUntilTimeout =
      DEFAULT_TIMEOUT_CONFIG.inactivityThresholdMs - timeSinceActivity;
    const warningWindow = DEFAULT_TIMEOUT_CONFIG.warningBeforeLogoutMs;

    // Session expired — log the user out
    if (timeUntilTimeout <= 0) {
      if (isLoggingOut) return;
      isLoggingOut = true;
      handleTimeout();
      return;
    }

    // Within warning window (5 minutes before timeout)
    if (timeUntilTimeout <= warningWindow && !isWarningVisible.value) {
      const secondsRemaining = Math.ceil(timeUntilTimeout / 1000);
      showWarning(secondsRemaining);
    }

    // Past warning window and warning was shown, but user didn't act
    if (timeUntilTimeout > warningWindow && isWarningVisible.value) {
      isWarningVisible.value = false;
      if (warningInterval) {
        clearInterval(warningInterval);
        warningInterval = null;
      }
    }
  };

  const initializeTracking = () => {
    const prefs = getSessionPreferences();

    if (!prefs || !prefs.rememberMe) return;

    // Add activity event listeners
    boundActivityHandler = () => {
      handleActivity();
    };

    DEFAULT_TIMEOUT_CONFIG.activityEvents.forEach((event) => {
      document.addEventListener(event, boundActivityHandler!, true);
    });

    // Start checking for timeout every 30 seconds
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(() => {
      checkTimeout();
    }, 30000);

    // Initial check
    checkTimeout();
  };

  const cleanup = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }

    if (warningInterval) {
      clearInterval(warningInterval);
      warningInterval = null;
    }

    if (activityThrottleTimeout) {
      clearTimeout(activityThrottleTimeout);
      activityThrottleTimeout = null;
    }

    // Remove event listeners
    if (boundActivityHandler) {
      DEFAULT_TIMEOUT_CONFIG.activityEvents.forEach((event) => {
        document.removeEventListener(event, boundActivityHandler!, true);
      });
      boundActivityHandler = null;
    }
  };

  onMounted(() => {
    if (typeof window !== "undefined") {
      initializeTracking();
    }
  });

  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    isWarningVisible,
    secondsUntilLogout,
    handleActivity,
    handleTimeout,
    checkTimeout,
    dismissWarning,
    initializeTracking,
    cleanup,
  };
};
