import { ref, computed } from "vue";

export const useLoadingCounter = () => {
  const count = ref(0);
  const loading = computed(() => count.value > 0);

  const increment = () => { count.value++; };
  const decrement = () => { count.value = Math.max(0, count.value - 1); };

  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    increment();
    try {
      return await fn();
    } finally {
      decrement();
    }
  };

  return { loading, increment, decrement, wrap };
};
