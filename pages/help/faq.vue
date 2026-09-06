<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">
      Frequently Asked Questions
    </h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <p class="mb-4 text-sm text-gray-600">
      Quick answers to the questions we hear most.
    </p>
    <HelpFaqAccordion :entries="faqEntries" />

    <HelpFeedback />
  </div>
</template>

<script setup lang="ts">
import { faqEntries } from "~/components/Help/faqEntries";

definePageMeta({
  layout: "help",
});
</script>
