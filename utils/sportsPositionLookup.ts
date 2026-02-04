/**
 * Sports and positions lookup utilities for player onboarding
 *
 * Provides memoized access to sports list and position lookups
 * to avoid repeated computations.
 */

import type { Sport, Position } from "~/types/onboarding";

/**
 * Master list of sports available in The Recruiting Compass
 *
 * Fields:
 * - id: Unique identifier for the sport
 * - name: Display name for UI
 * - hasPositionList: Whether this sport has predefined positions or allows custom
 * - displayOrder: Sort order for dropdown lists
 */
const SPORTS_DATA: Sport[] = [
  { id: "baseball", name: "Baseball", hasPositionList: true, displayOrder: 1 },
  { id: "soccer", name: "Soccer", hasPositionList: true, displayOrder: 2 },
  {
    id: "basketball",
    name: "Basketball",
    hasPositionList: true,
    displayOrder: 3,
  },
  {
    id: "football",
    name: "Football",
    hasPositionList: true,
    displayOrder: 4,
  },
  { id: "hockey", name: "Hockey", hasPositionList: true, displayOrder: 5 },
  {
    id: "lacrosse",
    name: "Lacrosse",
    hasPositionList: true,
    displayOrder: 6,
  },
  {
    id: "volleyball",
    name: "Volleyball",
    hasPositionList: true,
    displayOrder: 7,
  },
  { id: "tennis", name: "Tennis", hasPositionList: false, displayOrder: 8 },
  {
    id: "swimming",
    name: "Swimming & Diving",
    hasPositionList: false,
    displayOrder: 9,
  },
  {
    id: "track-field",
    name: "Track & Field",
    hasPositionList: false,
    displayOrder: 10,
  },
  { id: "golf", name: "Golf", hasPositionList: false, displayOrder: 11 },
  {
    id: "softball",
    name: "Softball",
    hasPositionList: true,
    displayOrder: 12,
  },
  {
    id: "cross-country",
    name: "Cross Country",
    hasPositionList: false,
    displayOrder: 13,
  },
  {
    id: "wrestling",
    name: "Wrestling",
    hasPositionList: false,
    displayOrder: 14,
  },
  { id: "rowing", name: "Rowing", hasPositionList: false, displayOrder: 15 },
  {
    id: "water-polo",
    name: "Water Polo",
    hasPositionList: true,
    displayOrder: 16,
  },
  {
    id: "field-hockey",
    name: "Field Hockey",
    hasPositionList: true,
    displayOrder: 17,
  },
];

/**
 * Position data organized by sport
 *
 * Only sports with hasPositionList=true should have entries here
 */
const POSITIONS_BY_SPORT: Record<string, Position[]> = {
  baseball: [
    { id: "pitcher", name: "Pitcher", sportId: "baseball", displayOrder: 1 },
    {
      id: "catcher",
      name: "Catcher",
      sportId: "baseball",
      displayOrder: 2,
    },
    {
      id: "first-base",
      name: "First Base",
      sportId: "baseball",
      displayOrder: 3,
    },
    {
      id: "second-base",
      name: "Second Base",
      sportId: "baseball",
      displayOrder: 4,
    },
    {
      id: "shortstop",
      name: "Shortstop",
      sportId: "baseball",
      displayOrder: 5,
    },
    {
      id: "third-base",
      name: "Third Base",
      sportId: "baseball",
      displayOrder: 6,
    },
    {
      id: "outfield",
      name: "Outfield",
      sportId: "baseball",
      displayOrder: 7,
    },
    {
      id: "dh",
      name: "Designated Hitter",
      sportId: "baseball",
      displayOrder: 8,
    },
  ],
  soccer: [
    {
      id: "goalkeeper",
      name: "Goalkeeper",
      sportId: "soccer",
      displayOrder: 1,
    },
    { id: "defender", name: "Defender", sportId: "soccer", displayOrder: 2 },
    {
      id: "midfielder",
      name: "Midfielder",
      sportId: "soccer",
      displayOrder: 3,
    },
    { id: "forward", name: "Forward", sportId: "soccer", displayOrder: 4 },
  ],
  basketball: [
    {
      id: "point-guard",
      name: "Point Guard",
      sportId: "basketball",
      displayOrder: 1,
    },
    {
      id: "shooting-guard",
      name: "Shooting Guard",
      sportId: "basketball",
      displayOrder: 2,
    },
    {
      id: "small-forward",
      name: "Small Forward",
      sportId: "basketball",
      displayOrder: 3,
    },
    {
      id: "power-forward",
      name: "Power Forward",
      sportId: "basketball",
      displayOrder: 4,
    },
    { id: "center", name: "Center", sportId: "basketball", displayOrder: 5 },
  ],
  football: [
    { id: "qb", name: "Quarterback", sportId: "football", displayOrder: 1 },
    { id: "rb", name: "Running Back", sportId: "football", displayOrder: 2 },
    { id: "wr", name: "Wide Receiver", sportId: "football", displayOrder: 3 },
    { id: "te", name: "Tight End", sportId: "football", displayOrder: 4 },
    {
      id: "offensive-line",
      name: "Offensive Line",
      sportId: "football",
      displayOrder: 5,
    },
    {
      id: "defensive-line",
      name: "Defensive Line",
      sportId: "football",
      displayOrder: 6,
    },
    {
      id: "linebacker",
      name: "Linebacker",
      sportId: "football",
      displayOrder: 7,
    },
    {
      id: "defensive-back",
      name: "Defensive Back",
      sportId: "football",
      displayOrder: 8,
    },
    { id: "kicker", name: "Kicker", sportId: "football", displayOrder: 9 },
    { id: "punter", name: "Punter", sportId: "football", displayOrder: 10 },
  ],
  hockey: [
    { id: "goalie", name: "Goalie", sportId: "hockey", displayOrder: 1 },
    { id: "center", name: "Center", sportId: "hockey", displayOrder: 2 },
    { id: "wing", name: "Wing", sportId: "hockey", displayOrder: 3 },
    {
      id: "defenseman",
      name: "Defenseman",
      sportId: "hockey",
      displayOrder: 4,
    },
  ],
  lacrosse: [
    {
      id: "goalie",
      name: "Goalie",
      sportId: "lacrosse",
      displayOrder: 1,
    },
    {
      id: "attack",
      name: "Attack",
      sportId: "lacrosse",
      displayOrder: 2,
    },
    {
      id: "midfield",
      name: "Midfield",
      sportId: "lacrosse",
      displayOrder: 3,
    },
    {
      id: "defense",
      name: "Defense",
      sportId: "lacrosse",
      displayOrder: 4,
    },
  ],
  volleyball: [
    {
      id: "setter",
      name: "Setter",
      sportId: "volleyball",
      displayOrder: 1,
    },
    {
      id: "middle-blocker",
      name: "Middle Blocker",
      sportId: "volleyball",
      displayOrder: 2,
    },
    {
      id: "opposite",
      name: "Opposite/Right-Side",
      sportId: "volleyball",
      displayOrder: 3,
    },
    {
      id: "outside-hitter",
      name: "Outside Hitter",
      sportId: "volleyball",
      displayOrder: 4,
    },
    {
      id: "libero",
      name: "Libero",
      sportId: "volleyball",
      displayOrder: 5,
    },
  ],
  softball: [
    { id: "pitcher", name: "Pitcher", sportId: "softball", displayOrder: 1 },
    { id: "catcher", name: "Catcher", sportId: "softball", displayOrder: 2 },
    { id: "infield", name: "Infield", sportId: "softball", displayOrder: 3 },
    { id: "outfield", name: "Outfield", sportId: "softball", displayOrder: 4 },
  ],
  "water-polo": [
    {
      id: "goalkeeper",
      name: "Goalkeeper",
      sportId: "water-polo",
      displayOrder: 1,
    },
    {
      id: "field-player",
      name: "Field Player",
      sportId: "water-polo",
      displayOrder: 2,
    },
  ],
  "field-hockey": [
    {
      id: "goalkeeper",
      name: "Goalkeeper",
      sportId: "field-hockey",
      displayOrder: 1,
    },
    {
      id: "defender",
      name: "Defender",
      sportId: "field-hockey",
      displayOrder: 2,
    },
    {
      id: "midfielder",
      name: "Midfielder",
      sportId: "field-hockey",
      displayOrder: 3,
    },
    {
      id: "forward",
      name: "Forward",
      sportId: "field-hockey",
      displayOrder: 4,
    },
  ],
};

// Memoization cache
let sportsListCache: Sport[] | null = null;
const positionsCacheByAport: Map<string, Position[]> = new Map();

/**
 * Returns the list of all available sports.
 *
 * Results are memoized for performance. The same array instance
 * is returned on subsequent calls.
 *
 * @returns Array of Sport objects sorted by displayOrder
 */
export const getSportsList = (): Sport[] => {
  if (!sportsListCache) {
    sportsListCache = [...SPORTS_DATA];
  }
  return sportsListCache;
};

/**
 * Returns the list of positions available for a specific sport.
 *
 * If the sport doesn't have a predefined position list (checked via
 * sportHasPositionList), an empty array is returned.
 *
 * Results are memoized per sport for performance.
 *
 * @param sportId - The ID of the sport to get positions for
 * @returns Array of Position objects sorted by displayOrder, or empty array
 */
export const getPositionsBySport = (sportId: string): Position[] => {
  if (!positionsCacheByAport.has(sportId)) {
    const positions = POSITIONS_BY_SPORT[sportId] || [];
    positionsCacheByAport.set(sportId, positions);
  }

  return positionsCacheByAport.get(sportId) || [];
};

/**
 * Checks if a sport has a predefined position list.
 *
 * Some sports (like swimming, golf, tennis) don't have fixed positions
 * and allow users to enter custom position names.
 *
 * @param sportId - The ID of the sport to check
 * @returns true if sport has position list, false otherwise
 */
export const sportHasPositionList = (sportId: string): boolean => {
  const sport = getSportsList().find((s) => s.id === sportId);
  return sport?.hasPositionList ?? false;
};
