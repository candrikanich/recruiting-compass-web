import { ref, type Ref } from "vue";
import { useAdminAuthHeaders } from "~/composables/useAdminAuthHeaders";

export interface AdminResourceOptions {
  /**
   * Label used for a non-OK response, thrown as `${failLabel}: <status>` and
   * surfaced verbatim in `error`.
   */
  failLabel: string;
  /** Message shown in `error` when a non-Error value is thrown. */
  fallbackMessage: string;
}

export interface UseAdminResourceReturn<T, A extends unknown[]> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  load: (...args: A) => Promise<void>;
}

/**
 * Shared skeleton for admin composables that GET an `/api/admin/*` endpoint
 * with a bearer token and expose `{ data, loading, error }`. Collapses the
 * copy-pasted try/catch/finally block those composables each hand-rolled.
 */
export function useAdminResource<T, A extends unknown[] = []>(
  buildUrl: (...args: A) => string,
  options: AdminResourceOptions,
): UseAdminResourceReturn<T, A> {
  const { getAuthHeaders } = useAdminAuthHeaders();

  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  const load = async (...args: A): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(buildUrl(...args), { headers });
      if (!res.ok) throw new Error(`${options.failLabel}: ${res.status}`);
      data.value = (await res.json()) as T;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : options.fallbackMessage;
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, load };
}
