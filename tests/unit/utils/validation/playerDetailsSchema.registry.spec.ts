import { describe, it, expect } from "vitest";
import { playerDetailsSchema } from "~/utils/validation/schemas";
import { ALL_ATTRIBUTE_DEFS } from "~/utils/attributes/canonical";
import { ALL_SERVICE_DEFS } from "~/utils/services/canonical";

/**
 * Drift guard: `playerDetailsSchema` strips unknown keys on save (safeParse, no
 * passthrough), so any registry-backed attribute/service missing from the schema
 * is silently dropped when the athlete saves it. These tests fail the moment a
 * registry gains a key the schema doesn't validate — the exact failure mode this
 * refactor exists to prevent.
 */
describe("playerDetailsSchema ↔ registry parity", () => {
  const shapeKeys = new Set(Object.keys(playerDetailsSchema.shape));

  it("validates every athlete-attribute registry key", () => {
    const missing = ALL_ATTRIBUTE_DEFS.map((d) => d.key).filter(
      (k) => !shapeKeys.has(k),
    );
    expect(missing).toEqual([]);
  });

  it("validates every recruiting-service registry key", () => {
    const missing = ALL_SERVICE_DEFS.map((d) => d.key).filter(
      (k) => !shapeKeys.has(k),
    );
    expect(missing).toEqual([]);
  });

  it("accepts each attribute's registry option tokens and rejects unknown ones", () => {
    for (const def of ALL_ATTRIBUTE_DEFS) {
      for (const token of def.options) {
        const result = playerDetailsSchema.safeParse({
          graduation_year: 2027,
          [def.key]: token,
        });
        expect(result.success, `${def.key}=${token} should be valid`).toBe(true);
      }
      const bad = playerDetailsSchema.safeParse({
        graduation_year: 2027,
        [def.key]: "__not_a_real_token__",
      });
      expect(bad.success, `${def.key} should reject a bogus token`).toBe(false);
    }
  });

  it("accepts a value for every id-kind service key", () => {
    for (const def of ALL_SERVICE_DEFS.filter((d) => d.valueKind === "id")) {
      const result = playerDetailsSchema.safeParse({
        graduation_year: 2027,
        [def.key]: "12345",
      });
      expect(result.success, `${def.key} should accept an id`).toBe(true);
    }
  });

  it("accepts a URL for every url-kind service key", () => {
    for (const def of ALL_SERVICE_DEFS.filter((d) => d.valueKind === "url")) {
      const result = playerDetailsSchema.safeParse({
        graduation_year: 2027,
        [def.key]: "https://example.com/profile/123",
      });
      expect(result.success, `${def.key} should accept a URL`).toBe(true);
    }
  });
});
