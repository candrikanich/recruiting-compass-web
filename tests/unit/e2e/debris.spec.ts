import { describe, expect, it } from "vitest";
import { isDebris } from "../../../tests/e2e/seed/helpers/debris";

describe("isDebris", () => {
  it("does not match a real personal test-player account with no epoch id", () => {
    // test.player2028@andrikanich.com is Chris's real manual QA account
    // (2028 = graduation year, not an epoch timestamp). It was getting
    // silently deleted by global-teardown after every E2E run.
    expect(isDebris("test.player2028@andrikanich.com")).toBe(false);
  });

  it("still matches genuine e2e-minted debris with a 10+ digit epoch", () => {
    expect(isDebris("e2e-parent-1234567890@test-example.com")).toBe(true);
    expect(isDebris("player-e2e-1699999999@example.com")).toBe(true);
  });
});
