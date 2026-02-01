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
        <p class="text-slate-600 mb-8">
          <strong>Last Updated:</strong> {{ lastUpdated }}
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
            Permission is granted to temporarily download one copy of the
            materials (information or software) on Recruiting Compass for
            personal, non-commercial transitory viewing only. This is the grant
            of a license, not a transfer of title, and under this license you
            may not:
          </p>
          <ul>
            <li>Modifying or copying the materials</li>
            <li>
              Using the materials for any commercial purpose or for any public
              display
            </li>
            <li>
              Attempting to decompile or reverse engineer any software contained
              on Recruiting Compass
            </li>
            <li>
              Removing any copyright or other proprietary notations from the
              materials
            </li>
            <li>
              Transferring the materials to another person or "mirroring" the
              materials on any other server
            </li>
          </ul>
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
          <h2>4. Limitations</h2>
          <p>
            In no event shall Recruiting Compass or its suppliers be liable for
            any damages (including, without limitation, damages for loss of data
            or profit, or due to business interruption) arising out of the use
            or inability to use the materials on Recruiting Compass, even if
            Recruiting Compass or an authorized representative has been notified
            orally or in writing of the possibility of such damage.
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
          <h2>7. Modifications</h2>
          <p>
            Recruiting Compass may revise these terms of service for the website
            at any time without notice. By using this website, you are agreeing
            to be bound by the then current version of these terms of service.
          </p>
        </section>

        <section class="mb-8">
          <h2>8. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in
            accordance with the laws of the United States, and you irrevocably
            submit to the exclusive jurisdiction of the courts in that location.
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
          </ul>
        </section>

        <section class="mb-8">
          <h2>11. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please
            contact us at support@recruitingcompass.com.
          </p>
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
