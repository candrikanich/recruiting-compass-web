import { describe, it, expect } from "vitest";
import { getRoleLabel } from "~/utils/coachLabels";

describe("coachLabels", () => {
  describe("getRoleLabel", () => {
    it("returns correct label for known roles", () => {
      expect(getRoleLabel("head")).toBe("Head Coach");
      expect(getRoleLabel("assistant")).toBe("Assistant Coach");
      expect(getRoleLabel("recruiting")).toBe("Recruiting Coordinator");
    });

    it("returns raw role for unknown roles", () => {
      expect(getRoleLabel("volunteer")).toBe("volunteer");
      expect(getRoleLabel("intern")).toBe("intern");
    });
  });
});
