import { ref } from "vue";
import type { FeedbackInput } from "~/utils/validation/schemas";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("feedback");

export const useFeedback = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const submitFeedback = async (form: FeedbackInput) => {
    loading.value = true;
    error.value = null;
    try {
      return await $fetch("/api/feedback", {
        method: "POST",
        body: form,
      });
    } catch (err: unknown) {
      logger.error("Failed to submit feedback", err);
      const apiError = err as { data?: { message?: string } };
      error.value =
        apiError.data?.message ?? "Failed to send feedback. Please try again.";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, submitFeedback };
};
