<template>
  <div class="max-w-2xl">
    <h1 class="mb-1 text-2xl font-bold text-gray-900">Account & Settings</h1>
    <p class="mb-8 text-gray-500">Last reviewed: February 2026</p>

    <!-- Athlete profile -->
    <section class="mb-10">
      <HelpSectionHeader title="Updating your athlete profile" />
      <p class="mb-4 text-sm text-gray-600">
        Keep your profile current — fit scores and recommendations update automatically when your
        profile changes.
      </p>
      <HelpStepCard :step="1" title="Open Settings">
        Navigate to <NuxtLink to="/settings" class="font-medium text-primary-600 hover:underline">Settings</NuxtLink>
        and select <strong>Athlete Profile</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Edit your details">
        Update any field — graduation year, sport, positions, GPA, SAT/ACT, height, or weight.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Save changes" :last="true">
        Tap <strong>Save changes</strong>. Fit scores for all your schools will recalculate within a
        few seconds.
      </HelpStepCard>
    </section>

    <!-- Family members -->
    <section class="mb-10">
      <HelpSectionHeader title="Managing family members" />
      <p class="mb-4 text-sm text-gray-600">
        Family members (parents, guardians) can view your recruiting profile and help confirm
        phase advancements.
      </p>
      <HelpStepCard :step="1" title="Go to Family settings">
        Navigate to <strong>Settings → Family</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Invite a member">
        Enter their email and tap <strong>Send invite</strong>. They'll receive an invitation to
        create a linked account.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Manage access" :last="true">
        To remove a family member, tap the three-dot menu next to their name and select <strong>Remove</strong>.
      </HelpStepCard>
      <HelpCallout type="info">
        A family member's account is linked to your athlete profile — they cannot log in as you or
        make changes on your behalf.
      </HelpCallout>
    </section>

    <!-- Notification preferences -->
    <section class="mb-10">
      <HelpSectionHeader title="Notification preferences" />
      <p class="mb-4 text-sm text-gray-600">
        Control which notifications you receive and how you receive them.
      </p>
      <p class="text-sm text-gray-600">
        Go to <strong>Settings → Notifications</strong> to enable or disable notifications by category.
      </p>
      <HelpCallout type="tip">
        Keep <strong>Phase confirmations</strong> and <strong>Rec letter updates</strong> notifications
        enabled — these are time-sensitive actions that require your attention.
      </HelpCallout>
    </section>

    <!-- Notification types -->
    <section class="mb-10">
      <HelpSectionHeader title="Understanding notification types" />
      <div class="space-y-4 text-sm text-gray-700">
        <div>
          <p class="font-semibold">High priority</p>
          <ul class="mt-1 space-y-1 text-gray-600">
            <li>Phase advancement confirmation requests</li>
            <li>Recommendation letter deadline reminders (7 days out)</li>
            <li>New family member invitation</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold">Medium priority</p>
          <ul class="mt-1 space-y-1 text-gray-600">
            <li>Interaction logged by a family member</li>
            <li>Recommendation letter status change</li>
            <li>Phase advancement completed</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold">Low priority</p>
          <ul class="mt-1 space-y-1 text-gray-600">
            <li>Weekly recruiting activity summary</li>
            <li>School list milestone (e.g., 10 schools added)</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Password -->
    <section class="mb-10">
      <HelpSectionHeader title="Changing your password" />
      <HelpStepCard :step="1" title="Go to Account settings">
        Navigate to <strong>Settings → Account</strong>.
      </HelpStepCard>
      <HelpStepCard :step="2" title="Tap Change password">
        Enter your current password, then your new password twice to confirm.
      </HelpStepCard>
      <HelpStepCard :step="3" title="Save" :last="true">
        Tap <strong>Update password</strong>. You'll be asked to log in again with your new credentials.
      </HelpStepCard>
    </section>

    <!-- Data & privacy -->
    <section class="mb-10">
      <HelpSectionHeader title="Data and privacy" />
      <p class="mb-4 text-sm leading-relaxed text-gray-600">
        Your data is stored securely and never shared with third parties or college programs without
        your consent. The Recruiting Compass does not sell user data.
      </p>
      <ul class="space-y-2 text-sm text-gray-700">
        <li><strong>What we store</strong> — your athlete profile, school list, coach interactions, and app activity</li>
        <li><strong>Who can see it</strong> — only you and family members you've invited</li>
        <li><strong>To delete your account</strong> — go to <strong>Settings → Account → Delete account</strong>. This permanently removes all your data.</li>
      </ul>
      <HelpCallout type="important">
        Account deletion is permanent and cannot be undone. Export your data before deleting if you
        want to keep a record of your recruiting history.
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
