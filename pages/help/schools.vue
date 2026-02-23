<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Schools & Coaches</h1>
    <p class="mb-8 text-gray-500">Last reviewed: February 2026</p>

    <!-- Adding a school -->
    <section class="mb-10">
      <HelpSectionHeader title="Adding a school to your list" />
      <p class="mb-4 text-sm text-gray-600">
        Your school list is the core of your recruiting compass. Add every school you're considering,
        even ones you're unsure about — fit scores will help you prioritize.
      </p>
      <HelpStepCard :step="1" title="Go to Search">
        Navigate to <NuxtLink to="/search" class="font-medium text-primary-600 hover:underline">Search</NuxtLink>
        and use the filters to find schools by division, sport, state, or enrollment size.
      </HelpStepCard>
      <HelpStepCard :step="2" title="View the school profile">
        Click any school to see its full profile — academic info, athletic program details, and location.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Add to your list" :last="true">
        Tap <strong>Add to list</strong>. The school now appears on your
        <NuxtLink to="/schools" class="font-medium text-primary-600 hover:underline">Schools</NuxtLink>
        page with an initial fit score.
      </HelpStepCard>
    </section>

    <!-- Fit score -->
    <section class="mb-10">
      <HelpSectionHeader title="What is a fit score?" />
      <p class="mb-4 text-sm text-gray-600">
        A fit score is a 0–100 rating that reflects how well a school matches your athlete profile.
        Higher scores indicate a stronger overall fit.
      </p>
      <HelpImageSlot caption="Fit score breakdown showing academic, athletic, and location dimensions." />
      <p class="mt-4 text-sm text-gray-600">Fit scores are calculated from four dimensions:</p>
      <ul class="mt-3 space-y-2 text-sm text-gray-700">
        <li><strong>Academic fit</strong> — your GPA and test scores vs. the school's average admit profile</li>
        <li><strong>Athletic fit</strong> — your sport and level vs. the school's program division and roster needs</li>
        <li><strong>Size fit</strong> — enrollment size preference match</li>
        <li><strong>Location fit</strong> — proximity to home and region preference</li>
      </ul>
      <HelpCallout type="info">
        Fit scores update automatically when you update your athlete profile. Keep your profile
        current for the most accurate scores.
      </HelpCallout>
    </section>

    <!-- Managing your list -->
    <section class="mb-10">
      <HelpSectionHeader title="Managing your school list" badge="required" />
      <p class="mb-4 text-sm text-gray-600">
        Your school list drives everything else in the app — phases, interactions, and recommendation
        letters are all tied to specific schools.
      </p>
      <ul class="space-y-2 text-sm text-gray-700">
        <li><strong>Sort</strong> — by fit score, recent activity, or date added</li>
        <li><strong>Filter</strong> — by division, state, or interaction status</li>
        <li><strong>Remove</strong> — tap the school and select <strong>Remove from list</strong>. This also removes associated interactions.</li>
      </ul>
      <HelpCallout type="warning">
        Removing a school permanently deletes all coach interactions and notes tied to that school.
        Archive instead of removing if you want to keep the history.
      </HelpCallout>
    </section>

    <!-- Logging an interaction -->
    <section class="mb-10">
      <HelpSectionHeader title="Logging a coach interaction" />
      <p class="mb-4 text-sm text-gray-600">
        Every time you communicate with a coach — email, call, campus visit — log it as an interaction.
        This creates a timeline of your recruiting relationship with each school.
      </p>
      <HelpStepCard :step="1" title="Open a school">
        Go to your <NuxtLink to="/schools" class="font-medium text-primary-600 hover:underline">Schools</NuxtLink>
        page and tap the school you interacted with.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Select a coach">
        Tap a coach on the school's page, or tap <strong>Add coach</strong> if they're not listed yet.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Log the interaction" :last="true">
        Tap <strong>Log interaction</strong>, choose the type, set the date, and add any notes.
        Tap <strong>Save</strong>.
      </HelpStepCard>
    </section>

    <!-- Interaction types -->
    <section class="mb-10">
      <HelpSectionHeader title="Interaction types" />
      <p class="mb-4 text-sm text-gray-600">
        Choose the type that best describes how contact was made.
      </p>
      <div class="space-y-3 text-sm">
        <div class="flex gap-3">
          <UIcon name="i-heroicons-envelope" class="mt-0.5 size-4 shrink-0 text-gray-400" />
          <div><strong>Email</strong> — written correspondence with a coach</div>
        </div>
        <div class="flex gap-3">
          <UIcon name="i-heroicons-phone" class="mt-0.5 size-4 shrink-0 text-gray-400" />
          <div><strong>Phone call</strong> — direct conversation by phone</div>
        </div>
        <div class="flex gap-3">
          <UIcon name="i-heroicons-building-office" class="mt-0.5 size-4 shrink-0 text-gray-400" />
          <div><strong>Campus visit</strong> — official or unofficial campus visit</div>
        </div>
        <div class="flex gap-3">
          <UIcon name="i-heroicons-chat-bubble-left" class="mt-0.5 size-4 shrink-0 text-gray-400" />
          <div><strong>Social media</strong> — DMs, follows, or replies on social platforms</div>
        </div>
        <div class="flex gap-3">
          <UIcon name="i-heroicons-document" class="mt-0.5 size-4 shrink-0 text-gray-400" />
          <div><strong>Other</strong> — anything that doesn't fit the above</div>
        </div>
      </div>
      <HelpCallout type="tip">
        Log interactions on the same day they happen. Notes are easier to write while the details are fresh.
      </HelpCallout>
    </section>

    <HelpFeedback />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'help',
})
</script>
