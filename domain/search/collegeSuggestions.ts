export interface CollegeSearchApiRow {
  id: number;
  "school.name": string;
  "school.city": string;
  "school.state": string;
}

export interface CollegeSuggestion {
  id: string;
  name: string;
  location: string;
}

/** Dedupe College Scorecard rows and map them to suggestion cards. */
export function mapCollegeSearchResults(
  results: CollegeSearchApiRow[],
): CollegeSuggestion[] {
  const uniqueSchools = new Map<string, CollegeSuggestion>();

  for (const school of results) {
    const id = String(school.id);
    if (!uniqueSchools.has(id)) {
      const city = school["school.city"] || "";
      const state = school["school.state"] || "";
      const location = [city, state].filter(Boolean).join(", ");

      uniqueSchools.set(id, {
        id,
        name: school["school.name"],
        location,
      });
    }
  }

  return Array.from(uniqueSchools.values());
}
