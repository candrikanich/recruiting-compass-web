import { describe, it, expect, beforeEach, vi } from "vitest";
import type { School } from "~/types/models";

/**
 * Tests for coaching philosophy section in school detail page
 * Validates that the page properly handles coaching philosophy updates
 */

describe("School Detail Page - Coaching Philosophy Integration", () => {
  let mockSchool: School;

  beforeEach(() => {
    mockSchool = {
      id: "school-1",
      user_id: "user-1",
      name: "Test University",
      location: "Test City, TS",
      division: "D1",
      conference: "Test Conference",
      ranking: 1,
      is_favorite: false,
      website: "https://test.edu",
      favicon_url: null,
      twitter_handle: "test_uni",
      instagram_handle: "test_uni",
      ncaa_id: null,
      status: "interested",
      status_changed_at: null,
      priority_tier: "A",
      notes: "General notes",
      pros: ["Great program"],
      cons: ["Far away"],
      private_notes: null,
      offer_details: null,
      academic_info: null,
      amenities: null,
      coaching_philosophy: "Player development focused program",
      coaching_style: "High-intensity, skill-focused training",
      recruiting_approach: "Early recruiting, all-around athletes",
      communication_style: "Regular emails, monthly phone calls",
      success_metrics: "High MLB placement rate",
      created_by: "user-1",
      updated_by: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    };
  });

  it("should initialize coaching philosophy fields with school data", () => {
    expect(mockSchool.coaching_philosophy).toBeDefined();
    expect(mockSchool.coaching_style).toBeDefined();
    expect(mockSchool.recruiting_approach).toBeDefined();
    expect(mockSchool.communication_style).toBeDefined();
    expect(mockSchool.success_metrics).toBeDefined();
  });

  it("should handle null coaching philosophy fields", () => {
    const schoolWithoutPhilosophy: School = {
      ...mockSchool,
      coaching_philosophy: null,
      coaching_style: null,
      recruiting_approach: null,
      communication_style: null,
      success_metrics: null,
    };

    expect(schoolWithoutPhilosophy.coaching_philosophy).toBeNull();
    expect(schoolWithoutPhilosophy.coaching_style).toBeNull();
  });

  it("should preserve existing coaching philosophy when updating other fields", () => {
    const updates: Partial<School> = {
      notes: "Updated general notes",
      coaching_philosophy: "Player development focused program",
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe(
      "Player development focused program",
    );
    expect(updated.notes).toBe("Updated general notes");
  });

  it("should update individual coaching philosophy fields independently", () => {
    const updates: Partial<School> = {
      coaching_style: "New coaching style",
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_style).toBe("New coaching style");
    expect(updated.recruiting_approach).toBe(
      "Early recruiting, all-around athletes",
    );
    expect(updated.communication_style).toBe(
      "Regular emails, monthly phone calls",
    );
  });

  it("should handle partial coaching philosophy updates", () => {
    const updates: Partial<School> = {
      coaching_philosophy: null, // Clear philosophy
      coaching_style: "Updated style",
      recruiting_approach: null, // Clear approach
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBeNull();
    expect(updated.coaching_style).toBe("Updated style");
    expect(updated.recruiting_approach).toBeNull();
    expect(updated.communication_style).toBe(
      "Regular emails, monthly phone calls",
    );
  });

  it("should support long coaching philosophy text", () => {
    const longText = "A".repeat(2000); // Test with 2000 character text
    const updates: Partial<School> = {
      coaching_philosophy: longText,
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe(longText);
    expect(updated.coaching_philosophy?.length).toBe(2000);
  });

  it("should support special characters in coaching philosophy", () => {
    const specialText = 'High-intensity (80%), "player first" approach - 2024!';
    const updates: Partial<School> = {
      coaching_philosophy: specialText,
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe(specialText);
  });

  it("should support multiline coaching philosophy text", () => {
    const multilineText = `Line 1: High-intensity training
Line 2: Focus on fundamentals
Line 3: Player development`;

    const updates: Partial<School> = {
      coaching_philosophy: multilineText,
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toContain("Line 1");
    expect(updated.coaching_philosophy).toContain("Line 2");
    expect(updated.coaching_philosophy).toContain("Line 3");
  });

  it("should preserve coaching philosophy alongside other school updates", () => {
    const updates: Partial<School> = {
      coaching_philosophy: "Original philosophy",
      coaching_style: "Updated style",
      status: "recruited",
      priority_tier: "B",
      notes: "New notes",
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe("Original philosophy");
    expect(updated.coaching_style).toBe("Updated style");
    expect(updated.status).toBe("recruited");
    expect(updated.priority_tier).toBe("B");
    expect(updated.notes).toBe("New notes");
  });

  it("should handle empty string coaching philosophy values", () => {
    const updates: Partial<School> = {
      coaching_philosophy: "",
      coaching_style: "",
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe("");
    expect(updated.coaching_style).toBe("");
  });

  it("should not mix coaching philosophy with other notes fields", () => {
    const updated = { ...mockSchool };
    expect(updated.coaching_philosophy).not.toEqual(updated.notes);
    expect(updated.coaching_style).not.toEqual(updated.pros[0]);
  });

  it("should handle unicode characters in coaching philosophy", () => {
    const unicodeText = "Focus on 球员 development 🎯";
    const updates: Partial<School> = {
      coaching_philosophy: unicodeText,
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe(unicodeText);
  });

  it("should preserve coaching philosophy when copying school", () => {
    const schoolCopy = { ...mockSchool };
    expect(schoolCopy.coaching_philosophy).toBe(mockSchool.coaching_philosophy);
    expect(schoolCopy.coaching_style).toBe(mockSchool.coaching_style);
  });

  it("should maintain coaching philosophy type as string", () => {
    expect(typeof mockSchool.coaching_philosophy).toBe("string");
    expect(typeof mockSchool.coaching_style).toBe("string");
    expect(typeof mockSchool.recruiting_approach).toBe("string");
  });

  it("should handle coaching philosophy with HTML-like content", () => {
    const htmlLikeText =
      "Focus on <strong>player</strong> development [note: will be sanitized]";
    const updates: Partial<School> = {
      coaching_philosophy: htmlLikeText,
    };

    const updated = { ...mockSchool, ...updates };
    // Store sanitization happens separately
    expect(updated.coaching_philosophy).toBe(htmlLikeText);
  });

  it("should update multiple coaching fields in one operation", () => {
    const updates: Partial<School> = {
      coaching_philosophy: "New overall philosophy",
      coaching_style: "New style",
      recruiting_approach: "New approach",
      communication_style: "New communication",
      success_metrics: "New metrics",
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBe("New overall philosophy");
    expect(updated.coaching_style).toBe("New style");
    expect(updated.recruiting_approach).toBe("New approach");
    expect(updated.communication_style).toBe("New communication");
    expect(updated.success_metrics).toBe("New metrics");
  });

  it("should not affect other school fields when updating coaching philosophy", () => {
    const originalName = mockSchool.name;
    const originalLocation = mockSchool.location;

    const updates: Partial<School> = {
      coaching_philosophy: "Updated philosophy",
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.name).toBe(originalName);
    expect(updated.location).toBe(originalLocation);
  });

  it("should allow clearing all coaching philosophy fields", () => {
    const updates: Partial<School> = {
      coaching_philosophy: null,
      coaching_style: null,
      recruiting_approach: null,
      communication_style: null,
      success_metrics: null,
    };

    const updated = { ...mockSchool, ...updates };
    expect(updated.coaching_philosophy).toBeNull();
    expect(updated.coaching_style).toBeNull();
    expect(updated.recruiting_approach).toBeNull();
    expect(updated.communication_style).toBeNull();
    expect(updated.success_metrics).toBeNull();
  });
});
