/**
 * useFitScore Composable
 * Calculates and caches independent fit signals for schools.
 * Replaces the old composite score with PersonalFitAnalysis + AcademicFitAnalysis.
 */

import { shallowRef, computed } from "vue";
import {
  calculatePersonalFitSignals,
  calculateAcademicFitSignals,
} from "~/utils/fitScoreCalculation";
import type {
  SchoolFitSignals,
  SchoolAcademicInfo,
  AthleteProfileForFit,
} from "~/types/schoolFit";

export function useFitScore() {
  const cache = shallowRef<Map<string, SchoolFitSignals>>(new Map());

  function calculateSignals(
    schoolId: string,
    athlete: AthleteProfileForFit,
    schoolInfo: SchoolAcademicInfo,
  ): SchoolFitSignals {
    const cached = cache.value.get(schoolId);
    if (cached) return cached;

    const personalFit = calculatePersonalFitSignals(athlete, schoolInfo);
    const academicFit = calculateAcademicFitSignals(athlete, schoolInfo);
    const signals: SchoolFitSignals = { personalFit, academicFit };

    const newMap = new Map(cache.value);
    newMap.set(schoolId, signals);
    cache.value = newMap;

    return signals;
  }

  function invalidate(schoolId: string): void {
    const newMap = new Map(cache.value);
    newMap.delete(schoolId);
    cache.value = newMap;
  }

  function clearCache(): void {
    cache.value = new Map();
  }

  return {
    calculateSignals,
    invalidate,
    clearCache,
    cache: computed(() => cache.value),
  };
}
