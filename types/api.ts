/**
 * College Scorecard API Types
 * Reference: https://collegescorecard.ed.gov/data/api/
 */

export interface CollegeSearchResult {
  id: string;
  name: string;
  city: string;
  state: string;
  location: string; // "City, State" format
  website: string | null;
  division?: string; // NCAA division (populated after lookup)
  conference?: string; // NCAA conference (populated after lookup)
}

export interface CollegeScorecardSchool {
  id: number;
  "school.name": string;
  "school.city": string;
  "school.state": string;
  "school.school_url"?: string | null;
}

export interface CollegeScorecardResponse {
  metadata: {
    total: number;
    page: number;
    per_page: number;
  };
  results: CollegeScorecardSchool[];
}

/**
 * NCAA API Types
 * Reference: College Football Data API (https://collegefootballdata.com)
 */

export type NcaaDivision = "D1" | "D2" | "D3";

export interface NcaaTeam {
  id: number;
  displayName: string;
  abbreviation?: string;
  location?: string;
  conference?: {
    displayName?: string;
  };
  logos?: Array<{
    href: string;
  }>;
  links?: Array<{
    rel: string[];
    href: string;
  }>;
}

export interface NcaaTeamsResponse {
  teams: NcaaTeam[];
}

export interface NcaaLookupResult {
  division: NcaaDivision;
  conference?: string;
  logo?: string;
}
