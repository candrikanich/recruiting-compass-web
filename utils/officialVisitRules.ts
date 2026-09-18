export type VisitDivision = "D1" | "D2" | "D3";

export interface VisitDivisionRules {
  division: VisitDivision;
  /** What the school may pay for during an official visit. */
  official: string[];
  /** What the school may pay for during an unofficial visit. */
  unofficial: string[];
}

/**
 * NCAA official vs. unofficial visit payment rules, per division.
 * D1 figures verified against NCAA's "Official and Unofficial Visits 101"
 * (Division I Educational Resource, Feb 2026) — the $60/person entertainment
 * cap and the five complimentary game tickets are separate allowances, not
 * one bundled into the other.
 */
export const OFFICIAL_VISIT_RULES: VisitDivisionRules[] = [
  {
    division: "D1",
    official: [
      "Transportation to and from the school for you and up to two family members",
      "Lodging",
      "Up to three meals per day for you and up to four family members",
      "Up to $60 per person of reasonable entertainment expenses for you and up to four family members (this does not include meals or game tickets)",
      "Up to five complimentary tickets to a home sports event, for you and those accompanying you",
    ],
    unofficial: [
      "No complimentary meals",
      "Complimentary tickets to a home sports event for you and up to three family members (a nontraditional family may receive two additional tickets)",
    ],
  },
  {
    division: "D2",
    official: [
      "Transportation to and from the school",
      "Lodging",
      "Meals for you and those accompanying you",
      "Up to $50 per person of reasonable entertainment expenses for you and those accompanying you (this does not include meals or game tickets)",
      "Complimentary tickets to a home sports event for you and those accompanying you",
    ],
    unofficial: [
      "One meal for you and those accompanying you",
      "Complimentary admission to a home sports event for you and those accompanying you",
    ],
  },
  {
    division: "D3",
    official: [
      "Transportation to and from the school",
      "Lodging",
      "Up to three meals per day for you and those accompanying you",
      "Up to $40 per person of reasonable entertainment expenses for you and those accompanying you (this does not include meals or game tickets)",
      "Complimentary tickets to a home sports event for you and those accompanying you",
    ],
    unofficial: [
      "One meal for you and those accompanying you at the on-campus dining facility",
      "Complimentary admission to a home sports event for you and those accompanying you",
    ],
  },
];

export const getVisitDivisionRules = (
  division: string | null | undefined,
): VisitDivisionRules | undefined =>
  OFFICIAL_VISIT_RULES.find((r) => r.division === division);
