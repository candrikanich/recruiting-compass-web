<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Phases & Letters</h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <!-- Phase overview -->
    <section class="mb-10">
      <HelpSectionHeader title="Overview of recruiting phases" />
      <p class="mb-4 text-sm text-gray-600">
        The recruiting process is organized into five phases that map to your
        high school career, ending in Committed once you've made your decision.
        Each phase unlocks specific features and actions in the app.
      </p>
      <HelpImageSlot
        caption="The five recruiting phases: Freshman, Sophomore, Junior, Senior, and Committed."
      />
    </section>

    <!-- What each phase means -->
    <section class="mb-10">
      <HelpSectionHeader title="What each phase means" />

      <div class="space-y-6">
        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Freshman</span>
            <HelpBadge type="optional" />
          </div>
          <p class="text-sm text-gray-600">
            The awareness phase. Focus on building your athlete profile,
            exploring what divisions and programs exist, and adding initial
            schools to your list. NCAA contact rules are restrictive at this
            stage — coaches generally can't reach out to you yet.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Sophomore</span>
          </div>
          <p class="text-sm text-gray-600">
            The research phase. Refine your school list, attend camps and
            showcases to get exposure, and begin logging early interactions.
            Start identifying target coaches at schools you're serious about.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Junior</span>
            <HelpBadge type="required" />
          </div>
          <p class="text-sm text-gray-600">
            The active phase. This is when most serious recruiting communication
            happens. Coaches can now initiate contact. Log every interaction,
            request recommendation letters, and begin scheduling official campus
            visits. NCAA signing periods begin in your junior year for some
            sports.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Senior</span>
            <HelpBadge type="required" />
          </div>
          <p class="text-sm text-gray-600">
            The decision phase. Narrow your list to schools that have extended
            offers or strong interest. Finalize rec letters, make official
            visits, and track deadlines. National Signing Day typically falls in
            your senior year.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Committed</span>
          </div>
          <p class="text-sm text-gray-600">
            The final phase, reached once you've made your decision. There's no
            further phase to advance to — this is where your recruiting journey
            in the app ends.
          </p>
        </div>
      </div>
    </section>

    <!-- How to advance -->
    <section class="mb-10">
      <HelpSectionHeader title="How to advance your phase" />
      <p class="mb-4 text-sm text-gray-600">
        Phase advancement is your own call — only the athlete can advance a
        phase. Parent/guardian family members can view progress but can't
        trigger or confirm it.
      </p>
      <HelpStepCard :step="1" title="Complete your required tasks" :last="true">
        Open
        <NuxtLink
          to="/timeline"
          class="text-primary-600 font-medium hover:underline"
          >Timeline</NuxtLink
        >
        and finish the milestone tasks required for your current phase.
      </HelpStepCard>
      <HelpCallout type="warning">
        Phase advancement isn't yet automatic in the app — there's currently no
        button that moves you to the next phase, even once every required task
        is complete. If you believe you're ready to move up, check with support.
      </HelpCallout>
    </section>

    <!-- Requesting a rec letter -->
    <section class="mb-10">
      <HelpSectionHeader title="Requesting a recommendation letter" />
      <p class="mb-4 text-sm text-gray-600">
        Recommendation letters from coaches, teachers, or counselors strengthen
        your recruiting profile. Track all your requests in one place.
      </p>
      <HelpStepCard :step="1" title="Go to Recommendations">
        Navigate to
        <NuxtLink
          to="/recommendations"
          class="text-primary-600 font-medium hover:underline"
          >Recommendations</NuxtLink
        >
        in the main nav. This is its own dedicated page, separate from
        Documents.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Add a new request">
        Tap <strong>Request letter</strong> and enter the recommender's name,
        relationship, and the school or program the letter is for.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Set a deadline" :last="true">
        Add the submission deadline so you receive a reminder before it's due.
      </HelpStepCard>
      <HelpCallout type="tip">
        Ask for recommendation letters at least 4–6 weeks before the deadline.
        Give your recommenders plenty of context about the school and what makes
        you a strong candidate.
      </HelpCallout>
    </section>

    <!-- Tracking letter status -->
    <section class="mb-10">
      <HelpSectionHeader title="Tracking letter status" />
      <p class="mb-4 text-sm text-gray-600">
        Each letter request moves through these states:
      </p>
      <div class="space-y-3 text-sm">
        <div class="flex items-center gap-3">
          <span
            class="w-28 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-center text-xs font-medium text-gray-700"
            >Not Requested</span
          >
          <span class="text-gray-600">Default state — nothing sent yet.</span>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="w-28 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-center text-xs font-medium text-blue-700"
            >Requested</span
          >
          <span class="text-gray-600"
            >You've asked the recommender for a letter.</span
          >
        </div>
        <div class="flex items-center gap-3">
          <span
            class="w-28 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-center text-xs font-medium text-green-700"
            >Received</span
          >
          <span class="text-gray-600"
            >The letter has been delivered to you or your recommender.</span
          >
        </div>
        <div class="flex items-center gap-3">
          <span
            class="w-28 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-center text-xs font-medium text-amber-700"
            >Submitted</span
          >
          <span class="text-gray-600"
            >The letter has been sent on to the school.</span
          >
        </div>
      </div>
    </section>

    <HelpFeedback />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "help",
});
</script>
