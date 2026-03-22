import { describe, it, expect } from "vitest";
import { taskTriggers, getTriggerAction } from "~/utils/autoTaskCompletion";

/**
 * checkAndCompleteTask uses $fetch (Nuxt runtime global) and is not testable
 * in a pure Vitest environment without full Nuxt context — skipped intentionally.
 *
 * emitAutoCompletion delegates to checkAndCompleteTask, so it is also skipped.
 */

describe("taskTriggers", () => {
  it("is an object with all expected trigger keys", () => {
    const expectedKeys = [
      "school_added",
      "video_uploaded",
      "interaction_logged",
      "visit_scheduled",
      "eligibility_registered",
      "eligibility_naia_registered",
      "test_score_recorded",
      "event_attended",
      "camp_attended",
      "coach_contact_made",
      "profile_completed",
      "athletic_metrics_recorded",
      "gpa_recorded",
      "offer_received",
      "nli_signed",
    ];

    for (const key of expectedKeys) {
      expect(taskTriggers).toHaveProperty(key);
    }
  });

  it("has arrays as values for every key", () => {
    for (const value of Object.values(taskTriggers)) {
      expect(Array.isArray(value)).toBe(true);
    }
  });
});

describe("getTriggerAction", () => {
  const mappings: Array<[string, string]> = [
    ["school.added", "school_added"],
    ["video.uploaded", "video_uploaded"],
    ["interaction.logged", "interaction_logged"],
    ["visit.scheduled", "visit_scheduled"],
    ["eligibility.registered_ncaa", "eligibility_registered"],
    ["eligibility.registered_naia", "eligibility_naia_registered"],
    ["test.score_recorded", "test_score_recorded"],
    ["event.attended", "event_attended"],
    ["camp.attended", "camp_attended"],
    ["coach.contacted", "coach_contact_made"],
    ["profile.completed", "profile_completed"],
    ["metrics.recorded", "athletic_metrics_recorded"],
    ["gpa.recorded", "gpa_recorded"],
    ["offer.received", "offer_received"],
    ["nli.signed", "nli_signed"],
  ];

  it.each(mappings)('maps "%s" to "%s"', (eventType, expected) => {
    expect(getTriggerAction(eventType)).toBe(expected);
  });

  it("returns null for an unknown event type", () => {
    expect(getTriggerAction("unknown.event")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getTriggerAction("")).toBeNull();
  });

  it("is case-sensitive — lowercase mismatch returns null", () => {
    expect(getTriggerAction("School.Added")).toBeNull();
    expect(getTriggerAction("SCHOOL.ADDED")).toBeNull();
  });
});
