import { describe, it, expect } from "vitest";
import {
  validateNotificationSettings,
  validateHomeLocation,
  validatePlayerDetails,
  validateSchoolPreferences,
  validateDashboardLayout,
  getDefaultNotificationSettings,
  getDefaultHomeLocation,
  getDefaultPlayerDetails,
  getDefaultSchoolPreferences,
  getDefaultDashboardLayout,
} from "~/utils/preferenceValidation";

// ---------------------------------------------------------------------------
// validateNotificationSettings
// ---------------------------------------------------------------------------

describe("validateNotificationSettings", () => {
  it("returns null for null input", () => {
    expect(validateNotificationSettings(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(validateNotificationSettings(undefined)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(validateNotificationSettings("hello")).toBeNull();
  });

  it("returns null for a number", () => {
    expect(validateNotificationSettings(42)).toBeNull();
  });

  it("returns defaults when passed an empty object", () => {
    const result = validateNotificationSettings({});
    expect(result).not.toBeNull();
    expect(result!.followUpReminderDays).toBe(7);
    expect(result!.enableFollowUpReminders).toBe(true);
    expect(result!.enableDeadlineAlerts).toBe(true);
    expect(result!.enableDailyDigest).toBe(true);
    expect(result!.enableInboundInteractionAlerts).toBe(true);
    expect(result!.enableEmailNotifications).toBe(true);
    expect(result!.emailOnlyHighPriority).toBe(false);
    expect(result!.quietHoursStart).toBeUndefined();
    expect(result!.quietHoursEnd).toBeUndefined();
  });

  it("returns provided values when all fields are present and valid", () => {
    const input = {
      followUpReminderDays: 3,
      enableFollowUpReminders: false,
      enableDeadlineAlerts: false,
      enableDailyDigest: false,
      enableInboundInteractionAlerts: false,
      enableEmailNotifications: false,
      emailOnlyHighPriority: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };
    const result = validateNotificationSettings(input);
    expect(result).not.toBeNull();
    expect(result!.followUpReminderDays).toBe(3);
    expect(result!.enableFollowUpReminders).toBe(false);
    expect(result!.enableDeadlineAlerts).toBe(false);
    expect(result!.enableDailyDigest).toBe(false);
    expect(result!.enableInboundInteractionAlerts).toBe(false);
    expect(result!.enableEmailNotifications).toBe(false);
    expect(result!.emailOnlyHighPriority).toBe(true);
    expect(result!.quietHoursStart).toBe("22:00");
    expect(result!.quietHoursEnd).toBe("07:00");
  });

  it("coerces string booleans to true booleans", () => {
    const result = validateNotificationSettings({
      enableFollowUpReminders: "true",
      emailOnlyHighPriority: "false",
    });
    expect(result!.enableFollowUpReminders).toBe(true);
    expect(result!.emailOnlyHighPriority).toBe(false);
  });

  it("uses default 7 when followUpReminderDays is null", () => {
    const result = validateNotificationSettings({ followUpReminderDays: null });
    expect(result!.followUpReminderDays).toBe(7);
  });

  it("uses default 7 when followUpReminderDays is NaN string", () => {
    const result = validateNotificationSettings({
      followUpReminderDays: "not-a-number",
    });
    expect(result!.followUpReminderDays).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// validateHomeLocation
// ---------------------------------------------------------------------------

describe("validateHomeLocation", () => {
  it("returns null for null input", () => {
    expect(validateHomeLocation(null)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(validateHomeLocation("123 Main St")).toBeNull();
  });

  it("returns null when object has no meaningful location data", () => {
    expect(validateHomeLocation({})).toBeNull();
    expect(validateHomeLocation({ unrelated: "field" })).toBeNull();
  });

  it("returns location object when address is present", () => {
    const result = validateHomeLocation({ address: "123 Main St" });
    expect(result).not.toBeNull();
    expect(result!.address).toBe("123 Main St");
  });

  it("returns location object when only zip is provided", () => {
    const result = validateHomeLocation({ zip: "90210" });
    expect(result).not.toBeNull();
    expect(result!.zip).toBe("90210");
  });

  it("returns location object when only latitude/longitude are provided", () => {
    const result = validateHomeLocation({
      latitude: 34.05,
      longitude: -118.25,
    });
    expect(result).not.toBeNull();
    expect(result!.latitude).toBe(34.05);
    expect(result!.longitude).toBe(-118.25);
  });

  it("maps all fields correctly for a full location object", () => {
    const input = {
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "90210",
      latitude: 34.05,
      longitude: -118.25,
    };
    const result = validateHomeLocation(input);
    expect(result).toEqual(input);
  });

  it("returns undefined for optional missing fields", () => {
    const result = validateHomeLocation({ city: "Denver" });
    expect(result!.address).toBeUndefined();
    expect(result!.latitude).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// validatePlayerDetails
// ---------------------------------------------------------------------------

describe("validatePlayerDetails", () => {
  it("returns null for null input", () => {
    expect(validatePlayerDetails(null)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(validatePlayerDetails("data")).toBeNull();
  });

  it("returns null for an empty object", () => {
    expect(validatePlayerDetails({})).toBeNull();
  });

  it("returns player details for a minimal object", () => {
    const result = validatePlayerDetails({ graduation_year: 2027 });
    expect(result).not.toBeNull();
    expect(result!.graduation_year).toBe(2027);
  });

  it("maps scalar string fields correctly", () => {
    const result = validatePlayerDetails({
      primary_sport: "Baseball",
      primary_position: "Pitcher",
      high_school: "Lincoln High",
      club_team: "Thunder",
      twitter_handle: "@player",
      instagram_handle: "@player_ig",
      email: "player@example.com",
      phone: "555-1234",
    });
    expect(result!.primary_sport).toBe("Baseball");
    expect(result!.primary_position).toBe("Pitcher");
    expect(result!.high_school).toBe("Lincoln High");
    expect(result!.club_team).toBe("Thunder");
    expect(result!.twitter_handle).toBe("@player");
    expect(result!.instagram_handle).toBe("@player_ig");
    expect(result!.email).toBe("player@example.com");
    expect(result!.phone).toBe("555-1234");
  });

  it("maps numeric fields correctly", () => {
    const result = validatePlayerDetails({
      height_inches: 72,
      weight_lbs: 185,
      gpa: 3.8,
      sat_score: 1200,
      act_score: 28,
    });
    expect(result!.height_inches).toBe(72);
    expect(result!.weight_lbs).toBe(185);
    expect(result!.gpa).toBe(3.8);
    expect(result!.sat_score).toBe(1200);
    expect(result!.act_score).toBe(28);
  });

  it("maps valid bats option", () => {
    expect(validatePlayerDetails({ bats: "L", throws: "L" })!.bats).toBe("L");
    expect(validatePlayerDetails({ bats: "R", throws: "R" })!.bats).toBe("R");
    expect(validatePlayerDetails({ bats: "S", throws: "L" })!.bats).toBe("S");
  });

  it("returns undefined for invalid bats/throws values", () => {
    const result = validatePlayerDetails({ bats: "X", throws: "Z" });
    expect(result!.bats).toBeUndefined();
    expect(result!.throws).toBeUndefined();
  });

  it("maps boolean sharing preferences", () => {
    const result = validatePlayerDetails({
      allow_share_phone: true,
      allow_share_email: false,
    });
    expect(result!.allow_share_phone).toBe(true);
    expect(result!.allow_share_email).toBe(false);
  });

  it("maps positions as a string array, normalizing to canonical values", () => {
    // normalizePositions only accepts canonical baseball position values
    const result = validatePlayerDetails({ positions: ["P", "SS"] });
    expect(result!.positions).toEqual(["P", "SS"]);
  });

  it("returns empty positions array for unrecognized position codes", () => {
    const result = validatePlayerDetails({ positions: ["SP", "RP"] });
    expect(result!.positions).toEqual([]);
  });

  it("maps high-school grade team fields", () => {
    const result = validatePlayerDetails({
      ninth_grade_team: "JV",
      ninth_grade_coach: "Coach A",
      twelfth_grade_team: "Varsity",
      twelfth_grade_coach: "Coach B",
    });
    expect(result!.ninth_grade_team).toBe("JV");
    expect(result!.ninth_grade_coach).toBe("Coach A");
    expect(result!.twelfth_grade_team).toBe("Varsity");
    expect(result!.twelfth_grade_coach).toBe("Coach B");
  });

  it("maps travel team fields", () => {
    const result = validatePlayerDetails({
      travel_team_year: 2025,
      travel_team_name: "Thunder",
      travel_team_coach: "Coach C",
    });
    expect(result!.travel_team_year).toBe(2025);
    expect(result!.travel_team_name).toBe("Thunder");
    expect(result!.travel_team_coach).toBe("Coach C");
  });
});

// ---------------------------------------------------------------------------
// validateSchoolPreferences
// ---------------------------------------------------------------------------

describe("validateSchoolPreferences", () => {
  it("returns null for null input", () => {
    expect(validateSchoolPreferences(null)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(validateSchoolPreferences("data")).toBeNull();
  });

  it("returns null when preferences array is missing", () => {
    expect(validateSchoolPreferences({})).toBeNull();
  });

  it("returns null when preferences array is empty", () => {
    expect(validateSchoolPreferences({ preferences: [] })).toBeNull();
  });

  it("parses a valid preference entry", () => {
    const input = {
      preferences: [
        {
          id: "pref-1",
          category: "location",
          type: "distance",
          value: 200,
          priority: 1,
          is_dealbreaker: false,
        },
      ],
    };
    const result = validateSchoolPreferences(input);
    expect(result).not.toBeNull();
    expect(result!.preferences).toHaveLength(1);
    expect(result!.preferences[0].id).toBe("pref-1");
    expect(result!.preferences[0].category).toBe("location");
    expect(result!.preferences[0].priority).toBe(1);
    expect(result!.preferences[0].is_dealbreaker).toBe(false);
  });

  it("defaults category to 'custom' for invalid category value", () => {
    const input = {
      preferences: [{ id: "p1", category: "unknown", type: "x", value: null }],
    };
    const result = validateSchoolPreferences(input);
    expect(result!.preferences[0].category).toBe("custom");
  });

  it("defaults priority to 0 when missing", () => {
    const input = {
      preferences: [
        { id: "p2", category: "academic", type: "gpa", value: 3.5 },
      ],
    };
    const result = validateSchoolPreferences(input);
    expect(result!.preferences[0].priority).toBe(0);
  });

  it("includes template_used and last_updated when provided", () => {
    const input = {
      preferences: [
        { id: "p3", category: "program", type: "division", value: "D1" },
      ],
      template_used: "default",
      last_updated: "2025-01-01T00:00:00Z",
    };
    const result = validateSchoolPreferences(input);
    expect(result!.template_used).toBe("default");
    expect(result!.last_updated).toBe("2025-01-01T00:00:00Z");
  });

  it("generates last_updated when not provided", () => {
    const input = {
      preferences: [{ id: "p4", category: "custom", type: "x", value: null }],
    };
    const result = validateSchoolPreferences(input);
    expect(result!.last_updated).toBeTruthy();
    expect(() => new Date(result!.last_updated)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validateDashboardLayout
// ---------------------------------------------------------------------------

describe("validateDashboardLayout", () => {
  it("returns null for null input", () => {
    expect(validateDashboardLayout(null)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(validateDashboardLayout("layout")).toBeNull();
  });

  it("returns null for an empty object", () => {
    expect(validateDashboardLayout({})).toBeNull();
  });

  it("returns null for the old boolean format (has 'widgets' key)", () => {
    expect(
      validateDashboardLayout({ widgets: { someWidget: true } }),
    ).toBeNull();
  });

  it("returns null when leftColumn is missing", () => {
    expect(validateDashboardLayout({ rightColumn: [] })).toBeNull();
  });

  it("returns null when rightColumn is missing", () => {
    expect(validateDashboardLayout({ leftColumn: [] })).toBeNull();
  });

  it("returns null when columns are non-arrays", () => {
    expect(
      validateDashboardLayout({ leftColumn: "bad", rightColumn: "bad" }),
    ).toBeNull();
  });

  it("parses a valid layout with widget entries", () => {
    const input = {
      statsCards: {
        coaches: false,
        schools: true,
        interactions: true,
        offers: false,
        events: true,
      },
      leftColumn: [
        { id: "interactionTrendChart", visible: true },
        { id: "schoolMapWidget", visible: false },
      ],
      rightColumn: [{ id: "eventsSummary", visible: true }],
    };
    const result = validateDashboardLayout(input);
    expect(result).not.toBeNull();
    expect(result!.statsCards.coaches).toBe(false);
    expect(result!.statsCards.schools).toBe(true);
    expect(result!.leftColumn).toHaveLength(2);
    expect(result!.leftColumn[0].id).toBe("interactionTrendChart");
    expect(result!.leftColumn[1].visible).toBe(false);
    expect(result!.rightColumn).toHaveLength(1);
    expect(result!.rightColumn[0].id).toBe("eventsSummary");
  });

  it("filters out widget entries with invalid IDs", () => {
    const input = {
      leftColumn: [
        { id: "invalidWidgetId", visible: true },
        { id: "quickTasks", visible: true },
      ],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.leftColumn).toHaveLength(1);
    expect(result!.leftColumn[0].id).toBe("quickTasks");
  });

  it("filters out non-object items in columns", () => {
    const input = {
      leftColumn: [null, "string", 42, { id: "quickTasks", visible: true }],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.leftColumn).toHaveLength(1);
  });

  it("defaults statsCards to all true when statsCards is absent", () => {
    const input = {
      leftColumn: [{ id: "quickTasks", visible: true }],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.statsCards.coaches).toBe(true);
    expect(result!.statsCards.offers).toBe(true);
  });

  it("defaults widget visible to true when not provided", () => {
    const input = {
      leftColumn: [{ id: "quickTasks" }],
      rightColumn: [],
    };
    const result = validateDashboardLayout(input);
    expect(result!.leftColumn[0].visible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Default factories
// ---------------------------------------------------------------------------

describe("getDefaultNotificationSettings", () => {
  it("returns an object with all required keys", () => {
    const settings = getDefaultNotificationSettings();
    expect(settings.followUpReminderDays).toBe(7);
    expect(settings.enableFollowUpReminders).toBe(true);
    expect(settings.enableDeadlineAlerts).toBe(true);
    expect(settings.enableDailyDigest).toBe(true);
    expect(settings.enableInboundInteractionAlerts).toBe(true);
    expect(settings.enableEmailNotifications).toBe(true);
    expect(settings.emailOnlyHighPriority).toBe(false);
  });

  it("returns a new object on each call", () => {
    expect(getDefaultNotificationSettings()).not.toBe(
      getDefaultNotificationSettings(),
    );
  });
});

describe("getDefaultHomeLocation", () => {
  it("returns an object with all fields undefined", () => {
    const loc = getDefaultHomeLocation();
    expect(loc.address).toBeUndefined();
    expect(loc.city).toBeUndefined();
    expect(loc.state).toBeUndefined();
    expect(loc.zip).toBeUndefined();
    expect(loc.latitude).toBeUndefined();
    expect(loc.longitude).toBeUndefined();
  });
});

describe("getDefaultPlayerDetails", () => {
  it("returns an object with expected keys present", () => {
    const details = getDefaultPlayerDetails();
    expect(details).toHaveProperty("graduation_year");
    expect(details).toHaveProperty("high_school");
    expect(details).toHaveProperty("club_team");
    expect(details).toHaveProperty("positions");
    expect(details.graduation_year).toBeUndefined();
  });
});

describe("getDefaultSchoolPreferences", () => {
  it("returns empty preferences array and a valid ISO timestamp", () => {
    const prefs = getDefaultSchoolPreferences();
    expect(prefs.preferences).toEqual([]);
    expect(() => new Date(prefs.last_updated)).not.toThrow();
    expect(prefs.last_updated.length).toBeGreaterThan(0);
  });
});

describe("getDefaultDashboardLayout", () => {
  it("returns all statsCards as true", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.statsCards.coaches).toBe(true);
    expect(layout.statsCards.schools).toBe(true);
    expect(layout.statsCards.interactions).toBe(true);
    expect(layout.statsCards.offers).toBe(true);
    expect(layout.statsCards.events).toBe(true);
  });

  it("returns non-empty leftColumn and rightColumn", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.leftColumn.length).toBeGreaterThan(0);
    expect(layout.rightColumn.length).toBeGreaterThan(0);
  });

  it("returns all widgets with visible: true", () => {
    const layout = getDefaultDashboardLayout();
    [...layout.leftColumn, ...layout.rightColumn].forEach((entry) => {
      expect(entry.visible).toBe(true);
    });
  });

  it("returns only valid widget IDs in both columns", () => {
    const validIds = new Set([
      "interactionTrendChart",
      "schoolInterestChart",
      "schoolMapWidget",
      "performanceSummary",
      "quickTasks",
      "coachFollowupWidget",
      "atAGlanceSummary",
      "schoolStatusOverview",
      "eventsSummary",
      "recentNotifications",
      "linkedAccounts",
    ]);
    const layout = getDefaultDashboardLayout();
    [...layout.leftColumn, ...layout.rightColumn].forEach((entry) => {
      expect(validIds.has(entry.id)).toBe(true);
    });
  });
});
