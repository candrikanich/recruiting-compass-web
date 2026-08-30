/**
 * NCAA schools database
 * Comprehensive list of 600+ NCAA Division I, II, III schools
 * Data extracted from data/ncaaSchools.json
 */

import ncaaData from "~/data/ncaaSchools.json";

export type NcaaDivision = "D1" | "D2" | "D3";

export interface SchoolInfo {
  name: string;
  conference?: string;
  website?: string;
  athleticWebsite?: string;
  state?: string;
}

export interface NcaaCatalogSchool {
  name: string;
  division: NcaaDivision;
  conference: string | null;
  state: string | null;
  website: string | null;
  athleticWebsite: string | null;
}

/**
 * Comprehensive database of NCAA schools by division
 * Organized by division for efficient lookups
 */
export const DIVISION_SCHOOLS: Record<NcaaDivision, SchoolInfo[]> =
  ncaaData as Record<NcaaDivision, SchoolInfo[]>;

/**
 * Get all schools across all divisions
 */
export const getAllSchools = (): SchoolInfo[] => {
  return [
    ...DIVISION_SCHOOLS.D1,
    ...DIVISION_SCHOOLS.D2,
    ...DIVISION_SCHOOLS.D3,
  ];
};

/**
 * Get schools by division
 */
export const getSchoolsByDivision = (division: NcaaDivision): SchoolInfo[] => {
  return DIVISION_SCHOOLS[division];
};

/**
 * Find a school by name (case-insensitive)
 */
export const findSchool = (name: string): SchoolInfo | undefined => {
  const searchName = name.toLowerCase();
  for (const division of ["D1", "D2", "D3"] as NcaaDivision[]) {
    const school = DIVISION_SCHOOLS[division].find(
      (s) => s.name.toLowerCase() === searchName,
    );
    if (school) return school;
  }
  return undefined;
};

/**
 * Check if a school exists in NCAA database
 */
export const isNcaaSchool = (name: string): boolean => {
  return findSchool(name) !== undefined;
};

/**
 * Get schools by conference
 */
export const getSchoolsByConference = (conference: string): SchoolInfo[] => {
  return getAllSchools().filter(
    (s) => s.conference?.toLowerCase() === conference.toLowerCase(),
  );
};

/**
 * Flatten the JSON catalog into a scored-recommendation source.
 * Division is taken from the parent key — it is not stored on each JSON row.
 */
export const getCatalogSchools = (): NcaaCatalogSchool[] => {
  const out: NcaaCatalogSchool[] = [];
  for (const division of ["D1", "D2", "D3"] as NcaaDivision[]) {
    for (const school of DIVISION_SCHOOLS[division]) {
      out.push({
        name: school.name,
        division,
        conference: school.conference ?? null,
        state: school.state ? school.state.toUpperCase() : null,
        website: school.website ?? null,
        athleticWebsite: school.athleticWebsite ?? null,
      });
    }
  }
  return out;
};
