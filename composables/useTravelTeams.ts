import type { Ref } from "vue";
import type { PlayerDetails, TravelTeam } from "~/types/models";

/**
 * Seed the multi-row travel_teams list from the legacy single-team scalar fields
 * the first time an athlete opens the new UI (no travel_teams stored yet).
 * Returns [] when the legacy fields are all empty. Pure.
 */
export function buildLegacyTravelTeam(details: PlayerDetails): TravelTeam[] {
  if (
    details.travel_team_year === undefined &&
    !details.travel_team_name &&
    !details.travel_team_coach
  ) {
    return [];
  }
  return [
    {
      year: details.travel_team_year,
      name: details.travel_team_name ?? "",
      coach: details.travel_team_coach ?? "",
    },
  ];
}

/**
 * Travel-team list editing for the player-details form. Adding a blank row does
 * NOT autosave (nothing to persist until the athlete types); removing does.
 * Extracted from usePlayerDetailsForm.
 */
export function useTravelTeams(
  form: Ref<PlayerDetails>,
  triggerSave: () => void,
) {
  const addTravelTeam = (): void => {
    form.value.travel_teams = [
      ...(form.value.travel_teams ?? []),
      { year: undefined, name: "", coach: "" },
    ];
  };

  const removeTravelTeam = (idx: number): void => {
    form.value.travel_teams = (form.value.travel_teams ?? []).filter(
      (_, i) => i !== idx,
    );
    triggerSave();
  };

  return { addTravelTeam, removeTravelTeam };
}
