// composables/useGraduationYearOptions.ts
//
// Reactive wrapper over utils/graduationYears.ts's getGraduationYearOptions().
// A plain `computed(() => getGraduationYearOptions())` has no reactive
// dependency on the clock, so a signup/onboarding form left open across the
// July 1 UTC pivot keeps offering the now-stale just-graduated year until the
// page reloads. Rechecking hourly is cheap and more than tight enough to
// catch a once-a-year midnight boundary within the hour it happens.
import { ref, computed, onMounted, onUnmounted } from "vue";
import { getGraduationYearOptions } from "~/utils/graduationYears";

const RECHECK_INTERVAL_MS = 60 * 60 * 1000;

export function useGraduationYearOptions() {
  const now = ref(new Date());
  let timer: ReturnType<typeof setInterval> | undefined;

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date();
    }, RECHECK_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  const graduationYears = computed(() => getGraduationYearOptions(now.value));

  return { graduationYears };
}
