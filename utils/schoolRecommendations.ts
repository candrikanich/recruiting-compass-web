import type { SchoolRecommendation } from "~/types/schoolRecommendations";
import type { NcaaCatalogSchool, NcaaDivision } from "~/utils/ncaaDatabase";
import { isAdjacentState } from "~/utils/usStateAdjacency";

export const DEFAULT_RECOMMENDATION_LIMIT = 8;
const MAX_PER_CONFERENCE = 2;
const MAX_PER_STATE = 4;

export type GpaBucket = "high" | "mid" | "low" | "unknown";

export function catalogKeyFor(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function gpaBucket(gpa: number | null): GpaBucket {
  if (gpa == null || Number.isNaN(gpa)) return "unknown";
  if (gpa >= 3.5) return "high";
  if (gpa >= 3.0) return "mid";
  return "low";
}

export function divisionWeights(
  gpa: number | null,
): Record<NcaaDivision, number> {
  const bucket = gpaBucket(gpa);
  switch (bucket) {
    case "high":
      return { D1: 1, D2: 0.55, D3: 0.35 };
    case "mid":
      return { D1: 0.75, D2: 1, D3: 0.7 };
    case "low":
      return { D1: 0.35, D2: 0.85, D3: 1 };
    case "unknown":
      return { D1: 0.85, D2: 0.75, D3: 0.65 };
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}

export function resolveHomeState(input: {
  locationState?: string | null;
  schoolState?: string | null;
  hometownState?: string | null;
}): string | null {
  const candidates = [
    input.locationState,
    input.schoolState,
    input.hometownState,
  ];
  for (const raw of candidates) {
    const state = raw?.trim().toUpperCase() ?? "";
    if (state.length === 2) return state;
  }
  return null;
}

export interface RankSchoolRecommendationsInput {
  catalog: NcaaCatalogSchool[];
  homeState: string | null;
  gpa: number | null;
  excludedKeys: ReadonlySet<string>;
  limit?: number;
  /** Filter to schools that sponsor this sport. Requires `programsBySport`. */
  sport?: string | null;
  gender?: "male" | "female" | null;
  /** catalogKey -> sports sponsored. Omit to skip sport filtering entirely. */
  programsBySport?: ReadonlyMap<string, ReadonlySet<string>>;
}

function scoreSchool(
  school: NcaaCatalogSchool,
  homeState: string | null,
  weights: Record<NcaaDivision, number>,
  bucket: GpaBucket,
): { score: number; reasons: string[] } {
  let score = Math.round(weights[school.division] * 20);
  const reasons: string[] = [];

  if (homeState && school.state === homeState) {
    score += 50;
    reasons.push(`In ${homeState}`);
  } else if (isAdjacentState(homeState, school.state)) {
    score += 22;
    reasons.push("Near home");
  }

  if (bucket === "high" && school.division === "D1") {
    reasons.push("Matches academic range");
  } else if (bucket === "low" && school.division !== "D1") {
    reasons.push("Reachable division");
  }

  return { score, reasons: reasons.slice(0, 2) };
}

function toRecommendation(
  school: NcaaCatalogSchool,
  score: number,
  reasons: string[],
): SchoolRecommendation {
  return {
    catalogKey: catalogKeyFor(school.name),
    name: school.name,
    division: school.division,
    conference: school.conference,
    state: school.state,
    website: school.website,
    athleticsUrl: school.athleticWebsite,
    score,
    reasons,
  };
}

/**
 * Rank a college catalog for one athlete. Pure — no I/O.
 * Geography is the primary signal; GPA only tilts division mix.
 * Conference and state caps keep the empty-state grid from collapsing
 * into one conference or one state.
 */
export function rankSchoolRecommendations(
  input: RankSchoolRecommendationsInput,
): SchoolRecommendation[] {
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_RECOMMENDATION_LIMIT, 1),
    12,
  );
  const weights = divisionWeights(input.gpa);
  const bucket = gpaBucket(input.gpa);

  const sportFilter =
    input.sport && input.programsBySport ? input.sport : null;

  const scored: SchoolRecommendation[] = [];
  for (const school of input.catalog) {
    const key = catalogKeyFor(school.name);
    if (!key || input.excludedKeys.has(key)) continue;
    if (sportFilter && !input.programsBySport!.get(key)?.has(sportFilter)) {
      continue;
    }
    const { score, reasons } = scoreSchool(
      school,
      input.homeState,
      weights,
      bucket,
    );
    scored.push(toRecommendation(school, score, reasons));
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const picked: SchoolRecommendation[] = [];
  const pickedKeys = new Set<string>();
  const conferenceCount = new Map<string, number>();
  const stateCount = new Map<string, number>();

  const tryPick = (row: SchoolRecommendation, enforceCaps: boolean): void => {
    if (picked.length >= limit || pickedKeys.has(row.catalogKey)) return;
    const conference = row.conference ?? "";
    const state = row.state ?? "";
    if (enforceCaps) {
      if (
        conference &&
        (conferenceCount.get(conference) ?? 0) >= MAX_PER_CONFERENCE
      ) {
        return;
      }
      if (state && (stateCount.get(state) ?? 0) >= MAX_PER_STATE) {
        return;
      }
    }
    picked.push(row);
    pickedKeys.add(row.catalogKey);
    if (conference) {
      conferenceCount.set(
        conference,
        (conferenceCount.get(conference) ?? 0) + 1,
      );
    }
    if (state) {
      stateCount.set(state, (stateCount.get(state) ?? 0) + 1);
    }
  };

  for (const row of scored) tryPick(row, true);
  if (picked.length < limit) {
    for (const row of scored) tryPick(row, false);
  }

  return picked;
}

export function recommendationToSchoolDraft(rec: SchoolRecommendation): {
  name: string;
  location: string;
  state: string | null;
  division: "D1" | "D2" | "D3";
  conference: string | undefined;
  website: string | undefined;
  athletics_url: string | undefined;
  status: "researching";
  is_favorite: boolean;
  pros: string[];
  cons: string[];
  favicon_url: null;
  user_id: string;
} {
  return {
    name: rec.name,
    location: rec.state ?? "",
    state: rec.state,
    division: rec.division,
    conference: rec.conference ?? undefined,
    website: rec.website ?? undefined,
    athletics_url: rec.athleticsUrl ?? undefined,
    status: "researching",
    is_favorite: false,
    pros: [],
    cons: [],
    favicon_url: null,
    user_id: "",
  };
}
