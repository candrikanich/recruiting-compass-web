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
        class="bg-white rounded-lg shadow-sm p-8 prose prose-slate max-w-none"
      >
        <p class="text-slate-600 mb-8">
          <strong>Last Updated:</strong> {{ lastUpdated }}
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
            Please read this privacy policy carefully. If you do not agree with
            our policies and practices, please do not use our Service.
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
              password, phone number, and role (parent or student athlete)
            </li>
            <li>
              <strong>Profile Information:</strong> Profile photo, biographical
              information, preferences, and school-related data
            </li>
            <li>
              <strong>Communication Data:</strong> Messages, notes, and
              communications you create or store within the Service
            </li>
            <li>
              <strong>Preference Data:</strong> School preferences, location
              preferences, and other customization settings
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
              to enhance your experience
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for various purposes:</p>
          <ul>
            <li>To create and maintain your account</li>
            <li>To provide, maintain, and improve the Service</li>
            <li>To send administrative information and updates</li>
            <li>To respond to your inquiries and requests</li>
            <li>To analyze usage patterns and improve our offerings</li>
            <li>To comply with legal obligations</li>
            <li>To prevent fraud and enhance security</li>
            <li>To send marketing communications (with your consent)</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>4. Sharing Your Information</h2>
          <p>
            We do not sell, trade, or rent your personal information to third
            parties. We may share information in the following circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> Third-party vendors who assist
              in operating our Service, subject to confidentiality agreements
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law, court
              order, or government request
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger,
              acquisition, or sale of assets
            </li>
            <li>
              <strong>With Your Consent:</strong> When you explicitly authorize
              us to share your information
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect your personal information against unauthorized access,
            alteration, disclosure, or destruction. However, no method of
            transmission over the Internet or electronic storage is completely
            secure. We cannot guarantee absolute security of your information.
          </p>
        </section>

        <section class="mb-8">
          <h2>6. Retention of Information</h2>
          <p>
            We retain your personal information for as long as necessary to
            provide the Service and fulfill the purposes outlined in this
            Privacy Policy. You may request deletion of your account and
            associated data at any time, subject to legal retention
            requirements.
          </p>
        </section>

        <section class="mb-8">
          <h2>7. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate or incomplete information</li>
            <li>Request deletion of your information</li>
            <li>Opt-out of certain data processing activities</li>
            <li>Request a portable copy of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p class="mt-4">
            To exercise these rights, please contact us at
            privacy@recruitingcompass.com.
          </p>
        </section>

        <section class="mb-8">
          <h2>8. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to enhance your
            experience. Most web browsers allow you to control cookies through
            their settings. Disabling cookies may affect the functionality of
            our Service.
          </p>
        </section>

        <section class="mb-8">
          <h2>9. Third-Party Links</h2>
          <p>
            Our Service may contain links to third-party websites. We are not
            responsible for the privacy practices of those sites. We encourage
            you to review the privacy policies of any third-party sites before
            providing your information.
          </p>
        </section>

        <section class="mb-8">
          <h2>10. Children's Privacy</h2>
          <p>
            Our Service is not intended for children under the age of 13. We do
            not knowingly collect personal information from children under 13.
            If we become aware that we have collected information from a child
            under 13, we will take steps to delete such information promptly.
          </p>
        </section>

        <section class="mb-8">
          <h2>11. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or for other operational, legal, or
            regulatory reasons. We will notify you of material changes by
            updating the "Last Updated" date and, in some cases, by providing
            additional notice.
          </p>
        </section>

        <section class="mb-8">
          <h2>12. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy
            practices, please contact us at:
          </p>
          <div class="bg-slate-50 p-4 rounded mt-4">
            <p>
              <strong>Recruiting Compass</strong><br />
              Email: privacy@recruitingcompass.com<br />
              Support: support@recruitingcompass.com
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
import { ref } from "vue";

const lastUpdated = ref(
  new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);
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
</style>
