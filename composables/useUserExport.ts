import { ref, computed } from "vue";
import { createClientLogger } from "~/utils/logger";
import { useAuthFetch } from "./useAuthFetch";

const logger = createClientLogger("useUserExport");

interface ExportState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  downloadUrl: string | null;
  expiresAt: string | null;
  message: string | null;
}

/**
 * Composable for user data export functionality
 *
 * Provides methods to:
 * - Generate data export (GDPR Article 20, CCPA 1798.100)
 * - Handle download
 * - Show status and error messages
 *
 * Usage:
 * ```ts
 * const { initiateExport, isLoading, error, success, downloadUrl } = useUserExport()
 *
 * const handleExport = async () => {
 *   await initiateExport()
 *   if (downloadUrl.value) {
 *     window.location.href = downloadUrl.value
 *   }
 * }
 * ```
 */
export const useUserExport = () => {
  const { $fetchAuth } = useAuthFetch();
  const state = ref<ExportState>({
    isLoading: false,
    error: null,
    success: false,
    downloadUrl: null,
    expiresAt: null,
    message: null,
  });

  const isLoading = computed(() => state.value.isLoading);
  const error = computed(() => state.value.error);
  const success = computed(() => state.value.success);
  const downloadUrl = computed(() => state.value.downloadUrl);
  const expiresAt = computed(() => state.value.expiresAt);
  const message = computed(() => state.value.message);

  /**
   * Initiate data export
   * Generates ZIP file and returns download URL
   */
  const initiateExport = async (): Promise<void> => {
    state.value.isLoading = true;
    state.value.error = null;
    state.value.success = false;

    try {
      const response = await $fetchAuth<{
        success: boolean;
        downloadUrl: string;
        expiresAt: string;
        message: string;
      }>("/api/user/export", { method: "POST" });

      if (response.success) {
        state.value.downloadUrl = response.downloadUrl;
        state.value.expiresAt = response.expiresAt;
        state.value.message = response.message;
        state.value.success = true;
      } else {
        state.value.error = "Failed to generate export";
      }
    } catch (err: unknown) {
      const error = err as {
        data?: { message?: string };
        message?: string;
        status?: number;
      };
      const errorMessage =
        error.data?.message || error.message || "Unknown error";

      // Handle rate limiting specifically
      if (error.status === 429) {
        state.value.error =
          "You can only export your data once per day. Please try again tomorrow.";
      } else {
        state.value.error = errorMessage;
      }

      logger.error("Export failed", { error: errorMessage });
    } finally {
      state.value.isLoading = false;
    }
  };

  /**
   * Download the export file
   * Opens download in new tab/triggers browser download
   */
  const downloadExport = (): void => {
    if (!downloadUrl.value) {
      state.value.error = "No download URL available";
      return;
    }

    try {
      // Create temporary link to trigger download
      const link = document.createElement("a");
      link.href = downloadUrl.value;
      link.setAttribute(
        "download",
        `baseball-recruiting-tracker-export-${new Date().toISOString().split("T")[0]}.zip`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      state.value.error = "Failed to download file";
      logger.error("Download failed", { error: err });
    }
  };

  /**
   * Reset export state (e.g., for new export attempt)
   */
  const reset = (): void => {
    state.value = {
      isLoading: false,
      error: null,
      success: false,
      downloadUrl: null,
      expiresAt: null,
      message: null,
    };
  };

  /**
   * Clear error message
   */
  const clearError = (): void => {
    state.value.error = null;
  };

  return {
    // State
    isLoading,
    error,
    success,
    downloadUrl,
    expiresAt,
    message,

    // Actions
    initiateExport,
    downloadExport,
    reset,
    clearError,
  };
};
