import { ref } from "vue";

/**
 * Composable for managing loading and validation states
 * Provides reactive refs and setter functions for common loading states
 */
export const useLoadingStates = () => {
  const loading = ref(false);
  const validating = ref(false);

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  const setValidating = (value: boolean) => {
    validating.value = value;
  };

  return {
    loading,
    validating,
    setLoading,
    setValidating,
  };
};
