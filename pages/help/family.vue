<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Family & Profile</h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <!-- Family Management -->
    <section class="mb-10">
      <HelpSectionHeader title="Family Management" />
      <p class="mb-4 text-sm text-gray-600">
        Recruiting is a family effort. Invite a parent or guardian to share
        access to your recruiting data, or join an existing family as a
        student.
      </p>
      <HelpStepCard :step="1" title="Open Family Management">
        Go to
        <NuxtLink
          to="/settings/family-management"
          class="text-primary-600 font-medium hover:underline"
          >Settings → Family</NuxtLink
        >.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Invite by email">
        Enter the person's email, choose their role —
        <strong>player</strong> or <strong>parent</strong> — and tap
        <strong>Send invite</strong>. They'll get an email invitation to join
        your family unit.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Or share your Family Code" :last="true">
        As the athlete, your Family Management page displays your own
        <strong>Family Code</strong>. Share it with a parent or guardian who
        already has an account and they can enter it to join your family
        instantly, instead of waiting for an email invite.
      </HelpStepCard>
      <HelpCallout type="info">
        A parent linked to more than one athlete can switch between them using
        the athlete switcher at the top of the app — everything you see
        (schools, tasks, dashboard) updates to that athlete's data.
      </HelpCallout>
    </section>

    <!-- Notifications -->
    <section class="mb-10">
      <HelpSectionHeader title="Notifications" />
      <p class="mb-4 text-sm text-gray-600">
        Notifications keep you on top of deadlines and coach follow-ups
        without checking the app constantly. There are four types, each with
        its own in-app (push) and, where available, email toggle:
      </p>
      <ul class="space-y-2 text-sm text-gray-700">
        <li>
          <strong>Follow-up Reminders</strong> — when it's time to contact a
          coach (push only)
        </li>
        <li>
          <strong>Deadline Alerts</strong> — application, offer, and NCAA
          deadlines, sent 7, 3, and 0 days out (push and email)
        </li>
        <li>
          <strong>Weekly Digest</strong> — a Monday morning recruiting summary
          (push and email)
        </li>
        <li>
          <strong>Event Reminders</strong> — 24 hours before visits and
          showcases (push only)
        </li>
      </ul>
      <p class="mt-3 text-sm text-gray-600">
        Change what you receive at
        <NuxtLink
          to="/settings/notifications"
          class="text-primary-600 font-medium hover:underline"
          >Settings → Notifications</NuxtLink
        >. To see notifications you've already received, check the
        <NuxtLink
          to="/notifications"
          class="text-primary-600 font-medium hover:underline"
          >notifications feed</NuxtLink
        >.
      </p>
    </section>

    <!-- Public Player Profile -->
    <section class="mb-10">
      <HelpSectionHeader title="Public Player Profile" />
      <p class="mb-4 text-sm text-gray-600">
        A shareable, public-facing page that shows coaches your key
        recruiting info without requiring them to log in — your metrics, team
        history, awards, values, and current commitment status, plus a
        highlights reel of your video links.
      </p>
      <HelpStepCard :step="1" title="Publish your profile">
        Go to
        <NuxtLink
          to="/settings/player-details?tab=public-profile"
          class="text-primary-600 font-medium hover:underline"
          >Settings → Athlete Profile → Public Profile</NuxtLink
        >
        and turn it on.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Share the link" :last="true">
        Once published, your dashboard's Public Profile card shows a
        shareable link — copy it and send it to coaches. Anyone with the link
        can view the profile; no account or login is required.
      </HelpStepCard>
      <HelpCallout type="tip">
        Add video links from the Athletics tab of your Athlete Profile (up to
        5) — they show up in your public profile's highlights reel and in
        Coach Outreach template previews.
      </HelpCallout>
    </section>

    <!-- School Preferences -->
    <section class="mb-10">
      <HelpSectionHeader title="School Preferences" />
      <p class="mb-4 text-sm text-gray-600">
        <NuxtLink
          to="/settings/school-preferences"
          class="text-primary-600 font-medium hover:underline"
          >Settings → School Preferences</NuxtLink
        >
        lets you build a custom set of criteria — location, academics,
        program, or your own custom rules — for what you're looking for in a
        school. Start from a template or build your own list from scratch.
      </p>
      <HelpCallout type="info">
        This is separate from the inputs behind your Personal Fit signal.
        Personal Fit compares your home state, campus size preference, and
        cost sensitivity — set on your
        <NuxtLink
          to="/settings/player-details"
          class="text-primary-600 font-medium hover:underline"
          >Athlete Profile</NuxtLink
        >
        — against each school. See
        <NuxtLink
          to="/help/schools"
          class="text-primary-600 font-medium hover:underline"
          >Schools & Coaches → School Fit Signals</NuxtLink
        >
        for details.
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
