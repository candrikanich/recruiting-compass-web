<!-- components/profile/public/TargetProgramValues.vue -->
<script setup lang="ts">
import SectionHeader from "~/components/profile/public/SectionHeader.vue";

defineProps<{
  lookingFor: string | null;
  valuesTags: string[];
}>();
</script>

<template>
  <section v-if="lookingFor || valuesTags.length">
    <SectionHeader
      icon="i-heroicons-viewfinder-circle"
      title="Target Program & Values"
    />
    <DesignSystemCard padding="md">
      <p v-if="lookingFor" class="text-sm leading-relaxed text-brand-slate-700">
        {{ lookingFor }}
      </p>
      <div
        v-if="valuesTags.length"
        class="mt-3 flex flex-wrap gap-1.5"
        :class="{ 'mt-0': !lookingFor }"
      >
        <DesignSystemBadge
          v-for="tag in valuesTags"
          :key="tag"
          color="purple"
          variant="light"
        >
          {{ tag }}
        </DesignSystemBadge>
      </div>
    </DesignSystemCard>
  </section>
</template>
