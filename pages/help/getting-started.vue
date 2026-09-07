<template>
  <div class="prose-gray max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Getting Started</h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <!-- What is The Recruiting Compass -->
    <section class="mb-10">
      <HelpSectionHeader title="What is The Recruiting Compass?" />
      <p class="text-sm leading-relaxed text-gray-700">
        The Recruiting Compass is a recruiting management tool built for student
        athletes and their families. It helps you organize your college search,
        track schools and coaches, manage the phases of the recruiting process,
        and stay on top of every interaction along the way.
      </p>
      <HelpCallout type="tip">
        You're in charge of your recruiting journey. The Recruiting Compass
        keeps everything organized so you can focus on making the right
        connections.
      </HelpCallout>
    </section>

    <!-- Creating your profile -->
    <section class="mb-10">
      <HelpSectionHeader title="Creating your profile" />
      <p class="mb-4 text-sm text-gray-600">
        Your athlete profile is the foundation of everything in the app.
        Complete it before adding schools or coaches.
      </p>
      <HelpStepCard :step="1" title="Navigate to Settings">
        From the dashboard, go to
        <strong>Settings → Profile & Player Info → Athlete Profile</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Fill in your details">
        Enter your name, graduation year, sport, position(s), GPA, and test
        scores. All fields help generate accurate fit signals for schools.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Save your profile" :last="true">
        Tap <strong>Save changes</strong>. Your profile is now visible to
        coaches who view your recruiting page.
      </HelpStepCard>
    </section>

    <!-- Adding family members -->
    <section class="mb-10">
      <HelpSectionHeader title="Adding family members" />
      <p class="mb-4 text-sm text-gray-600">
        Parents and guardians can be added as family members to view and
        collaborate on your recruiting journey.
      </p>
      <HelpStepCard :step="1" title="Go to Family settings">
        Navigate to
        <strong>Settings → Family → Family Management</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Invite a family member" :last="true">
        Enter their email address, choose their role (<strong>Player</strong> or
        <strong>Parent</strong>), and tap <strong>Send invite</strong>. They'll
        receive an email to create their account and join your family unit. If
        someone already has an account, they can also join instantly by entering
        your family's <strong>Family Code</strong>, shown on the same page — no
        email invite required.
      </HelpStepCard>
      <HelpCallout type="info">
        Family members can view your athlete profile, school list, and every
        interaction logged by anyone in the family, and any family member can
        log a new interaction. Editing or deleting an existing interaction is
        limited to whoever originally logged it.
      </HelpCallout>
    </section>

    <!-- Understanding the dashboard -->
    <section class="mb-10">
      <HelpSectionHeader title="Understanding the dashboard" />
      <p class="mb-4 text-sm text-gray-600">
        The dashboard gives you a snapshot of your recruiting progress at a
        glance.
      </p>
      <HelpImageSlot
        caption="The main dashboard showing your current phase, stats, suggestions, and upcoming deadlines."
      />
      <ul class="mt-4 space-y-2 text-sm text-gray-700">
        <li>
          <strong>Timeline card</strong> — your current phase and the milestone
          tasks left to complete before advancing
        </li>
        <li>
          <strong>Stats cards</strong> — quick counts across your schools and
          interactions
        </li>
        <li>
          <strong>Suggestions</strong> — smart recommendations for your next
          steps
        </li>
        <li>
          <strong>Public Profile link</strong> — a shortcut to your shareable
          public recruiting profile
        </li>
        <li>
          <strong>Recruiting Calendar</strong> — upcoming milestones and
          deadlines for your sport, division, and graduation year, plus any
          custom deadlines you've added
        </li>
        <li>
          <strong>Contact Frequency</strong> — how often you're hearing from
          your tracked coaches
        </li>
        <li>
          <strong>Athlete Activity</strong> — parent accounts only; a summary of
          the athlete's recent activity
        </li>
      </ul>
    </section>

    <!-- Your first action -->
    <section class="mb-10">
      <HelpSectionHeader title="Your first action" />
      <p class="mb-4 text-sm text-gray-600">
        Once your profile is set up, the most impactful first step is building
        your school list.
      </p>
      <HelpStepCard :step="1" title="Search for schools" :last="true">
        Go to
        <NuxtLink
          to="/search"
          class="text-primary-600 font-medium hover:underline"
          >Search</NuxtLink
        >
        and filter by division, sport, location, or size. Add any school that
        interests you.
      </HelpStepCard>
      <HelpCallout type="tip">
        Start broad — you can always narrow your list later. Adding 20–30
        schools gives the fit signal calculations enough data to show meaningful
        patterns.
      </HelpCallout>
    </section>

    <HelpFeedback />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "help",
});
</script>
