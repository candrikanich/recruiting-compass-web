<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Phases & Letters</h1>
    <p class="mb-8 text-gray-500">Last reviewed: February 2026</p>

    <!-- Phase overview -->
    <section class="mb-10">
      <HelpSectionHeader title="Overview of recruiting phases" />
      <p class="mb-4 text-sm text-gray-600">
        The recruiting process is organized into four phases that map to your high school career.
        Each phase unlocks specific features and actions in the app.
      </p>
      <HelpImageSlot caption="The four recruiting phases: Freshman, Sophomore, Junior, and Senior." />
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
            The awareness phase. Focus on building your athlete profile, exploring what divisions and
            programs exist, and adding initial schools to your list. NCAA contact rules are restrictive
            at this stage — coaches generally can't reach out to you yet.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Sophomore</span>
          </div>
          <p class="text-sm text-gray-600">
            The research phase. Refine your school list, attend camps and showcases to get exposure,
            and begin logging early interactions. Start identifying target coaches at schools you're
            serious about.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Junior</span>
            <HelpBadge type="required" />
          </div>
          <p class="text-sm text-gray-600">
            The active phase. This is when most serious recruiting communication happens. Coaches
            can now initiate contact. Log every interaction, request recommendation letters, and begin
            scheduling official campus visits. NCAA signing periods begin in your junior year for some sports.
          </p>
        </div>

        <div class="rounded-xl border border-gray-200 p-5">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-lg font-bold text-gray-900">Senior</span>
            <HelpBadge type="required" />
          </div>
          <p class="text-sm text-gray-600">
            The decision phase. Narrow your list to schools that have extended offers or strong interest.
            Finalize rec letters, make official visits, and track deadlines. National Signing Day typically
            falls in your senior year.
          </p>
        </div>
      </div>
    </section>

    <!-- How to advance -->
    <section class="mb-10">
      <HelpSectionHeader title="How to advance your phase" />
      <p class="mb-4 text-sm text-gray-600">
        Phase advancement is a confirmed action — both you and a coach or family member must confirm
        the transition.
      </p>
      <HelpStepCard :step="1" title="Open Phase settings">
        Go to <strong>Settings → Recruiting Phase</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Request advancement">
        Tap <strong>Advance to [next phase]</strong>. A confirmation request is sent to your family unit.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Family confirms" :last="true">
        A family member confirms the advancement in their notification feed. Once confirmed, your phase
        updates and new features unlock.
      </HelpStepCard>
      <HelpCallout type="warning">
        Phase advancement cannot be reversed. Make sure you're ready before requesting the change.
      </HelpCallout>
    </section>

    <!-- Requesting a rec letter -->
    <section class="mb-10">
      <HelpSectionHeader title="Requesting a recommendation letter" />
      <p class="mb-4 text-sm text-gray-600">
        Recommendation letters from coaches, teachers, or counselors strengthen your recruiting profile.
        Track all your requests in one place.
      </p>
      <HelpStepCard :step="1" title="Go to Documents">
        Navigate to <NuxtLink to="/documents" class="font-medium text-primary-600 hover:underline">Documents</NuxtLink>
        and select the <strong>Recommendation Letters</strong> tab.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Add a new request">
        Tap <strong>Request letter</strong> and enter the recommender's name, relationship, and the
        school or program the letter is for.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Set a deadline" :last="true">
        Add the submission deadline so you receive a reminder before it's due.
      </HelpStepCard>
      <HelpCallout type="tip">
        Ask for recommendation letters at least 4–6 weeks before the deadline. Give your recommenders
        plenty of context about the school and what makes you a strong candidate.
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
          <span class="w-24 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-center text-xs font-medium text-amber-700">Requested</span>
          <span class="text-gray-600">You've submitted the request. Waiting for the recommender to confirm.</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-center text-xs font-medium text-blue-700">In progress</span>
          <span class="text-gray-600">The recommender has confirmed they'll write it.</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="w-24 shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-center text-xs font-medium text-green-700">Received</span>
          <span class="text-gray-600">The letter has been submitted to the school or delivered to you.</span>
        </div>
      </div>
    </section>

    <HelpFeedback />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'help',
})
</script>
