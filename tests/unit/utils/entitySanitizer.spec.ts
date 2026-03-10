import { describe, it, expect, vi } from "vitest";

vi.mock("~/utils/validation/sanitize", () => ({
  sanitizeHtml: vi.fn((s: string) => s.replace(/<[^>]*>/g, "")),
}));

import {
  sanitizeCoachFields,
  sanitizeSchoolFields,
} from "~/utils/sanitizers/entitySanitizer";

describe("sanitizeCoachFields", () => {
  it("sanitizes notes field when present", () => {
    const result = sanitizeCoachFields({ notes: "<b>test</b>" });
    expect(result.notes).toBe("test");
  });

  it("leaves notes undefined when not provided", () => {
    const result = sanitizeCoachFields({ first_name: "John" });
    expect(result.notes).toBeUndefined();
  });

  it("returns a new object (immutable)", () => {
    const input = { notes: "test" };
    expect(sanitizeCoachFields(input)).not.toBe(input);
  });
});

describe("sanitizeSchoolFields", () => {
  it("sanitizes notes field", () => {
    const result = sanitizeSchoolFields({ notes: "<b>ok</b>" });
    expect(result.notes).toBe("ok");
  });

  it("sanitizes each item in pros array", () => {
    const result = sanitizeSchoolFields({ pros: ["<b>good</b>", "clean"] });
    expect(result.pros).toEqual(["good", "clean"]);
  });

  it("sanitizes each item in cons array", () => {
    const result = sanitizeSchoolFields({ cons: ["<i>bad</i>"] });
    expect(result.cons).toEqual(["bad"]);
  });

  it("returns a new object (immutable)", () => {
    const input = { notes: "test" };
    expect(sanitizeSchoolFields(input)).not.toBe(input);
  });
});

describe("sanitizeSchoolFields — additional rich-text fields", () => {
  it("strips XSS from coaching_philosophy", () => {
    const r = sanitizeSchoolFields({ coaching_philosophy: "<b>philosophy</b>" });
    expect(r.coaching_philosophy).toBe("philosophy");
  });

  it("strips XSS from coaching_style", () => {
    const r = sanitizeSchoolFields({ coaching_style: "<b>bold</b>" });
    expect(r.coaching_style).toBe("bold");
  });

  it("strips XSS from recruiting_approach", () => {
    const r = sanitizeSchoolFields({ recruiting_approach: "<i>ok</i>" });
    expect(r.recruiting_approach).toBe("ok");
  });

  it("strips XSS from communication_style", () => {
    const r = sanitizeSchoolFields({ communication_style: "<em>em</em>" });
    expect(r.communication_style).toBe("em");
  });

  it("strips XSS from success_metrics", () => {
    const r = sanitizeSchoolFields({ success_metrics: "<mark>mark</mark>" });
    expect(r.success_metrics).toBe("mark");
  });
});
