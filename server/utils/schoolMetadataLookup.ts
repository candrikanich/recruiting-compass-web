import ncaaSchoolsData from "~/data/ncaaSchools.json";
import schoolMetadataData from "~/data/schoolMetadata.json";
import conferenceUrlsData from "~/data/conferenceUrls.json";

/**
 * Static-JSON school enrichment lookup (issue #580 — Wikidata dropped per spike #576,
 * 2.4% mascot coverage). No network calls, no cache invalidation to manage.
 */
export interface SchoolMetadataResult {
  mascot: string | null;
  athleticsUrl: string | null;
  colors: string[] | null;
  conferenceUrl: string | null;
}

interface NcaaSchoolEntry {
  name: string;
  conference?: string | null;
  athleticWebsite?: string | null;
}

interface SeedMetadataEntry {
  mascot?: string | null;
  athleticsUrl?: string | null;
  colors?: string[] | null;
  conferenceUrl?: string | null;
}

/**
 * conferenceUrls.json is keyed by conference short-name/brand (e.g. "SEC", "Big Ten"),
 * ncaaSchools.json's `conference` field uses each division's full registered name
 * (e.g. "Southeastern Conference"). Renames (Colonial -> Coastal Athletic Association)
 * and abbreviation mismatches don't survive generic normalization, so map explicitly.
 */
const CONFERENCE_ALIASES: Record<string, string> = {
  "Big Ten Conference": "Big Ten",
  "Southeastern Conference": "SEC",
  "Atlantic Coast Conference": "ACC",
  "Big 12 Conference": "Big 12",
  "Pac-12 Conference": "Pac-12",
  "American Conference": "American Athletic Conference",
  "Mountain West Conference": "Mountain West",
  "Atlantic 10 Conference": "Atlantic 10",
  "Mid-Eastern Athletic Conf.": "MEAC",
  "Southwestern Athletic Conf.": "SWAC",
  "The Ivy League": "Ivy League",
  "The Summit League": "Summit League",
  "Atlantic Sun Conference": "ASUN Conference",
  "Coastal Athletic Association": "Colonial Athletic Association",
};

/** Handles "University of X" vs "X University" and punctuation/whitespace noise. */
function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/^university of\s+/, "")
    .replace(/\s+university$/, "")
    .replace(/^college of\s+/, "")
    .replace(/\s+college$/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyNamesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // Substring containment only counts for names of comparable length — otherwise a short
  // generic word (e.g. "pennsylvania") spuriously anchors an unrelated long compound name.
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  if (shorter > 8 && shorter / longer >= 0.6 && (a.includes(b) || b.includes(a))) return true;
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff <= 3) {
    const maxDistance = Math.max(a.length, b.length) > 6 ? 2 : 1;
    if (levenshteinDistance(a, b) <= maxDistance) return true;
  }
  return false;
}

function findByNormalizedName<T>(normalized: string, index: Map<string, T>): T | undefined {
  const exact = index.get(normalized);
  if (exact) return exact;
  for (const [key, value] of index) {
    if (fuzzyNamesMatch(normalized, key)) return value;
  }
  return undefined;
}

// Lazy-loaded, module-level cache — built once per server process.
let ncaaByNormalizedName: Map<string, NcaaSchoolEntry> | null = null;
let metadataByNormalizedName: Map<string, SeedMetadataEntry> | null = null;

function loadCaches(): void {
  if (ncaaByNormalizedName && metadataByNormalizedName) return;

  ncaaByNormalizedName = new Map();
  const divisions = ncaaSchoolsData as Record<string, NcaaSchoolEntry[]>;
  for (const entries of Object.values(divisions)) {
    for (const entry of entries) {
      ncaaByNormalizedName.set(normalizeSchoolName(entry.name), entry);
    }
  }

  metadataByNormalizedName = new Map();
  for (const [name, entry] of Object.entries(schoolMetadataData as Record<string, SeedMetadataEntry>)) {
    metadataByNormalizedName.set(normalizeSchoolName(name), entry);
  }
}

function normalizeUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function resolveConferenceUrl(conference: string | null | undefined): string | null {
  if (!conference) return null;
  const conferenceUrls = conferenceUrlsData as Record<string, string>;
  const key = conferenceUrls[conference] ? conference : CONFERENCE_ALIASES[conference];
  return (key && conferenceUrls[key]) ?? null;
}

const EMPTY_RESULT: SchoolMetadataResult = {
  mascot: null,
  athleticsUrl: null,
  colors: null,
  conferenceUrl: null,
};

/**
 * Static-JSON school metadata lookup. Never throws — unfound fields are null.
 * Resolution: schoolMetadata.json (mascot/colors/athleticsUrl) merged with
 * ncaaSchools.json (athleticWebsite fallback, conference -> conferenceUrls.json).
 */
export function lookupSchoolMetadata(schoolName: string): SchoolMetadataResult {
  try {
    if (!schoolName?.trim()) return EMPTY_RESULT;

    loadCaches();
    const normalized = normalizeSchoolName(schoolName);
    const metadata = findByNormalizedName(normalized, metadataByNormalizedName!);
    const ncaa = findByNormalizedName(normalized, ncaaByNormalizedName!);

    return {
      mascot: metadata?.mascot ?? null,
      athleticsUrl: normalizeUrl(metadata?.athleticsUrl) ?? normalizeUrl(ncaa?.athleticWebsite),
      colors: metadata?.colors ?? null,
      conferenceUrl: metadata?.conferenceUrl ?? resolveConferenceUrl(ncaa?.conference),
    };
  } catch {
    return EMPTY_RESULT;
  }
}
