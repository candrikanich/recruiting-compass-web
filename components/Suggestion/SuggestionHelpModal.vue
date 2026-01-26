<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="$emit('close')"
    />

    <!-- Modal -->
    <div class="flex items-center justify-center min-h-screen p-4">
      <div
        class="relative bg-white rounded-2xl shadow-lg max-w-2xl w-full"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 class="text-xl font-bold text-slate-900">{{ helpContent.title }}</h2>
          <button
            @click="$emit('close')"
            class="text-slate-500 hover:text-slate-700 transition"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Why It Matters -->
          <section>
            <h3 class="text-lg font-semibold text-slate-900 mb-2">
              Why It Matters
            </h3>
            <p class="text-slate-700 leading-relaxed">
              {{ helpContent.whyItMatters }}
            </p>
          </section>

          <!-- How to Complete -->
          <section>
            <h3 class="text-lg font-semibold text-slate-900 mb-3">
              How to Complete It
            </h3>
            <ul class="space-y-2">
              <li v-for="(step, index) in helpContent.howToComplete" :key="index"
                class="flex gap-3 text-slate-700">
                <span class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  {{ index + 1 }}
                </span>
                <span class="leading-relaxed">{{ step }}</span>
              </li>
            </ul>
          </section>

          <!-- Coaches Expect -->
          <section>
            <h3 class="text-lg font-semibold text-slate-900 mb-3">
              What Coaches Expect
            </h3>
            <ul class="space-y-2">
              <li v-for="(expectation, index) in helpContent.coachesExpect" :key="index"
                class="flex gap-2 text-slate-700">
                <span class="text-blue-600 font-bold">•</span>
                <span class="leading-relaxed">{{ expectation }}</span>
              </li>
            </ul>
          </section>

          <!-- Timeline -->
          <section class="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 class="text-sm font-semibold text-blue-900 mb-1">Timeline</h3>
            <p class="text-sm text-blue-800">{{ helpContent.timeline }}</p>
          </section>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
          >
            Close
          </button>
          <button
            v-if="helpContent.actionLink"
            @click="handleAction"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition',
              urgencyColorClasses,
            ]"
          >
            {{ helpContent.actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface HelpContentItem {
  title: string;
  whyItMatters: string;
  howToComplete: string[];
  coachesExpect: string[];
  timeline: string;
  actionLink?: string;
  actionLabel?: string;
}

interface Props {
  isOpen: boolean;
  ruleType: string;
  urgency?: "low" | "medium" | "high";
}

const props = withDefaults(defineProps<Props>(), {
  urgency: "medium",
});

const emit = defineEmits<{
  close: [];
  action: [];
}>();

const helpContentMap: Record<string, HelpContentItem> = {
  "school-list-building": {
    title: "Build Your Target School List",
    whyItMatters:
      "A comprehensive list of 20-30 target schools ensures you have options and reduces the risk of being left without a scholarship. Coaches also notice when athletes have done their research and have a genuine interest in their program.",
    howToComplete: [
      "Research Division I, II, and III programs that fit your athletic and academic profile",
      "Use academic SAT/ACT standards and athletic rankings as filters",
      "Consider location, team culture, coaching style, and academics",
      "Aim for a balanced list: 5-7 reach schools, 10-15 match schools, 5-8 safety schools",
      "Add each school to your list in the app with priority ratings",
    ],
    coachesExpect: [
      "Evidence that you've researched their program specifically (mention details in emails)",
      "A list that shows self-awareness about academic and athletic fit",
      "Regular updates as you narrow your choices",
    ],
    timeline:
      "Complete by end of sophomore year. Refine throughout junior year.",
  },
  "showcase-attendance": {
    title: "Attend Summer Showcases",
    whyItMatters:
      "Showcases are primary recruiting events where coaches evaluate players in person. Attending 2-3 quality showcases per summer significantly increases your exposure and gives coaches the chance to see you play against top competition.",
    howToComplete: [
      "Research showcase dates and locations for summer (April-August)",
      "Prioritize showcases where your target schools have coaches attending",
      "Register and pay fees early for better placement",
      "Perform well and log the event in your recruiting timeline",
      "Follow up with any coaches you connected with at the showcase",
    ],
    coachesExpect: [
      "Attendance at 2-3 quality showcases per summer minimum",
      "Strong performance against elite competition",
      "Follow-up communication after the showcase",
    ],
    timeline:
      "Plan and attend during summer between sophomore and junior year.",
  },
  "ncaa-registration": {
    title: "Register with NCAA Eligibility Center",
    whyItMatters:
      "NCAA registration is mandatory for Division I and II recruiting. It establishes your official academic transcript with the NCAA and confirms your eligibility. Without it, schools cannot proceed with recruiting or financial aid.",
    howToComplete: [
      "Visit the NCAA Eligibility Center website (ncaa.org/eligibility-center)",
      "Create your account and register as a student-athlete",
      "Request your high school transcript be sent directly to the NCAA",
      "Report your SAT/ACT scores (they'll also receive official scores)",
      "Keep your registration active and updated throughout junior and senior year",
    ],
    coachesExpect: [
      "Registration completed by junior year (ideally early)",
      "Official transcripts on file with the NCAA",
      "Test scores submitted before scholarship offers",
    ],
    timeline:
      "Register during junior year. Begin process early to avoid delays.",
  },
  "formal-outreach": {
    title: "Begin Formal Coach Outreach",
    whyItMatters:
      "Coaches expect consistent communication from interested athletes. Monthly touchpoints keep you on their radar and demonstrate genuine interest. The more they hear from you, the more likely they'll remain engaged in recruiting you.",
    howToComplete: [
      "Identify 10-15 priority schools (A and B tier)",
      "Write a professional recruiting email introducing yourself (one template, personalized for each coach)",
      "Send initial contact emails to coaches with game film link",
      "Log each interaction (email, call, conversation at event) in your timeline",
      "Aim for one touchpoint per month with each priority school",
      "Include updates about recent games, academic progress, or highlights",
    ],
    coachesExpect: [
      "Initial contact with personalized message and film",
      "Regular updates (monthly or every 4-6 weeks minimum)",
      "Respectful, professional communication",
      "Demonstrated knowledge of their program",
    ],
    timeline: "Begin in junior year spring. Maintain through senior year.",
  },
  "official-visit": {
    title: "Schedule Official Visits",
    whyItMatters:
      "Official visits are critical for late-stage recruiting (junior/senior year). They give coaches the chance to evaluate you academically and athletically at their campus, and they give you the chance to assess whether the school is truly a fit. Many scholarship decisions happen during or after official visits.",
    howToComplete: [
      "Identify your top 3-5 schools based on fit and genuine interest",
      "Contact the coach to express interest in visiting",
      "Coordinate visit date (usually includes practice, meeting coaches, campus tour, academics meeting)",
      "Prepare questions about program, expectations, and culture",
      "Log the visit details and any conversations that occur",
      "Send a thank-you note to coaches after the visit",
    ],
    coachesExpect: [
      "Genuine interest in the program (not just free trip)",
      "Preparation and thoughtful questions",
      "Follow-up communication and feedback after visit",
      "Commitment timeline (if asked)",
    ],
    timeline:
      "Schedule during junior or senior year. Plan 2-3 visits per year.",
  },
  "missing-video": {
    title: "Create a Highlight Video",
    whyItMatters:
      "A highlight video is your #1 recruiting tool. Coaches use video to evaluate your skills, athleticism, and football intelligence. Without film, you severely limit your recruiting opportunities even if scouts see you in person.",
    howToComplete: [
      "Compile 30-40 plays showcasing your best performances",
      "Include game film (not just highlights) to show consistency",
      "Add title card with your name, position, grade, and contact info",
      "Include both good and neutral plays (coaches want reality, not just highlights)",
      "Upload to YouTube, Vimeo, or dedicated recruiting platforms",
      "Update video annually with new highlights",
    ],
    coachesExpect: [
      "Clean, well-edited video that's easy to watch",
      "Consistent performance across multiple plays",
      "Updated film each year",
    ],
    timeline:
      "Complete by sophomore year. Update annually or after major competitions.",
  },
  "interaction-gap": {
    title: "Stay in Touch with Priority Schools",
    whyItMatters:
      "Out of sight, out of mind. Priority coaches have many athletes competing for their attention. Regular contact keeps you visible and shows coaches you're genuinely interested. Coaches notice athletes who maintain consistent communication.",
    howToComplete: [
      "Identify which priority schools you haven't contacted in 3+ weeks",
      "Send an email update (game results, recent accomplishments, or just a check-in)",
      "Consider a phone call if you have a direct coach's number",
      "Attend their camps or showcases to connect in person",
      "Log each interaction in your timeline with the date",
    ],
    coachesExpect: [
      "Consistent communication every 3-4 weeks minimum",
      "Personalized messages (not mass emails)",
      "Genuine updates about your season and progress",
    ],
    timeline: "Maintain throughout junior and senior recruiting season.",
  },
  "portfolio-health": {
    title: "Balance Your School Portfolio",
    whyItMatters:
      "A healthy portfolio has mix of reach, match, and safety schools. Too many reach schools and you might go without an offer. Too many safety schools and you might miss great opportunities. Balance increases your odds of landing at the right fit.",
    howToComplete: [
      "Review your current school list and categorize by fit level (reach/match/safety)",
      "Add more reach schools if you're underweighting them",
      "Add more safety schools if you have mostly reach/match schools",
      "Target: 5-7 reach, 10-15 match, 5-8 safety schools",
      "Reassess monthly as your athletic profile evolves",
    ],
    coachesExpect: [
      "Realistic assessment of fit from athlete",
      "Genuine interest across the list, not just top-tier schools",
    ],
    timeline: "Build portfolio by end of sophomore year. Refine in junior year.",
  },
};

const helpContent = computed(
  (): HelpContentItem =>
    helpContentMap[props.ruleType] || {
      title: "Learn More",
      whyItMatters:
        "This action is important for your recruiting success. Follow the steps below to make progress.",
      howToComplete: ["Focus on the suggested action above."],
      coachesExpect: ["Demonstrated effort and commitment to recruiting."],
      timeline: "Start as soon as possible.",
    },
);

const urgencyColorClasses = computed(() => {
  switch (props.urgency) {
    case "high":
      return "bg-red-600 text-white hover:bg-red-700";
    case "medium":
      return "bg-orange-600 text-white hover:bg-orange-700";
    case "low":
      return "bg-blue-600 text-white hover:bg-blue-700";
    default:
      return "bg-slate-600 text-white hover:bg-slate-700";
  }
});

function handleAction() {
  emit("action");
  emit("close");
}
</script>
