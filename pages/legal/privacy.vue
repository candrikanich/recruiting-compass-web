<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div
        class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between"
      >
        <NuxtLink
          to="/"
          class="text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-colors"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back
        </NuxtLink>
        <h1 class="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <div class="w-10" />
        <!-- spacer for alignment -->
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-12">
      <div
        class="bg-white rounded-lg shadow-xs p-8 prose prose-slate max-w-none"
      >
        <!-- UPDATE THIS DATE WHENEVER THE PRIVACY POLICY IS MODIFIED -->
        <p class="text-slate-600 mb-8">
          <strong>Last Updated:</strong> March 1, 2026
        </p>

        <section class="mb-8">
          <h2>1. Introduction</h2>
          <p>
            Recruiting Compass ("we," "us," "our," or "Company") is committed to
            protecting your privacy. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you
            visit our website and use our services.
          </p>
          <p>
            Please read this Privacy Policy carefully. If you do not agree with
            our policies and practices, please do not use our Service. This
            Policy is incorporated by reference into our
            <NuxtLink to="/legal/terms" class="text-blue-600 hover:underline"
              >Terms and Conditions</NuxtLink
            >.
          </p>
        </section>

        <section class="mb-8">
          <h2>2. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways:</p>

          <h3 class="text-lg font-semibold mt-6 mb-3">
            Information You Provide
          </h3>
          <ul>
            <li>
              <strong>Registration Information:</strong> Name, email address,
              password (stored as a hashed value — never in plaintext), date of
              birth (used to verify age eligibility), and role (parent or
              player)
            </li>
            <li>
              <strong>Profile Information:</strong> Profile photo, graduation
              year, sport, position, GPA, standardized test scores, athletic
              stats, and recruiting preferences
            </li>
            <li>
              <strong>Recruiting Activity:</strong> Schools and college programs
              you track, coach contact information you enter, and interaction
              notes and communication logs you create
            </li>
            <li>
              <strong>Family Unit Data:</strong> Email addresses of family
              members you invite to join your family unit, which are retained
              until the invitation is accepted, declined, or expires
            </li>
            <li>
              <strong>Preference Data:</strong> Location preferences, school
              type preferences, and other customization settings
            </li>
          </ul>

          <h3 class="text-lg font-semibold mt-6 mb-3">
            Data We Do Not Collect
          </h3>
          <ul>
            <li>Health, medical, or injury information</li>
            <li>
              Financial data or payment card information (no payment processor
              is currently in use)
            </li>
            <li>
              Social Security numbers or government-issued identification
              numbers
            </li>
          </ul>

          <h3 class="text-lg font-semibold mt-6 mb-3">
            Automatically Collected Information
          </h3>
          <ul>
            <li>
              <strong>Log Data:</strong> IP address, browser type, pages
              visited, and time and date stamps
            </li>
            <li>
              <strong>Device Information:</strong> Device type, operating
              system, and unique device identifiers
            </li>
            <li>
              <strong>Usage Analytics:</strong> How you interact with our
              Service, features you use, and actions you take
            </li>
            <li>
              <strong>Cookies:</strong> Small data files stored on your device
              to maintain your session and enhance your experience
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>To create and maintain your account</li>
            <li>To provide, maintain, and improve the Service</li>
            <li>
              To calculate your Fit Score — an algorithmic estimate of school
              compatibility based on your profile data and publicly available
              school information
            </li>
            <li>
              To send transactional emails (account confirmations, invites,
              security alerts)
            </li>
            <li>
              To send product updates, recruiting tips, and (with consent)
              promotional information
            </li>
            <li>To respond to your inquiries and support requests</li>
            <li>To analyze usage patterns and improve our offerings</li>
            <li>To comply with legal obligations</li>
            <li>To prevent fraud and enhance security</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>4. Third-Party Data Sources</h2>
          <p>
            School and program information displayed in the Service may be
            sourced from the
            <strong>U.S. Department of Education College Scorecard API</strong>
            and other publicly available sources. We use this data to provide
            reference information about colleges and athletic programs.
          </p>
          <p>
            <strong>We do not sell or share your personal information</strong>
            with third parties for advertising or marketing purposes.
          </p>
        </section>

        <section class="mb-8">
          <h2>5. Sharing Your Information</h2>
          <p>
            We do not sell, trade, or rent your personal information to third
            parties. We may share information in the following circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> Third-party vendors who assist
              in operating our Service (e.g., hosting, email delivery), subject
              to confidentiality obligations
            </li>
            <li>
              <strong>Family Unit Members:</strong> If you are part of a family
              unit, limited profile information is visible to other members of
              that unit
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law, court
              order, or government request
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger,
              acquisition, or sale of assets, with appropriate notice to users
            </li>
            <li>
              <strong>With Your Consent:</strong> When you explicitly authorize
              us to share your information
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>6. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect your personal information, including:
          </p>
          <ul>
            <li>Encryption of data in transit (TLS/HTTPS)</li>
            <li>Encryption of data at rest</li>
            <li>
              Row-level security policies enforcing data isolation between
              accounts
            </li>
            <li>
              Passwords stored exclusively as hashed values — never in plaintext
            </li>
          </ul>
          <p>
            However, no method of transmission over the Internet or electronic
            storage is completely secure. We cannot guarantee absolute security
            of your information.
          </p>
        </section>

        <section class="mb-8">
          <h2>7. Data Retention</h2>
          <p>We retain your data as follows:</p>
          <ul>
            <li>
              <strong>Active accounts:</strong> Data is retained for as long as
              your account is active
            </li>
            <li>
              <strong>Pending invitations:</strong> Invitation email addresses
              are retained until the invitation is accepted, declined, or
              expires (invitations expire after 30 days)
            </li>
            <li>
              <strong>Deleted accounts:</strong> Following an account deletion
              request, your personal data is purged within 30 days. You may
              cancel a deletion request within that 30-day window.
            </li>
            <li>
              <strong>Audit logs:</strong> Deletion event logs are retained for
              up to 90 days for fraud prevention and legal compliance purposes
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>8. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate or incomplete information</li>
            <li>Request deletion of your information</li>
            <li>Opt out of certain data processing activities</li>
            <li>Request a portable copy of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h3 class="text-lg font-semibold mt-6 mb-3">
            California Residents (CCPA)
          </h3>
          <p>
            If you are a California resident, you have the following additional
            rights under the California Consumer Privacy Act:
          </p>
          <ul>
            <li>
              <strong>Right to Know:</strong> You may request disclosure of the
              categories and specific pieces of personal information we have
              collected about you
            </li>
            <li>
              <strong>Right to Delete:</strong> You may request deletion of your
              personal information, subject to certain exceptions
            </li>
            <li>
              <strong>Right to Opt Out of Sale:</strong> We do not sell your
              personal information
            </li>
            <li>
              <strong>Right to Non-Discrimination:</strong> We will not
              discriminate against you for exercising your CCPA rights
            </li>
          </ul>
          <p class="mt-4">
            To exercise these rights, please contact us at
            <a
              href="mailto:privacy@therecruitingcompass.com"
              class="text-blue-600 hover:underline"
              >privacy@therecruitingcompass.com</a
            >
            or submit a request through your account settings.
          </p>
        </section>

        <section class="mb-8">
          <h2>9. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to maintain your
            session and enhance your experience. Most web browsers allow you to
            control cookies through their settings. Disabling cookies may affect
            the functionality of our Service.
          </p>
        </section>

        <section class="mb-8">
          <h2>10. Children's Privacy (COPPA)</h2>
          <p>
            The Service is not directed to children under the age of 13. We
            collect date of birth at registration to enforce this restriction
            and do not knowingly create accounts for anyone under 13.
          </p>
          <p>
            Family unit accounts may include athletes between the ages of 13 and
            17. Parents and guardians are responsible for supervising their
            minor's use of the Service.
          </p>
          <p>
            If you are a parent or guardian and believe your child under 13 has
            registered, or if you wish to request deletion of any data collected
            from a minor in error, please contact us at
            <a
              href="mailto:privacy@therecruitingcompass.com"
              class="text-blue-600 hover:underline"
              >privacy@therecruitingcompass.com</a
            >.
          </p>
        </section>

        <section class="mb-8">
          <h2>11. Third-Party Links</h2>
          <p>
            Our Service may contain links to third-party websites. We are not
            responsible for the privacy practices of those sites. We encourage
            you to review the privacy policies of any third-party sites before
            providing your information.
          </p>
        </section>

        <section class="mb-8">
          <h2>12. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. For material
            changes — including changes to how we collect, use, or share your
            personal information — we will provide at least 14 days' advance
            notice via an in-app notification and, where feasible, email. Your
            continued use of the Service after the effective date of any change
            constitutes your acceptance of the updated Policy.
          </p>
        </section>

        <section class="mb-8">
          <h2>13. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy
            practices, please contact us at:
          </p>
          <div class="bg-slate-50 p-4 rounded-sm mt-4">
            <p>
              <strong>Recruiting Compass</strong><br />
              <!-- TODO: Replace with registered agent address before public launch -->
              Olmsted Township, OH 44138<br />
              Privacy inquiries:
              <a
                href="mailto:privacy@therecruitingcompass.com"
                class="text-blue-600 hover:underline"
                >privacy@therecruitingcompass.com</a
              ><br />
              General support:
              <a
                href="mailto:support@therecruitingcompass.com"
                class="text-blue-600 hover:underline"
                >support@therecruitingcompass.com</a
              >
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public" });

import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
// UPDATE THIS DATE WHENEVER THE PRIVACY POLICY IS MODIFIED
</script>

<style scoped>
:deep(.prose) {
  color: #475569;
  line-height: 1.5;
}

:deep(.prose h2) {
  font-size: 1.25rem;
  font-weight: bold;
  color: #111827;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

:deep(.prose h3) {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.prose p) {
  margin-bottom: 1rem;
}

:deep(.prose ul) {
  list-style-type: disc;
  list-style-position: inside;
  margin-bottom: 1rem;
  padding-left: 1rem;
}

:deep(.prose li) {
  color: #475569;
  margin-top: 0.5rem;
}

:deep(.prose a) {
  color: #2563eb;
}
</style>
