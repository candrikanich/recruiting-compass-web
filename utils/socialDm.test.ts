import { describe, it, expect } from "vitest";
import { socialDmInteraction } from "./socialDm";

describe("socialDmInteraction", () => {
  it("builds an outbound dm interaction for the coach", () => {
    const result = socialDmInteraction({ id: "c1", school_id: "s1" });
    expect(result).toEqual({
      school_id: "s1",
      coach_id: "c1",
      type: "dm",
      direction: "outbound",
    });
  });

  it("omits school_id when the coach has none", () => {
    const result = socialDmInteraction({ id: "c1", school_id: null });
    expect(result.school_id).toBeUndefined();
    expect(result.coach_id).toBe("c1");
    expect(result.type).toBe("dm");
    expect(result.direction).toBe("outbound");
  });
});
