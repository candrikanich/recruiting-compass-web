import { ref, computed, onBeforeUnmount } from "vue";

/**
 * Composable for managing resend cooldown timers
 *
 * Provides countdown timer for rate-limited actions like:
 * - Email resend
 * - OTP resend
 * - Password reset link resend
 *
 * Features:
 * - Configurable cooldown duration
 * - Screen reader announcements for accessibility
 * - Auto-cleanup on countdown completion
 *
 * @param durationSeconds - Cooldown duration in seconds (default: 60)
 *
 * @example
 * const { cooldown, isActive, startCooldown, announce } = useResendCooldown(60)
 * await sendEmail()
 * startCooldown()
 *
 * @returns Object with cooldown state and control methods
 */
export const useResendCooldown = (durationSeconds = 60) => {
  const cooldown = ref(0);
  const announcementRef = ref<HTMLElement | null>(null);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const isActive = computed(() => cooldown.value > 0);

  /**
   * Make screen reader announcement
   * Updates the announcement element for accessibility
   */
  const announce = (message: string) => {
    if (announcementRef.value) {
      announcementRef.value.textContent = message;
    }
  };

  /**
   * Start the cooldown timer
   * Begins countdown from configured duration
   * Announces when timer completes
   */
  const startCooldown = () => {
    // Clear existing interval if any
    if (intervalId) {
      clearInterval(intervalId);
    }

    cooldown.value = durationSeconds;

    intervalId = setInterval(() => {
      cooldown.value--;

      if (cooldown.value <= 0) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        announce("Resend button is available again.");
      }
    }, 1000);
  };

  /**
   * Stop the cooldown timer early
   * Useful for cleanup or cancellation
   */
  const stopCooldown = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    cooldown.value = 0;
  };

  /**
   * Computed label for resend button
   * Returns appropriate text based on cooldown state
   */
  // Auto-cleanup when component unmounts
  onBeforeUnmount(() => {
    stopCooldown();
  });

  const buttonLabel = computed(() => {
    if (isActive.value) {
      return `Resend in ${cooldown.value}s`;
    }
    return "Resend";
  });

  return {
    cooldown,
    isActive,
    announcementRef,
    buttonLabel,
    startCooldown,
    stopCooldown,
    announce,
  };
};
