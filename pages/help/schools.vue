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
        page with fit signals based on your profile.
      </HelpStepCard>
    </section>

    <!-- Fit signals -->
    <section class="mb-10">
      <HelpSectionHeader title="School Fit Signals" />
      <p class="mb-4 text-sm text-gray-600">
        Each school shows two independent fit signals — honest indicators based on what we actually know
        about you and the school.
      </p>
      <ul class="mt-3 space-y-3 text-sm text-gray-700">
        <li>
          <strong>Personal Fit</strong> — compares your preferences (home state, campus size, cost
          sensitivity) against the school's profile. These are factors only you can weigh.
        </li>
        <li>
          <strong>Academic Fit</strong> — compares your SAT or ACT scores against that school's
          25th–75th percentile range from the US College Scorecard. An in-range or above-range score
          means you have a realistic academic profile for admission.
        </li>
      </ul>
      <HelpCallout type="info">
        We do not show Athletic Fit or Opportunity Fit. We cannot reliably know what a coach is looking
        for or what roster spots are available — that information can only come from direct conversations
        with coaches.
      </HelpCallout>
      <HelpCallout type="tip">
        Fit signals update automatically when you update your profile. Keep your test scores and
        preferences current for the most accurate signals.
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
        <li><strong>Sort</strong> — by recent activity or date added</li>
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
