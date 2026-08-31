import { describe, it, expect } from "vitest";
import { coachSchema } from "~/utils/validation/schemas";

const base = {
  first_name: "Dana",
  last_name: "Whitfield",
  role: "head" as const,
};

describe("coachSchema tags/source", () => {
  it("accepts tags array and source string", () => {
    const r = coachSchema.parse({
      ...base,
      tags: ["Football", "Division I"],
      source: "LinkedIn",
    });
    expect(r.tags).toEqual(["Football", "Division I"]);
    expect(r.source).toBe("LinkedIn");
  });

  it("defaults tags to empty array when omitted", () => {
    const r = coachSchema.parse(base);
    expect(r.tags).toEqual([]);
  });

  it("rejects a tag longer than 40 chars", () => {
    expect(() =>
      coachSchema.parse({ ...base, tags: ["x".repeat(41)] }),
    ).toThrow();
  });
});
