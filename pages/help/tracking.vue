<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">
      Tracking Your Recruiting
    </h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <!-- Documents -->
    <section class="mb-10">
      <HelpSectionHeader title="Documents" />
      <p class="mb-4 text-sm text-gray-600">
        Store the files coaches ask for — highlight videos, transcripts,
        resumes, recommendation letters, questionnaires, and stats sheets — all
        in one place, then choose which schools can see each one.
      </p>
      <HelpStepCard :step="1" title="Upload a document">
        Go to
        <NuxtLink
          to="/documents"
          class="text-primary-600 font-medium hover:underline"
          >Documents</NuxtLink
        >
        and tap <strong>+ Add Document</strong>. Choose a type — highlight
        video, transcript, resume, recommendation letter, questionnaire, or
        stats sheet — and upload the file.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Share it with schools" :last="true">
        Open the document and choose which schools on your list can access it. A
        document is private to you until you explicitly share it.
      </HelpStepCard>
      <HelpCallout type="warning">
        A document isn't visible to a school until you share it with that school
        specifically. Uploading a file alone doesn't send it to anyone.
      </HelpCallout>
    </section>

    <!-- Offers -->
    <section class="mb-10">
      <HelpSectionHeader title="Offers" />
      <p class="mb-4 text-sm text-gray-600">
        Track and compare scholarship offers as they come in, each linked to a
        school on your list.
      </p>
      <ul class="space-y-2 text-sm text-gray-700">
        <li>
          <strong>Offer type</strong> — full ride, partial scholarship,
          scholarship, recruited walk-on, or preferred walk-on
        </li>
        <li>
          <strong>Status</strong> — Pending, Accepted, Declined, or Expired
        </li>
      </ul>
      <p class="mt-3 text-sm text-gray-600">
        Add an offer from
        <NuxtLink
          to="/offers"
          class="text-primary-600 font-medium hover:underline"
          >Offers</NuxtLink
        >, or from the school's own page.
      </p>
      <HelpCallout type="tip">
        Comparing offers side by side is easiest once each one has a status and
        scholarship percentage filled in.
      </HelpCallout>
    </section>

    <!-- Events -->
    <section class="mb-10">
      <HelpSectionHeader title="Events" />
      <p class="mb-4 text-sm text-gray-600">
        Log camps, showcases, and visits so they show up alongside your other
        recruiting activity.
      </p>
      <ul class="space-y-2 text-sm text-gray-700">
        <li>
          <strong>Event types</strong> — showcase, camp, official visit,
          unofficial visit, game
        </li>
        <li>
          <strong>Upcoming vs. past</strong> — events are split by date, and
          each one can be linked to a school and coach
        </li>
      </ul>
      <p class="mt-3 text-sm text-gray-600">
        Add an event from
        <NuxtLink
          to="/events"
          class="text-primary-600 font-medium hover:underline"
          >Events</NuxtLink
        >.
      </p>
    </section>

    <!-- Performance -->
    <section class="mb-10">
      <HelpSectionHeader title="Performance" />
      <p class="mb-4 text-sm text-gray-600">
        Track your athletic stats over time on the
        <NuxtLink
          to="/performance"
          class="text-primary-600 font-medium hover:underline"
          >Performance</NuxtLink
        >
        page. Entries build a timeline you can look back on as the season
        progresses.
      </p>
      <HelpCallout type="tip">
        Your performance stats also auto-fill the metrics in Coach Outreach
        templates — keeping them current helps your outreach stay accurate. See
        the Coach Outreach section on the
        <NuxtLink
          to="/help/schools"
          class="text-primary-600 font-medium hover:underline"
          >Schools & Coaches</NuxtLink
        >
        page.
      </HelpCallout>
    </section>

    <!-- Reports -->
    <section class="mb-10">
      <HelpSectionHeader title="Reports" />
      <p class="mb-4 text-sm text-gray-600">
        The
        <NuxtLink
          to="/reports"
          class="text-primary-600 font-medium hover:underline"
          >Reports</NuxtLink
        >
        page generates a summary of your recruiting activity over a date range
        you choose — pick a quick preset or a custom range, then export it as a
        CSV for spreadsheets.
      </p>
      <p class="mb-4 text-sm text-gray-600">
        A separate
        <NuxtLink
          to="/reports/timeline"
          class="text-primary-600 font-medium hover:underline"
          >Recruiting Timeline</NuxtLink
        >
        view shows your journey visually, filterable by school and by a 3, 6, or
        12-month (or all-time) window.
      </p>
    </section>

    <!-- Analytics -->
    <section class="mb-10">
      <HelpSectionHeader title="Analytics" />
      <p class="mb-4 text-sm text-gray-600">
        The
        <NuxtLink
          to="/analytics"
          class="text-primary-600 font-medium hover:underline"
          >Analytics</NuxtLink
        >
        page rolls up your recruiting metrics into one view: interaction types,
        sentiment breakdown, your recruiting pipeline, school status, and a
        performance correlation analysis.
      </p>
      <HelpCallout type="info">
        Analytics needs enough logged interactions and performance data to show
        meaningful trends — it's most useful once you've been actively tracking
        for a few weeks.
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
