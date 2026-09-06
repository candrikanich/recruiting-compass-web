<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Glossary</h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <p class="mb-4 text-sm text-gray-600">
      Recruiting terms explained in plain language.
    </p>
    <HelpGlossaryList :terms="glossaryTerms" />

    <HelpFeedback />
  </div>
</template>

<script setup lang="ts">
import { glossaryTerms } from "~/components/Help/glossaryTerms";

definePageMeta({
  layout: "help",
});
</script>
