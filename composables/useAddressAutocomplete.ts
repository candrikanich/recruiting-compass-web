import { ref } from "vue";
import { debounce } from "~/utils/debounce";
import type { HomeLocation } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("address-autocomplete");

export interface AddressSuggestion {
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
}

export const useAddressAutocomplete = () => {
  const suggestions = ref<AddressSuggestion[]>([]);
  const loading = ref(false);

  const _doSearch = async (q: string) => {
    if (!q || q.trim().length < 3) {
      suggestions.value = [];
      return;
    }
    loading.value = true;
    try {
      suggestions.value = await $fetch<AddressSuggestion[]>(
        `/api/address/autocomplete?q=${encodeURIComponent(q.trim())}`,
      );
    } catch (err) {
      logger.warn("Address autocomplete search failed", err);
      suggestions.value = [];
    } finally {
      loading.value = false;
    }
  };

  const search = debounce(_doSearch, 300);

  const selectSuggestion = (s: AddressSuggestion): HomeLocation => ({
    address: s.address,
    city: s.city,
    state: s.state,
    zip: s.zip,
    latitude: s.latitude,
    longitude: s.longitude,
  });

  const clearSuggestions = () => {
    suggestions.value = [];
  };

  return { suggestions, loading, search, selectSuggestion, clearSuggestions };
};
