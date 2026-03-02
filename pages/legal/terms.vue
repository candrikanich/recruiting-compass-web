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
        <h1 class="text-2xl font-bold text-slate-900">Terms and Conditions</h1>
        <div class="w-10" />
        <!-- spacer for alignment -->
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-12">
      <div
        class="bg-white rounded-lg shadow-sm p-8 prose prose-slate max-w-none"
      >
        <!-- UPDATE THIS DATE WHENEVER TERMS ARE MODIFIED -->
        <p class="text-slate-600 mb-4">
          <strong>Last Updated:</strong> March 1, 2026
        </p>

        <p class="text-slate-600 mb-8">
          Please also review our
          <NuxtLink to="/legal/privacy" class="text-blue-600 hover:underline"
            >Privacy Policy</NuxtLink
          >, which is incorporated by reference into these Terms.
        </p>

        <section class="mb-8">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing and using the Recruiting Compass website and services
            (the "Service"), you agree to be bound by these Terms and
            Conditions. If you do not agree to abide by the above, please do not
            use this service.
          </p>
        </section>

        <section class="mb-8">
          <h2>2. Use License</h2>
          <p>
            Subject to your compliance with these Terms, Recruiting Compass
            grants you a limited, non-exclusive, non-transferable, revocable
            license to access and use the Service for your personal,
            non-commercial recruiting and college research purposes. This
            license does not include any right to:
          </p>
          <ul>
            <li>
              Sublicense, sell, resell, transfer, or commercially exploit the
              Service or any content within it
            </li>
            <li>Modify or create derivative works based upon the Service</li>
            <li>
              Reverse engineer, decompile, or disassemble any software
              underlying the Service
            </li>
            <li>
              Remove any copyright, trademark, or other proprietary notices
              from any portion of the Service
            </li>
            <li>
              Use the Service in any way that violates these Terms or
              applicable law
            </li>
          </ul>
          <p>
            Recruiting Compass reserves the right to revoke this license at any
            time for any reason, including violation of these Terms.
          </p>
        </section>

        <section class="mb-8">
          <h2>3. Disclaimer</h2>
          <p>
            The materials on Recruiting Compass are provided on an "as is"
            basis. Recruiting Compass makes no warranties, expressed or implied,
            and hereby disclaims and negates all other warranties including,
            without limitation, implied warranties or conditions of
            merchantability, fitness for a particular purpose, or
            non-infringement of intellectual property or other violation of
            rights.
          </p>
        </section>

        <section class="mb-8">
          <h2>4. Limitations of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, in no event shall
            Recruiting Compass or its suppliers be liable for any indirect,
            incidental, special, consequential, or punitive damages (including,
            without limitation, damages for loss of data or profit, or due to
            business interruption) arising out of the use or inability to use
            the Service, even if Recruiting Compass has been notified of the
            possibility of such damage.
          </p>
          <p>
            In all cases, Recruiting Compass's total liability to you for any
            claim arising from or relating to these Terms or the Service shall
            not exceed the greater of (a) $100.00 USD or (b) the total amount
            you paid to Recruiting Compass in the twelve (12) months preceding
            the claim.
          </p>
        </section>

        <section class="mb-8">
          <h2>5. Accuracy of Materials</h2>
          <p>
            The materials appearing on Recruiting Compass could include
            technical, typographical, or photographic errors. Recruiting Compass
            does not warrant that any of the materials on the website are
            accurate, complete, or current. Recruiting Compass may make changes
            to the materials contained on its website at any time without
            notice.
          </p>
        </section>

        <section class="mb-8">
          <h2>6. Links</h2>
          <p>
            Recruiting Compass has not reviewed all of the sites linked to its
            website and is not responsible for the contents of any such linked
            site. The inclusion of any link does not imply endorsement by
            Recruiting Compass of the site. Use of any such linked website is at
            the user's own risk.
          </p>
        </section>

        <section class="mb-8">
          <h2>7. Modifications to Terms</h2>
          <p>
            Recruiting Compass may revise these Terms at any time. For
            <strong>material changes</strong> — including changes to pricing,
            data practices, arbitration terms, or core Service features — we
            will provide at least 14 days' advance notice via an in-app
            notification and, where feasible, email. Your continued use of the
            Service after the effective date of any change constitutes your
            acceptance of the updated Terms.
          </p>
          <p>
            For minor, non-material changes (such as clarifications or
            formatting updates), the updated Terms are effective immediately upon
            posting.
          </p>
        </section>

        <section class="mb-8">
          <h2>8. Governing Law</h2>
          <p>
            These Terms and Conditions are governed by and construed in
            accordance with the laws of the State of Ohio, United States,
            without regard to conflict of law principles. You irrevocably submit
            to the exclusive jurisdiction of the state and federal courts located
            in Cuyahoga County, Ohio for any matter not subject to arbitration
            under Section 12.
          </p>
        </section>

        <section class="mb-8">
          <h2>9. User Accounts</h2>
          <p>When you create an account on Recruiting Compass, you agree to:</p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the confidentiality of your password</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of unauthorized use of your account</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>10. Prohibited Activities</h2>
          <p>
            You agree not to engage in any of the following prohibited
            activities:
          </p>
          <ul>
            <li>Violating any applicable laws or regulations</li>
            <li>
              Infringing upon intellectual property rights of Recruiting Compass
              or others
            </li>
            <li>Harassing, threatening, or defaming any person or entity</li>
            <li>
              Attempting to gain unauthorized access to the Service or its
              systems
            </li>
            <li>Transmitting viruses or malicious code</li>
            <li>
              Scraping, crawling, or using automated means to extract data from
              the Service
            </li>
            <li>Impersonating any person or entity</li>
            <li>
              Sending unsolicited messages or spam to other users of the Service
            </li>
            <li>
              Using the Service in a manner that violates NCAA amateurism rules,
              applicable recruiting regulations, or any other governing body's
              rules regarding athletic recruiting
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>11. Age Restriction (COPPA)</h2>
          <p>
            <strong
              >The Service is not directed to children under the age of
              13.</strong
            >
            We do not knowingly collect personal information from anyone under
            13. If we discover that a child under 13 has provided personal
            information, we will delete it immediately.
          </p>
          <p>
            If you are a parent or guardian and believe your child under 13 has
            registered for the Service, please contact us immediately at
            <a
              href="mailto:support@therecruitingcompass.com"
              class="text-blue-600 hover:underline"
              >support@therecruitingcompass.com</a
            >.
          </p>
        </section>

        <section class="mb-8">
          <h2>12. Dispute Resolution &amp; Arbitration</h2>
          <p>
            Any dispute, claim, or controversy arising out of or relating to
            these Terms or the Service shall be resolved by binding arbitration
            administered by the American Arbitration Association (AAA) under its
            Consumer Arbitration Rules, rather than in court.
          </p>
          <p>
            <strong
              >Class Action Waiver: You waive your right to participate in any
              class action lawsuit or class-wide arbitration.</strong
            >
            All claims must be brought in your individual capacity, not as a
            plaintiff or class member in any purported class or representative
            proceeding.
          </p>
          <p>
            This arbitration provision does not apply to claims that qualify for
            small claims court. This arbitration provision is governed by the
            Federal Arbitration Act.
          </p>
        </section>

        <section class="mb-8">
          <h2>13. Account Termination</h2>
          <p>
            Recruiting Compass reserves the right to suspend or terminate your
            account and access to the Service at any time, with or without
            notice, for conduct that we believe violates these Terms or is
            harmful to other users, Recruiting Compass, or third parties, or for
            any other reason at our sole discretion.
          </p>
          <p>
            Upon termination, your right to use the Service will immediately
            cease. Your data will be handled in accordance with our
            <NuxtLink to="/legal/privacy" class="text-blue-600 hover:underline"
              >Privacy Policy</NuxtLink
            >
            retention schedule. You may also delete your own account at any time
            through your account settings.
          </p>
        </section>

        <section class="mb-8">
          <h2>14. User Content &amp; Data Ownership</h2>
          <p>
            You retain ownership of all data and content you enter into the
            Service, including schools, coaches, interaction notes, and academic
            information ("User Content"). By using the Service, you grant
            Recruiting Compass a limited, non-exclusive license to store,
            display, and process your User Content solely to provide and improve
            the Service.
          </p>
          <p>
            School, program, and institutional data sourced from the U.S.
            Department of Education College Scorecard API or other third-party
            sources is provided by Recruiting Compass as a reference resource.
            You may not export, redistribute, or commercially exploit this
            third-party data.
          </p>
          <p>
            Recruiting Compass may use aggregated, anonymized, non-personally
            identifiable data derived from Service usage for product improvement,
            analytics, and research.
          </p>
        </section>

        <section class="mb-8">
          <h2>15. Third-Party Data Disclaimer</h2>
          <p>
            School and program information displayed in the Service may be
            sourced from the U.S. Department of Education College Scorecard API
            and other publicly available sources. This data is provided for
            <strong>reference purposes only</strong> and may not reflect current
            institutional policies, admissions requirements, program offerings,
            or other statistics. Recruiting Compass makes no representations
            about the accuracy, completeness, or timeliness of third-party data
            and is not responsible for any decisions made based on it.
          </p>
        </section>

        <section class="mb-8">
          <h2>16. Fit Score Disclaimer</h2>
          <p>
            Recruiting Compass calculates a "Fit Score" as an algorithmic
            estimate to help athletes gauge potential compatibility with schools.
            Fit Scores are based on user-entered data and publicly available
            school information.
          </p>
          <p>
            <strong
              >Fit Scores are not an official assessment, guarantee of
              admission, scholarship offer, or endorsement by any institution or
              athletic program.</strong
            >
            They are a general gauge only and should be used as one of many
            tools in the recruiting process — not as the sole basis for any
            decision.
          </p>
          <p class="text-sm text-slate-500">
            Note: The relationship between Fit Scores and NCAA recruiting rules
            is subject to attorney review.
          </p>
        </section>

        <section class="mb-8">
          <h2>17. Email Communications</h2>
          <p>
            By creating an account, you agree to receive transactional emails
            necessary to operate the Service, including account confirmations,
            password resets, family invitation notifications, and security
            alerts. These transactional emails cannot be opted out of while your
            account is active.
          </p>
          <p>
            You may also receive non-transactional emails such as product
            updates, recruiting tips and educational content, and (when
            applicable) promotional information about paid features. You may opt
            out of non-transactional emails at any time by clicking the
            unsubscribe link in any such email or by updating your preferences
            in your account settings.
          </p>
        </section>

        <section class="mb-8">
          <h2>18. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Recruiting Compass
            and its officers, directors, employees, contractors, and agents from
            and against any and all claims, liabilities, damages, losses, and
            expenses (including reasonable attorneys' fees) arising out of or in
            any way connected with: (a) your access to or use of the Service;
            (b) your violation of these Terms; or (c) your infringement of any
            intellectual property or other rights of any third party.
          </p>
        </section>

        <section class="mb-8">
          <h2>19. Severability &amp; Entire Agreement</h2>
          <p>
            If any provision of these Terms is held to be invalid, illegal, or
            unenforceable, the remaining provisions shall continue in full force
            and effect. These Terms, together with the
            <NuxtLink to="/legal/privacy" class="text-blue-600 hover:underline"
              >Privacy Policy</NuxtLink
            >, constitute the entire agreement between you and Recruiting Compass
            with respect to the Service and supersede all prior agreements and
            understandings.
          </p>
        </section>

        <section class="mb-8">
          <h2>20. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please
            contact us:
          </p>
          <div class="bg-slate-50 p-4 rounded mt-4">
            <p>
              <strong>Recruiting Compass</strong><br />
              <!-- TODO: Replace with registered agent address before public launch -->
              Olmsted Township, OH 44138<br />
              Email:
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
// UPDATE THIS DATE WHENEVER TERMS ARE MODIFIED
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
