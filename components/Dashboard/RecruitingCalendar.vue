<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 shadow-md"
        >
          <span class="text-lg">📆</span>
        </div>
        <h2 class="font-semibold text-slate-900">Recruiting Calendar</h2>
      </div>
      <div class="text-sm text-slate-600">Class of {{ graduationYear }}</div>
    </div>

    <!-- L6b: staleness banner — only when `now` is past the season this
         dataset covers and no newer season data has been added. -->
    <div
      v-if="isStale"
      data-testid="calendar-staleness-banner"
      class="rounded-xl p-3 mb-4 bg-amber-50 border border-amber-200 text-sm text-amber-900"
    >
      This calendar may be out of date — verify with your compliance office.
    </div>

    <!-- L6a: compliance disclaimer — cites the exact NCAA PDF this data was
         transcribed from and when it was last verified against it. -->
    <p data-testid="calendar-disclaimer" class="text-xs text-slate-500 mb-4">
      Based on NCAA {{ SEASON }}, verified {{ resolvedCalendar.verifiedOn }} —
      confirm with your compliance office.
      <a
        :href="resolvedCalendar.source"
        target="_blank"
        rel="noopener"
        class="text-blue-600 hover:text-blue-700 underline"
      >
        View official calendar
      </a>
    </p>

    <!-- Self-select toggle: gender-split sports / Football subdivision, only
         shown when the stored profile doesn't already resolve one. -->
    <div v-if="showGenderToggle" class="flex items-center gap-2 mb-4">
      <span class="text-xs font-medium text-slate-500">Calendar:</span>
      <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
        <button
          type="button"
          data-testid="gender-toggle-men"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            genderOverride === 'male'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ]"
          @click="genderOverride = 'male'"
        >
          Men's
        </button>
        <button
          type="button"
          data-testid="gender-toggle-women"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            genderOverride === 'female'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ]"
          @click="genderOverride = 'female'"
        >
          Women's
        </button>
      </div>
    </div>

    <div v-if="showSubdivisionToggle" class="flex items-center gap-2 mb-4">
      <span class="text-xs font-medium text-slate-500">Calendar:</span>
      <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
        <button
          type="button"
          data-testid="subdivision-toggle-fbs"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            subdivisionOverride === 'FBS'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ]"
          @click="subdivisionOverride = 'FBS'"
        >
          FBS
        </button>
        <button
          type="button"
          data-testid="subdivision-toggle-fcs"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            subdivisionOverride === 'FCS'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ]"
          @click="subdivisionOverride = 'FCS'"
        >
          FCS
        </button>
      </div>
    </div>

    <!-- Current Period Highlight -->
    <div
      v-if="currentPeriod"
      class="mb-6 rounded-xl border border-blue-200 bg-linear-to-r from-blue-100 to-indigo-100 p-4"
    >
      <div class="mb-2 flex items-center gap-3">
        <div class="h-3 w-3 animate-pulse rounded-full bg-blue-500" />
        <span class="font-semibold text-blue-900">Current Period</span>
      </div>
      <p class="text-lg font-bold text-slate-900">{{ currentPeriod.name }}</p>
      <p class="mt-1 text-sm text-slate-700">{{ currentPeriod.description }}</p>
    </div>

    <!-- Next Key Dates -->
    <div class="space-y-3">
      <div
        v-for="date in upcomingDates"
        :key="date.id"
        :class="[
          'flex items-center justify-between rounded-xl border-2 p-3 transition-all',
          date.isUrgent
            ? 'border-red-200 bg-red-50 hover:border-red-300'
            : 'border-slate-200 bg-white hover:border-blue-300',
        ]"
      >
        <div class="flex items-center gap-3">
          <span class="text-xl">{{ date.emoji }}</span>
          <div>
            <p class="text-sm font-medium text-slate-900">{{ date.name }}</p>
            <p class="text-xs text-slate-600">{{ date.description }}</p>
          </div>
        </div>
        <div class="text-right">
          <p
            :class="[
              'text-sm font-semibold',
              date.isUrgent ? 'text-red-600' : 'text-blue-600',
            ]"
          >
            {{ date.countdown }}
          </p>
          <p class="text-xs text-slate-500">{{ formatDate(date.date) }}</p>
        </div>
      </div>

      <div
        v-if="upcomingDates.length === 0"
        class="text-sm text-slate-500 py-4 text-center"
      >
        No upcoming dates for this sport's calendar.
      </div>
    </div>

    <!-- Division Rules Summary -->
    <div class="mt-6 border-t border-slate-200 pt-4">
      <details class="text-sm">
        <summary
          class="cursor-pointer font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          NCAA Division Rules Quick Reference
        </summary>
        <div class="mt-3 space-y-3 text-xs">
          <div class="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p class="font-semibold text-blue-900">Division I</p>
            <p class="text-slate-700 mt-1">
              Contact windows vary by sport — see the current period above for
              this athlete's calendar.
            </p>
          </div>
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p class="font-semibold text-emerald-900">Division II</p>
            <p class="mt-1 text-slate-700">
              Contact begins June 15 after sophomore year. More flexibility with
              unofficial visits.
            </p>
          </div>
          <div class="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <p class="font-semibold text-purple-900">Division III</p>
            <p class="mt-1 text-slate-700">
              No recruiting calendar restrictions. Coaches can contact at any
              time.
            </p>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  getSportCalendar,
  getUpcomingMilestones,
  GENDER_SPLIT_SPORTS,
  NO_SPORT_FALLBACK,
  SEASON,
  SEASON_END,
  type AppSport,
  type Division,
  type RecruitingPeriod,
} from "~/utils/recruitingCalendar";
import { getMilestoneTypeIcon } from "~/utils/ncaaRecruitingCalendar";
import { parseLocalDateOnly, exclusiveEndOfDay } from "~/utils/localDate";

interface Props {
  graduationYear?: number;
  sport?: AppSport;
  gender?: string | null;
  division?: Division;
  footballSubdivision?: "FBS" | "FCS";
  /** Injectable "now" for the staleness check (L6b) — defaults to real now. */
  now?: Date;
}

const props = withDefaults(defineProps<Props>(), {
  graduationYear: 2028,
  sport: NO_SPORT_FALLBACK,
  gender: null,
  division: "D1",
  footballSubdivision: "FBS",
  now: () => new Date(),
});

// L6a/L6b: `SEASON`/`SEASON_END` (from `~/utils/recruitingCalendar`) name the
// NCAA calendar dataset this component reads (see
// utils/recruitingCalendar/calendarData.ts `VERIFIED_ON`/`BUCKET`) and the
// date it stops being current.

const NEUTRAL_GENDERS = new Set(["other", "prefer_not_to_say", null, undefined]);

const genderOverride = ref<"male" | "female">("male");
const subdivisionOverride = ref<"FBS" | "FCS">("FBS");

const showGenderToggle = computed(
  () => props.sport in GENDER_SPLIT_SPORTS && NEUTRAL_GENDERS.has(props.gender),
);
const showSubdivisionToggle = computed(() => props.sport === "Football");

const effectiveGender = computed<string | null>(() =>
  showGenderToggle.value ? genderOverride.value : props.gender,
);
const effectiveFootballSubdivision = computed(() =>
  showSubdivisionToggle.value ? subdivisionOverride.value : props.footballSubdivision,
);

const resolverOpts = computed(() => ({
  gender: effectiveGender.value,
  footballSubdivision: effectiveFootballSubdivision.value,
}));

const today = new Date();
today.setHours(0, 0, 0, 0);

interface RecruitingDate {
  id: string;
  name: string;
  description: string;
  date: Date;
  emoji: string;
  countdown: string;
  isUrgent: boolean;
}

interface CurrentPeriodDisplay {
  name: string;
  description: string;
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  dead: "Dead Period",
  recruiting_shutdown: "Recruiting Shutdown",
  quiet: "Quiet Period",
  contact: "Contact Period",
  evaluation: "Evaluation Period",
};

const getCountdown = (date: Date): string => {
  const diff = date.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days} days`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
  if (days <= 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
};

const isWithin30Days = (date: Date): boolean => {
  const diff = date.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 30;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Next key dates: this sport's own resolved SportCalendar milestones plus the
// still-generic SAT/ACT/NCAA/NAIA/application deadlines, sport/division-scoped.
const upcomingDates = computed<RecruitingDate[]>(() => {
  const milestones = getUpcomingMilestones({
    sport: props.sport,
    division: props.division,
    graduationYear: props.graduationYear,
    limit: 5,
    opts: resolverOpts.value,
    currentDate: today,
  });

  return milestones.map((m) => {
    const date = parseLocalDateOnly(m.date);
    return {
      id: `${m.date}-${m.title}`,
      name: m.title,
      description: m.description ?? "",
      date,
      emoji: getMilestoneTypeIcon(m.type),
      countdown: getCountdown(date),
      isUrgent: isWithin30Days(date),
    };
  });
});

// The resolved SportCalendar this sport/division/gender/subdivision
// combination reads from — shared by the current-period lookup and the L6a
// disclaimer (source PDF + verifiedOn).
const resolvedCalendar = computed(() =>
  getSportCalendar(props.sport, props.division, resolverOpts.value),
);

// L6b: stale once `now` is past the season this dataset covers. There is
// currently only one dataset (2026-27), so "no newer data exists" always
// holds — revisit this check if/when a second season's data is added.
const isStale = computed(() => props.now.getTime() > SEASON_END.getTime());

// Severity rank for picking which period to display when today falls inside
// MULTIPLE overlapping windows (the data lists broad periods before their
// nested carve-outs — e.g. a Dead or Recruiting Shutdown day nested inside a
// wider Contact/Quiet window). Always surface the MOST restrictive match —
// showing a less-restrictive enclosing period on a dead/shutdown day would
// wrongly tell the athlete contact is OK. This ranking is display-only; the
// enforcement path (isDeadPeriod/getDeadPeriodMessage in resolver.ts) is
// already order-independent via BLOCKING_TYPES and must not change.
const PERIOD_SEVERITY: Record<RecruitingPeriod["type"], number> = {
  recruiting_shutdown: 5,
  dead: 4,
  evaluation: 3,
  quiet: 2,
  contact: 1,
};

const periodSpanDays = (p: RecruitingPeriod): number =>
  (parseLocalDateOnly(p.end).getTime() - parseLocalDateOnly(p.start).getTime()) / (1000 * 60 * 60 * 24);

// Current period: the MOST RESTRICTIVE of this sport's resolved calendar
// periods covering today, if any (see PERIOD_SEVERITY above); ties broken by
// shortest span.
const currentPeriod = computed<CurrentPeriodDisplay | null>(() => {
  const matches = resolvedCalendar.value.periods.filter(
    (p) => today >= parseLocalDateOnly(p.start) && today < exclusiveEndOfDay(p.end),
  );
  if (matches.length === 0) return null;

  const period = matches.reduce((best, candidate) => {
    const bestSeverity = PERIOD_SEVERITY[best.type] ?? 0;
    const candidateSeverity = PERIOD_SEVERITY[candidate.type] ?? 0;
    if (candidateSeverity !== bestSeverity) {
      return candidateSeverity > bestSeverity ? candidate : best;
    }
    return periodSpanDays(candidate) < periodSpanDays(best) ? candidate : best;
  });

  return {
    name: PERIOD_TYPE_LABELS[period.type] ?? period.type,
    description: period.description,
  };
});
</script>
