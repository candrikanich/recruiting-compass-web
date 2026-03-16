<template>
  <div class="prose-gray max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Getting Started</h1>
    <p class="mb-8 text-gray-500">Last reviewed: February 2026</p>

    <!-- What is The Recruiting Compass -->
    <section class="mb-10">
      <HelpSectionHeader title="What is The Recruiting Compass?" />
      <p class="text-sm leading-relaxed text-gray-700">
        The Recruiting Compass is a recruiting management tool built for student athletes and their families.
        It helps you organize your college search, track schools and coaches, manage the phases of the
        recruiting process, and stay on top of every interaction along the way.
      </p>
      <HelpCallout type="tip">
        You're in charge of your recruiting journey. The Recruiting Compass keeps everything organized
        so you can focus on making the right connections.
      </HelpCallout>
    </section>

    <!-- Creating your profile -->
    <section class="mb-10">
      <HelpSectionHeader title="Creating your profile" />
      <p class="mb-4 text-sm text-gray-600">
        Your athlete profile is the foundation of everything in the app. Complete it before adding schools or coaches.
      </p>
      <HelpStepCard :step="1" title="Navigate to Settings">
        From the dashboard, go to <strong>Settings → Athlete Profile</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Fill in your details">
        Enter your name, graduation year, sport, position(s), GPA, and test scores. All fields help
        generate accurate fit scores for schools.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Save your profile" :last="true">
        Tap <strong>Save changes</strong>. Your profile is now visible to coaches who view your recruiting page.
      </HelpStepCard>
    </section>

    <!-- Adding family members -->
    <section class="mb-10">
      <HelpSectionHeader title="Adding family members" />
      <p class="mb-4 text-sm text-gray-600">
        Parents and guardians can be added as family members to view and collaborate on your recruiting journey.
      </p>
      <HelpStepCard :step="1" title="Go to Family settings">
        Navigate to <strong>Settings → Family</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Invite a family member" :last="true">
        Enter their email address and tap <strong>Send invite</strong>. They'll receive an email to
        create their account and join your family unit.
      </HelpStepCard>
      <HelpCallout type="info">
        Family members can view your school list, phases, and interactions — but only the athlete can
        make changes to the profile.
      </HelpCallout>
    </section>

    <!-- Understanding the dashboard -->
    <section class="mb-10">
      <HelpSectionHeader title="Understanding the dashboard" />
      <p class="mb-4 text-sm text-gray-600">
        The dashboard gives you a snapshot of your recruiting progress at a glance.
      </p>
      <HelpImageSlot caption="The main dashboard showing your school list, current phase, and recent activity." />
      <ul class="mt-4 space-y-2 text-sm text-gray-700">
        <li><strong>Current Phase</strong> — where you are in the recruiting process (Freshman through Senior)</li>
        <li><strong>School list</strong> — your saved schools with fit scores and interaction counts</li>
        <li><strong>Recent activity</strong> — latest interactions and notifications</li>
        <li><strong>Tasks</strong> — action items specific to your current phase</li>
      </ul>
    </section>

    <!-- Your first action -->
    <section class="mb-10">
      <HelpSectionHeader title="Your first action" />
      <p class="mb-4 text-sm text-gray-600">
        Once your profile is set up, the most impactful first step is building your school list.
      </p>
      <HelpStepCard :step="1" title="Search for schools" :last="true">
        Go to <NuxtLink to="/search" class="font-medium text-primary-600 hover:underline">Search</NuxtLink>
        and filter by division, sport, location, or size. Add any school that interests you.
      </HelpStepCard>
      <HelpCallout type="tip">
        Start broad — you can always narrow your list later. Adding 20–30 schools gives the fit score
        algorithm enough data to show meaningful patterns.
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
