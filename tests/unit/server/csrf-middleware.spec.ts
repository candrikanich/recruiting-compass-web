import { describe, it, expect } from "vitest";

// Test the path matching logic in isolation (not the full H3 event)
// We extract and test the exemption logic directly

const CSRF_EXEMPT_PREFIXES = [
  "/api/csrf-token",
  "/api/health",
  "/api/auth",
] as const;

const CSRF_EXEMPT_EXACT_PATHS = [
  "/api/athlete/fit-scores/recalculate-all",
] as const;

const CSRF_EXEMPT_PATTERNS: Array<{ prefixes: string[]; suffix: string }> = [
  {
    prefixes: ["/api/schools/", "/api/coaches/", "/api/interactions/"],
    suffix: "/cascade-delete",
  },
  {
    prefixes: ["/api/schools/", "/api/coaches/", "/api/interactions/"],
    suffix: "/deletion-blockers",
  },
];

function isExempt(path: string): boolean {
  if (CSRF_EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return true;
  if (CSRF_EXEMPT_EXACT_PATHS.some((p) => path === p)) return true;
  for (const { prefixes, suffix } of CSRF_EXEMPT_PATTERNS) {
    if (path.endsWith(suffix) && prefixes.some((p) => path.startsWith(p))) {
      return true;
    }
  }
  return false;
}

describe("CSRF middleware path exemptions", () => {
  describe("exempt paths", () => {
    it("exempts /api/csrf-token", () => {
      expect(isExempt("/api/csrf-token")).toBe(true);
    });
    it("exempts /api/health", () => {
      expect(isExempt("/api/health")).toBe(true);
    });
    it("exempts /api/auth/*", () => {
      expect(isExempt("/api/auth/login")).toBe(true);
    });
    it("exempts fit-scores recalculate exact path", () => {
      expect(isExempt("/api/athlete/fit-scores/recalculate-all")).toBe(true);
    });
    it("exempts schools cascade-delete", () => {
      expect(isExempt("/api/schools/abc-123/cascade-delete")).toBe(true);
    });
    it("exempts coaches cascade-delete", () => {
      expect(isExempt("/api/coaches/def-456/cascade-delete")).toBe(true);
    });
    it("exempts interactions deletion-blockers", () => {
      expect(isExempt("/api/interactions/ghi-789/deletion-blockers")).toBe(
        true,
      );
    });
  });

  describe("non-exempt paths (must require CSRF)", () => {
    it("does NOT exempt /api/schools/ list endpoint", () => {
      expect(isExempt("/api/schools/")).toBe(false);
    });
    it("does NOT exempt /api/schools/create", () => {
      expect(isExempt("/api/schools/create")).toBe(false);
    });
    it("does NOT exempt /api/coaches/update", () => {
      expect(isExempt("/api/coaches/update")).toBe(false);
    });
    it("does NOT exempt arbitrary paths containing 'schools'", () => {
      expect(isExempt("/api/admin/schools/export")).toBe(false);
    });
    it("does NOT exempt fit-scores partial path", () => {
      expect(isExempt("/api/athlete/fit-scores/recalculate-all/extra")).toBe(
        false,
      );
    });
  });
});
