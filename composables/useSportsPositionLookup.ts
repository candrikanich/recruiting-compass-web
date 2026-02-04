// composables/useSportsPositionLookup.ts
export const useSportsPositionLookup = () => {
  // Map of sport -> positions
  const sportPositions: Record<string, string[]> = {
    Baseball: [
      "P",
      "C",
      "1B",
      "2B",
      "3B",
      "SS",
      "LF",
      "CF",
      "RF",
      "DH",
      "UTIL",
    ],
    Softball: [
      "P",
      "C",
      "1B",
      "2B",
      "3B",
      "SS",
      "LF",
      "CF",
      "RF",
      "DH",
      "UTIL",
    ],
    Basketball: ["PG", "SG", "SF", "PF", "C"],
    Football: ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K"],
    Soccer: ["GK", "DEF", "MID", "FWD"],
    Lacrosse: ["G", "D", "M", "A"],
    "Ice Hockey": ["G", "D", "LW", "C", "RW"],
    Volleyball: ["S", "MB", "OH", "OP", "L"],
    "Track & Field": ["Distance", "Sprints", "Jumps", "Throws", "Hurdles"],
    "Cross Country": ["Runner"],
    Swimming: ["Distance", "Sprint", "IM", "Dive"],
    Tennis: ["Singles", "Doubles"],
    Golf: ["Player"],
  };

  // Common sports list (what's available in onboarding)
  const commonSports = Object.keys(sportPositions);

  // Get positions for a given sport
  const getPositionsBySport = (sport: string): string[] => {
    return sportPositions[sport] || [];
  };

  return {
    commonSports,
    getPositionsBySport,
  };
};
