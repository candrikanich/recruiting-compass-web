const STATE_TIMEZONE: Record<string, string> = {
  ...Object.fromEntries(
    [
      "ME",
      "NH",
      "VT",
      "MA",
      "RI",
      "CT",
      "NY",
      "NJ",
      "PA",
      "DE",
      "MD",
      "DC",
      "VA",
      "WV",
      "NC",
      "SC",
      "GA",
      "FL",
      "OH",
      "MI",
      "IN",
      "KY",
      "TN",
    ].map((s) => [s, "America/New_York"]),
  ),
  ...Object.fromEntries(
    [
      "ND",
      "SD",
      "NE",
      "KS",
      "MN",
      "IA",
      "MO",
      "WI",
      "IL",
      "AR",
      "LA",
      "MS",
      "AL",
      "OK",
      "TX",
    ].map((s) => [s, "America/Chicago"]),
  ),
  // AZ included — does not observe DST but maps to Denver per spec
  ...Object.fromEntries(
    ["MT", "WY", "CO", "NM", "AZ", "UT", "ID"].map((s) => [
      s,
      "America/Denver",
    ]),
  ),
  ...Object.fromEntries(
    ["WA", "OR", "CA", "NV"].map((s) => [s, "America/Los_Angeles"]),
  ),
  AK: "America/Anchorage",
  HI: "Pacific/Honolulu",
};

export function deriveTimezone(state?: string | null): string {
  if (!state) return "America/New_York";
  return STATE_TIMEZONE[state.toUpperCase()] ?? "America/New_York";
}
