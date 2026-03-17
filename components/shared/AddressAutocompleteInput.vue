<script setup lang="ts">
import { ref, watch } from "vue";
import { useAddressAutocomplete, type AddressSuggestion } from "~/composables/useAddressAutocomplete";
import type { HomeLocation } from "~/types/models";

const props = withDefaults(defineProps<{
  modelValue: HomeLocation;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: HomeLocation];
}>();

const { suggestions, loading, search, selectSuggestion, clearSuggestions } = useAddressAutocomplete();

const addressInput = ref(props.modelValue.address ?? "");
const isSelected = ref(false); // true after an autocomplete selection
const showDropdown = ref(false);

watch(() => props.modelValue.address, (v) => {
  addressInput.value = v ?? "";
});

function onAddressInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  addressInput.value = val;
  isSelected.value = false;
  showDropdown.value = true;
  // Emit partial update so parent stays in sync
  emit("update:modelValue", { ...props.modelValue, address: val, latitude: undefined, longitude: undefined });
  search(val);
}

function onSelect(s: AddressSuggestion) {
  const location = selectSuggestion(s);
  addressInput.value = location.address ?? "";
  isSelected.value = true;
  showDropdown.value = false;
  clearSuggestions();
  emit("update:modelValue", location);
}

function clearSelection() {
  isSelected.value = false;
  addressInput.value = "";
  emit("update:modelValue", { address: "", city: "", state: "", zip: "", latitude: undefined, longitude: undefined });
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false; }, 150);
}
</script>

<template>
  <div class="space-y-3">
    <!-- Address line with autocomplete -->
    <div class="relative">
      <label class="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
      <div class="flex gap-2">
        <input
          :value="addressInput"
          type="text"
          class="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
          :disabled="disabled"
          placeholder="Start typing your address..."
          @input="onAddressInput"
          @blur="onBlur"
        />
        <button
          v-if="isSelected"
          type="button"
          class="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl"
          title="Clear and re-enter address"
          @click="clearSelection"
        >
          ✕
        </button>
      </div>

      <!-- Suggestions dropdown -->
      <div
        v-if="showDropdown && suggestions.length > 0"
        class="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
      >
        <button
          v-for="(s, i) in suggestions"
          :key="i"
          type="button"
          class="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm text-slate-800"
          @mousedown.prevent="onSelect(s)"
        >
          {{ s.label }}
        </button>
      </div>

      <p v-if="loading" class="text-xs text-slate-400 mt-1">Looking up address...</p>
    </div>

    <!-- City / State / Zip — readonly after selection -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">City</label>
        <input
          :value="modelValue.city"
          type="text"
          :readonly="isSelected"
          class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          :class="isSelected ? 'bg-slate-100 text-slate-500 cursor-default' : ''"
          placeholder="City"
          :disabled="disabled"
          @input="emit('update:modelValue', { ...modelValue, city: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">State</label>
        <input
          :value="modelValue.state"
          type="text"
          maxlength="2"
          :readonly="isSelected"
          class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
          :class="isSelected ? 'bg-slate-100 text-slate-500 cursor-default' : ''"
          placeholder="IL"
          :disabled="disabled"
          @input="emit('update:modelValue', { ...modelValue, state: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Zip Code</label>
      <input
        :value="modelValue.zip"
        type="text"
        maxlength="10"
        :readonly="isSelected"
        class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
        :class="isSelected ? 'bg-slate-100 text-slate-500 cursor-default' : ''"
        placeholder="62701"
        :disabled="disabled"
        @input="emit('update:modelValue', { ...modelValue, zip: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <!-- Lat/lng confirmation (subtle) -->
    <p v-if="isSelected && modelValue.latitude" class="text-xs text-green-600">
      ✓ Location confirmed ({{ modelValue.latitude?.toFixed(4) }}, {{ modelValue.longitude?.toFixed(4) }})
    </p>
  </div>
</template>
