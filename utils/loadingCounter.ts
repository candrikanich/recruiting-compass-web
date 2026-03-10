import { ref, computed } from "vue";

export const useLoadingCounter = () => {
  const count = ref(0);
  const loading = computed(() => count.value > 0);
  const startLoading = () => count.value++;
  const stopLoading = () => {
    if (count.value > 0) count.value--;
  };
  return { loading, startLoading, stopLoading };
};
