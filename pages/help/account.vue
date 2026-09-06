<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Account & Settings</h1>
    <HelpReviewedDate reviewed-on="2026-09-06" />

    <!-- Athlete profile -->
    <section class="mb-10">
      <HelpSectionHeader title="Updating your athlete profile" />
      <p class="mb-4 text-sm text-gray-600">
        Keep your profile current — fit signals and recommendations update
        automatically when your profile changes.
      </p>
      <HelpStepCard :step="1" title="Open Settings">
        Navigate to
        <NuxtLink
          to="/settings"
          class="text-primary-600 font-medium hover:underline"
          >Settings</NuxtLink
        >
        → <strong>Profile & Player Info</strong> and select
        <strong>Athlete Profile</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Edit your details">
        Update any field — graduation year, sport, positions, GPA, SAT/ACT,
        height, or weight.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Save changes" :last="true">
        Tap <strong>Save changes</strong>. Fit signals for all your schools will
        update within a few seconds.
      </HelpStepCard>
    </section>

    <!-- Family members -->
    <section class="mb-10">
      <HelpSectionHeader title="Managing family members" />
      <p class="mb-4 text-sm text-gray-600">
        Family members (parents, guardians) can view your recruiting profile and
        add their own interactions and notes.
      </p>
      <HelpStepCard :step="1" title="Go to Family settings">
        Navigate to
        <strong>Settings → Family → Family Management</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Invite a member">
        Enter their email, choose a role (<strong>Player</strong> or
        <strong>Parent</strong>), and tap <strong>Send invite</strong>. They'll
        receive an invitation to create a linked account. A parent who already
        has an account can also join instantly with your family's
        <strong>Family Code</strong> shown on the same page.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Manage access" :last="true">
        To remove a family member, tap the three-dot menu next to their name and
        select <strong>Remove</strong>.
      </HelpStepCard>
      <HelpCallout type="info">
        A family member's account is linked to your family unit — they can view
        your athlete profile and every logged interaction, and can log new
        interactions of their own. Editing or deleting an existing interaction
        is limited to whoever logged it.
      </HelpCallout>
    </section>

    <!-- Notification preferences -->
    <section class="mb-10">
      <HelpSectionHeader title="Notification preferences" />
      <p class="mb-4 text-sm text-gray-600">
        Control which notifications you receive and how you receive them.
      </p>
      <p class="text-sm text-gray-600">
        Go to <strong>Settings → Notifications</strong> to enable or disable
        notifications by category.
      </p>
      <HelpCallout type="tip">
        Keep <strong>Deadline Alerts</strong> enabled — it's the only category
        tied to hard dates (application, offer, and NCAA deadlines).
      </HelpCallout>
    </section>

    <!-- Notification types -->
    <section class="mb-10">
      <HelpSectionHeader title="Understanding notification types" />
      <p class="mb-4 text-sm text-gray-600">
        There are four notification categories, each with its own push toggle.
        Only two also support email.
      </p>
      <div class="space-y-4 text-sm text-gray-700">
        <div>
          <p class="font-semibold">Follow-up Reminders</p>
          <p class="text-gray-600">
            When it's time to contact a coach. Push only.
          </p>
        </div>
        <div>
          <p class="font-semibold">Deadline Alerts</p>
          <p class="text-gray-600">
            Application, offer, and NCAA deadlines — 7, 3, and 0 days out. Push
            and email.
          </p>
        </div>
        <div>
          <p class="font-semibold">Weekly Digest</p>
          <p class="text-gray-600">
            Monday morning recruiting summary. Push and email.
          </p>
        </div>
        <div>
          <p class="font-semibold">Event Reminders</p>
          <p class="text-gray-600">
            24 hours before visits and showcases. Push only.
          </p>
        </div>
      </div>
    </section>

    <!-- Password -->
    <section class="mb-10">
      <HelpSectionHeader title="Changing your password" />
      <HelpStepCard :step="1" title="Go to My Profile settings">
        Navigate to <strong>Settings → My Profile → Password</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Enter your passwords">
        Enter your current password, then your new password twice to confirm.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Save" :last="true">
        Tap <strong>Change Password</strong>.
      </HelpStepCard>
    </section>

    <!-- Data & privacy -->
    <section class="mb-10">
      <HelpSectionHeader title="Data and privacy" />
      <p class="mb-4 text-sm leading-relaxed text-gray-600">
        Your data is stored securely and never shared with third parties or
        college programs without your consent. The Recruiting Compass does not
        sell user data.
      </p>
      <ul class="space-y-2 text-sm text-gray-700">
        <li>
          <strong>What we store</strong> — your athlete profile, school list,
          coach interactions, and app activity
        </li>
        <li>
          <strong>Who can see it</strong> — only you and family members you've
          invited
        </li>
        <li>
          <strong>To delete your account</strong> — go to
          <strong>Settings → Account → Delete Account</strong>. Deletion isn't
          instant: it's scheduled for a future date, and you can cancel the
          pending deletion any time before then from the same page.
        </li>
      </ul>
      <HelpCallout type="important">
        Once the scheduled deletion date passes, it's permanent and cannot be
        undone. Export your data before that date if you want to keep a record
        of your recruiting history.
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
