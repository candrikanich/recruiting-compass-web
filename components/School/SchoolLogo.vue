<template>
  <div class="school-logo" :class="sizeClass">
    <!-- Favicon image -->
    <img
      v-if="logoUrl && !imageError"
      :src="logoUrl"
      :alt="`${school.name} logo`"
      class="logo-image"
      :style="{ width: sizePixels, height: sizePixels }"
      @error="handleImageError"
    />

    <!-- Fallback icon when no favicon available -->
    <div
      v-else
      class="logo-fallback"
      :style="{
        fontSize: fallbackFontSize,
        width: sizePixels,
        height: sizePixels,
      }"
    >
      {{ icon }}
    </div>

    <!-- Loading spinner -->
    <div v-if="isLoading" class="logo-loading">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useSchoolLogos } from "~/composables/useSchoolLogos";
import type { School } from "~/types/models";

interface Props {
  school: School;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  fetchOnMount?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  showLabel: false,
  fetchOnMount: true,
});

const {
  fetchSchoolLogo,
  getSchoolLogoCached,
  isLoading: composableLoading,
} = useSchoolLogos();

const logoUrl = ref<string | null>(null);
const imageError = ref(false);
const isFetching = ref(false);

// Size configurations
const sizeConfig = {
  xs: { pixels: "24px", font: "12px" },
  sm: { pixels: "32px", font: "16px" },
  md: { pixels: "48px", font: "24px" },
  lg: { pixels: "64px", font: "32px" },
  xl: { pixels: "96px", font: "48px" },
};

const sizePixels = computed(() => sizeConfig[props.size].pixels);
const fallbackFontSize = computed(() => sizeConfig[props.size].font);
const sizeClass = computed(() => `logo-${props.size}`);

// Determine icon to show
const icon = computed(() => {
  // Try to extract first letter of school name
  if (props.school.name) {
    return props.school.name.charAt(0).toUpperCase();
  }
  return "🏫";
});

const isLoading = computed(() => isFetching.value || composableLoading.value);

const handleImageError = () => {
  imageError.value = true;
  console.warn(
    `Image failed to load for ${props.school.name}: ${logoUrl.value}`,
  );
};

const fetchLogo = async () => {
  // Check if already cached
  const cached = getSchoolLogoCached(props.school.id);
  if (cached !== undefined) {
    logoUrl.value = cached;
    console.log(
      `[SchoolLogo] Using cached logo for ${props.school.name}: ${cached}`,
    );
    return;
  }

  isFetching.value = true;
  try {
    const url = await fetchSchoolLogo(props.school);
    logoUrl.value = url;
    imageError.value = false;
    console.log(`[SchoolLogo] Fetched logo for ${props.school.name}: ${url}`);
  } catch (error) {
    console.warn(
      `[SchoolLogo] Failed to fetch logo for ${props.school.name}:`,
      error,
    );
    logoUrl.value = null;
  } finally {
    isFetching.value = false;
  }
};

onMounted(() => {
  if (props.fetchOnMount) {
    fetchLogo();
  }
});

watch(
  () => props.school.id,
  () => {
    imageError.value = false;
    fetchLogo();
  },
);
</script>

<style scoped>
.school-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 0.25rem;
  overflow: hidden;
  flex-shrink: 0;
  font-weight: 600;
  color: white;
}

/* Purple gradient background only for fallback state */
.school-logo:has(.logo-fallback) {
  background: linear-gradient(
    135deg,
    rgb(168, 85, 247) 0%,
    rgb(147, 51, 234) 100%
  );
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  user-select: none;
}

.logo-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.spinner {
  width: 60%;
  height: 60%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Size variants */
.logo-xs {
  width: 24px;
  height: 24px;
  border-radius: 0.125rem;
}

.logo-sm {
  width: 32px;
  height: 32px;
  border-radius: 0.25rem;
}

.logo-md {
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
}

.logo-lg {
  width: 64px;
  height: 64px;
  border-radius: 0.5rem;
}

.logo-xl {
  width: 96px;
  height: 96px;
  border-radius: 0.75rem;
}
</style>
