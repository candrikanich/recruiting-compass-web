import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "~/types/database";
import type {
  SchoolRecommendation,
  SchoolRecommendationSignals,
} from "~/types/schoolRecommendations";
import { getCatalogSchools } from "~/utils/ncaaDatabase";
import {
  catalogKeyFor,
  DEFAULT_RECOMMENDATION_LIMIT,
  rankSchoolRecommendations,
  resolveHomeState,
} from "~/utils/schoolRecommendations";

export interface AssembledSchoolRecommendations {
  recommendations: SchoolRecommendation[];
  signals: SchoolRecommendationSignals;
}

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function loadFamilyUnitId(
  supabase: SupabaseClient<Database>,
  athleteId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", athleteId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.family_unit_id ?? null;
}

export async function assembleSchoolRecommendations(
  supabase: SupabaseClient<Database>,
  athleteId: string,
  limit: number = DEFAULT_RECOMMENDATION_LIMIT,
): Promise<AssembledSchoolRecommendations> {
  const [familyUnitId, prefsResult, userResult] = await Promise.all([
    loadFamilyUnitId(supabase, athleteId),
    supabase
      .from("user_preferences")
      .select("category, data")
      .eq("user_id", athleteId)
      .in("category", ["player", "location"]),
    supabase
      .from("users")
      .select("hometown_state")
      .eq("id", athleteId)
      .maybeSingle(),
  ]);

  if (prefsResult.error) throw prefsResult.error;
  if (userResult.error) throw userResult.error;

  let trackedNames: string[] = [];
  let dismissedKeys: string[] = [];

  if (familyUnitId) {
    const [schoolsResult, dismissalsResult] = await Promise.all([
      supabase
        .from("schools")
        .select("name")
        .eq("family_unit_id", familyUnitId)
        .limit(200),
      supabase
        .from("school_recommendation_dismissals")
        .select("catalog_key")
        .eq("family_unit_id", familyUnitId)
        .eq("athlete_user_id", athleteId)
        .limit(200),
    ]);
    if (schoolsResult.error) throw schoolsResult.error;
    if (dismissalsResult.error) throw dismissalsResult.error;
    trackedNames = (schoolsResult.data ?? []).map((row) => row.name);
    dismissedKeys = (dismissalsResult.data ?? []).map((row) => row.catalog_key);
  }

  const prefsByCategory = new Map(
    (prefsResult.data ?? []).map((row) => [row.category, asRecord(row.data)]),
  );
  const player = prefsByCategory.get("player") ?? {};
  const location = prefsByCategory.get("location") ?? {};

  const homeState = resolveHomeState({
    locationState: asString(location.state),
    schoolState: asString(player.school_state),
    hometownState: userResult.data?.hometown_state,
  });
  const gpa = asNumber(player.gpa);

  const excludedKeys = new Set<string>([
    ...trackedNames.map(catalogKeyFor),
    ...dismissedKeys.map((key) => catalogKeyFor(key)),
  ]);

  const recommendations = rankSchoolRecommendations({
    catalog: getCatalogSchools(),
    homeState,
    gpa,
    excludedKeys,
    limit,
  });

  return {
    recommendations,
    signals: {
      homeState,
      gpa,
      excludedCount: excludedKeys.size,
    },
  };
}
