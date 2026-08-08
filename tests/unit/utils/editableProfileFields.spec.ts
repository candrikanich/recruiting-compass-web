import { describe, it, expect } from "vitest";
import {
  editableColumnFor,
  coerceProfileValue,
  EDITABLE_USERS_COLUMNS,
  type ProfileColSpec,
} from "~/utils/editableProfileFields";

describe("editableColumnFor — the write-back whitelist gate", () => {
  it("accepts a whitelisted users column path and returns the bare column", () => {
    expect(editableColumnFor("column:users.high_school")).toBe("high_school");
    expect(editableColumnFor("column:users.height_inches")).toBe("height_inches");
    expect(editableColumnFor("column:users.gpa")).toBe("gpa");
  });

  it("rejects a users column that is NOT whitelisted (security: no arbitrary writes)", () => {
    expect(editableColumnFor("column:users.email")).toBeNull();
    expect(editableColumnFor("column:users.role")).toBeNull();
    expect(editableColumnFor("column:users.is_admin")).toBeNull();
    expect(editableColumnFor("column:users.id")).toBeNull();
    expect(editableColumnFor("column:users.family_unit_id")).toBeNull();
  });

  it("rejects non-users sources (pref, other tables, computed)", () => {
    expect(editableColumnFor("pref:player.ncaa_id")).toBeNull();
    expect(editableColumnFor("column:schools.name")).toBeNull();
    expect(editableColumnFor("column:coaches.role")).toBeNull();
  });

  it("rejects malformed / empty / null input", () => {
    expect(editableColumnFor(null)).toBeNull();
    expect(editableColumnFor(undefined)).toBeNull();
    expect(editableColumnFor("")).toBeNull();
    expect(editableColumnFor("users.high_school")).toBeNull(); // missing prefix
    expect(editableColumnFor("column:users.")).toBeNull(); // no column
    expect(editableColumnFor("column:users")).toBeNull();
  });

  it("does not treat a prefix-collision path as editable", () => {
    // 'column:users.high_school_extra' is not a real whitelisted key
    expect(editableColumnFor("column:users.high_school_extra")).toBeNull();
  });

  it("every whitelisted column has a valid type + coherent bounds", () => {
    for (const [col, spec] of Object.entries(EDITABLE_USERS_COLUMNS)) {
      expect(["text", "int", "numeric"]).toContain(spec.type);
      if (spec.min != null && spec.max != null) {
        expect(spec.min).toBeLessThan(spec.max);
      }
      // round-trips through the gate
      expect(editableColumnFor(`column:users.${col}`)).toBe(col);
    }
  });
});

describe("coerceProfileValue — coercion + bounds", () => {
  const text: ProfileColSpec = { type: "text" };
  const gradYear: ProfileColSpec = { type: "int", min: 2020, max: 2035 };
  const gpa: ProfileColSpec = { type: "numeric", min: 0, max: 5 };

  it("empty / whitespace / null clears the field (null)", () => {
    expect(coerceProfileValue("", text)).toEqual({ ok: true, value: null });
    expect(coerceProfileValue("   ", text)).toEqual({ ok: true, value: null });
    expect(coerceProfileValue(null, text)).toEqual({ ok: true, value: null });
  });

  it("trims text and rejects over-long values", () => {
    expect(coerceProfileValue("  Olmsted Falls HS  ", text)).toEqual({ ok: true, value: "Olmsted Falls HS" });
    const long = coerceProfileValue("x".repeat(201), text);
    expect(long.ok).toBe(false);
  });

  it("parses ints and enforces integer + range", () => {
    expect(coerceProfileValue("2027", gradYear)).toEqual({ ok: true, value: 2027 });
    expect(coerceProfileValue("1999", gradYear)).toEqual({ ok: false, error: "Value out of range" });
    expect(coerceProfileValue("2040", gradYear)).toEqual({ ok: false, error: "Value out of range" });
    expect(coerceProfileValue("2027.5", gradYear)).toEqual({ ok: false, error: "Value must be a whole number" });
    expect(coerceProfileValue("abc", gradYear)).toEqual({ ok: false, error: "Value must be a number" });
  });

  it("parses numeric (gpa) with range, allowing decimals", () => {
    expect(coerceProfileValue("3.8", gpa)).toEqual({ ok: true, value: 3.8 });
    expect(coerceProfileValue("6", gpa)).toEqual({ ok: false, error: "Value out of range" });
    expect(coerceProfileValue("-1", gpa)).toEqual({ ok: false, error: "Value out of range" });
  });
});
