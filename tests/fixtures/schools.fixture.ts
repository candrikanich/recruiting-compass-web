import type { School, SchoolPreference } from "~/types/models";

/**
 * School test data factory
 * Creates consistent mock school objects for testing
 */
export function createMockSchool(overrides: Partial<School> = {}): School {
  return {
    id: overrides.id || `school-${Math.random().toString(36).substr(2, 9)}`,
    user_id: overrides.user_id || "user-123",
    name: overrides.name || "Test University",
    location: overrides.location || "Boston, MA",
    city: overrides.city || "Boston",
    state: overrides.state || "MA",
    division: overrides.division || "D1",
    conference: overrides.conference || "ACC",
    ranking: overrides.ranking ?? null,
    is_favorite: overrides.is_favorite ?? false,
    website: overrides.website || "https://test.edu",
    favicon_url: overrides.favicon_url ?? null,
    twitter_handle: overrides.twitter_handle || "@testuniv",
    instagram_handle: overrides.instagram_handle || "testuniv",
    status: overrides.status || "researching",
    notes: overrides.notes || "Great program",
    pros: overrides.pros || ["Good facilities", "Strong academics"],
    cons: overrides.cons || ["Far from home"],
    private_notes: overrides.private_notes ?? null,
    offer_details: overrides.offer_details ?? null,
    academic_info: overrides.academic_info || {
      admission_rate: 0.25,
      enrollment: 12000,
      gpa_requirement: 3.5,
    },
    amenities: overrides.amenities ?? null,
    created_by: overrides.created_by || "user-123",
    updated_by: overrides.updated_by || "user-123",
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

/**
 * Create multiple schools for bulk testing
 */
export function createMockSchools(
  count: number,
  overrideFn?: (index: number) => Partial<School>,
): School[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSchool({
      id: `school-${i + 1}`,
      name: `University ${i + 1}`,
      ...(overrideFn?.(i) || {}),
    }),
  );
}

/**
 * School preference factory for matching tests
 */
export function createMockSchoolPreference(
  overrides: Partial<SchoolPreference> = {},
): SchoolPreference {
  return {
    id: overrides.id || `pref-${Math.random().toString(36).substr(2, 9)}`,
    category: overrides.category || "location",
    type: overrides.type || "max_distance_miles",
    value: overrides.value ?? 300,
    priority: overrides.priority ?? 1,
    is_dealbreaker: overrides.is_dealbreaker ?? false,
  };
}

/**
 * Create schools with specific academic profiles for testing
 */
export function createSchoolWithAcademics(
  academicOverrides: Partial<School["academic_info"]> = {},
  schoolOverrides: Partial<School> = {},
): School {
  return createMockSchool({
    academic_info: {
      admission_rate: 0.25,
      enrollment: 12000,
      gpa_requirement: 3.5,
      ...academicOverrides,
    },
    ...schoolOverrides,
  });
}

/**
 * Create a school with elite admission rate
 */
export const createEliteSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    name: "Harvard University",
    state: "MA",
    location: "Cambridge, MA",
    division: "D1",
    conference: "Ivy League",
    academic_info: {
      admission_rate: 0.04,
      enrollment: 8000,
      gpa_requirement: 3.9,
    },
    ...overrides,
  });

/**
 * Create a school with mid-range admission rate
 */
export const createMidTierSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    name: "State University",
    state: "CA",
    location: "Berkeley, CA",
    division: "D1",
    conference: "Pac-12",
    academic_info: {
      admission_rate: 0.4,
      enrollment: 30000,
      gpa_requirement: 3.3,
    },
    ...overrides,
  });

/**
 * Create a school with high admission rate
 */
export const createAccessibleSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    name: "State College",
    state: "TX",
    location: "Austin, TX",
    division: "D2",
    conference: "Lone Star Conference",
    academic_info: {
      admission_rate: 0.75,
      enrollment: 8000,
      gpa_requirement: 2.8,
    },
    ...overrides,
  });

/**
 * Create a Division 3 school
 */
export const createD3School = (overrides?: Partial<School>): School =>
  createMockSchool({
    name: "Liberal Arts College",
    division: "D3",
    conference: "NESCAC",
    academic_info: { admission_rate: 0.35, enrollment: 2000 },
    ...overrides,
  });

/**
 * Create a JUCO school
 */
export const createJucoSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    name: "Junior College",
    division: "JUCO",
    conference: null,
    academic_info: { admission_rate: 0.9, enrollment: 3000 },
    ...overrides,
  });

/**
 * Create a school with contact status
 */
export const createContactedSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    status: "contacted",
    notes: "Reached out via email on Jan 15",
    ...overrides,
  });

/**
 * Create a school with offer received
 */
export const createOfferSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    status: "offer_received",
    offer_details: {
      terms: "Full ride scholarship",
      start_date: "2025-09-01",
      conditions: ["Maintain 3.0 GPA"],
    },
    ...overrides,
  });

/**
 * Create a committed school
 */
export const createCommittedSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    status: "committed",
    is_favorite: true,
    ranking: 1,
    ...overrides,
  });

/**
 * Create a school with all pros/cons
 */
export const createDetailedSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    pros: [
      "Excellent coaching staff",
      "Strong baseball tradition",
      "Good academics",
      "Beautiful campus",
      "Strong recruiting class",
    ],
    cons: [
      "Far from home",
      "Cold climate",
      "Expensive tuition",
      "Limited playing time",
    ],
    notes: "Top choice school. Great program with strong alumni network.",
    ...overrides,
  });

/**
 * Create schools for testing batch operations
 */
export function createBatchSchools(count: number = 5): School[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSchool({
      id: `school-${i + 1}`,
      name: `University ${String.fromCharCode(65 + i)}`,
      ranking: null,
      division: ["D1", "D2", "D3"][i % 3] as any,
    }),
  );
}

/**
 * Create schools by region for location testing
 */
export const createNortheastSchools = (): School[] => [
  createMockSchool({
    state: "MA",
    location: "Boston, MA",
    name: "Boston College",
  }),
  createMockSchool({
    state: "PA",
    location: "Philadelphia, PA",
    name: "University of Pennsylvania",
  }),
  createMockSchool({
    state: "NY",
    location: "New York, NY",
    name: "Columbia University",
  }),
];

export const createSoutheastSchools = (): School[] => [
  createMockSchool({
    state: "FL",
    location: "Gainesville, FL",
    name: "University of Florida",
  }),
  createMockSchool({
    state: "GA",
    location: "Athens, GA",
    name: "University of Georgia",
  }),
  createMockSchool({
    state: "NC",
    location: "Chapel Hill, NC",
    name: "UNC Chapel Hill",
  }),
];

export const createWestSchools = (): School[] => [
  createMockSchool({
    state: "CA",
    location: "Berkeley, CA",
    name: "UC Berkeley",
  }),
  createMockSchool({
    state: "AZ",
    location: "Tempe, AZ",
    name: "Arizona State",
  }),
  createMockSchool({
    state: "WA",
    location: "Seattle, WA",
    name: "University of Washington",
  }),
];

/**
 * Create schools with different sizes
 */
export const createSmallSchool = (overrides?: Partial<School>): School =>
  createSchoolWithAcademics({ enrollment: 2000 }, overrides);

export const createMediumSchool = (overrides?: Partial<School>): School =>
  createSchoolWithAcademics({ enrollment: 7000 }, overrides);

export const createLargeSchool = (overrides?: Partial<School>): School =>
  createSchoolWithAcademics({ enrollment: 25000 }, overrides);

export const createVeryLargeSchool = (overrides?: Partial<School>): School =>
  createSchoolWithAcademics({ enrollment: 45000 }, overrides);

/**
 * Create Power 4 conference schools
 */
export const createSECSchool = (overrides?: Partial<School>): School =>
  createMockSchool({ conference: "SEC", division: "D1", ...overrides });

export const createBigTenSchool = (overrides?: Partial<School>): School =>
  createMockSchool({ conference: "Big Ten", division: "D1", ...overrides });

export const createACCSchool = (overrides?: Partial<School>): School =>
  createMockSchool({ conference: "ACC", division: "D1", ...overrides });

export const createBig12School = (overrides?: Partial<School>): School =>
  createMockSchool({ conference: "Big 12", division: "D1", ...overrides });

/**
 * Create Group of 5 conference schools
 */
export const createAACSchool = (overrides?: Partial<School>): School =>
  createMockSchool({ conference: "AAC", division: "D1", ...overrides });

export const createSunBeltSchool = (overrides?: Partial<School>): School =>
  createMockSchool({ conference: "Sun Belt", division: "D1", ...overrides });

export const createMountainWestSchool = (overrides?: Partial<School>): School =>
  createMockSchool({
    conference: "Mountain West",
    division: "D1",
    ...overrides,
  });
