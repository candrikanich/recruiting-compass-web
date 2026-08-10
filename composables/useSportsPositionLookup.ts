// composables/useSportsPositionLookup.ts
//
// Thin wrapper over the canonical position source (utils/positions/canonical).
// Kept as a composable so existing call sites (usePlayerDetailsForm) don't
// change, but the vocabulary is now the single canonical full-name set shared
// with onboarding — no more abbreviations, no coarse "Infielder"/"Outfielder".
import {
  SPORT_POSITIONS,
  getCanonicalPositions,
} from "~/utils/positions/canonical";

export const useSportsPositionLookup = () => {
  const commonSports = Object.keys(SPORT_POSITIONS);

  const getPositionsBySport = (sport: string): string[] =>
    getCanonicalPositions(sport);

  return {
    commonSports,
    getPositionsBySport,
  };
};
