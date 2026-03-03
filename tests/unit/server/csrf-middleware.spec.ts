import { describe, it, expect } from "vitest";

// Test the exemption logic in isolation (not the full H3 event).
// Mirrors the exact conditions used in server/middleware/csrf.ts.

// ─── Bearer + cookie logic ────────────────────────────────────────────────────

/**
 * Returns true only when the request looks like a cookie-less iOS Bearer request.
 * Web browsers send both a Bearer token AND the sb-access-token cookie, so they
 * must still go through CSRF validation.
 */
function isBearerOnly(
  authorizationHeader: string | undefined,
  sbAccessTokenCookie: string | undefined,
): boolean {
  return (
    (authorizationHeader?.trimStart().startsWith("Bearer ") ?? false) &&
    !sbAccessTokenCookie
  );
}

// ─── Path matching logic ──────────────────────────────────────────────────────

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

describe("Bearer-only exemption (iOS vs web browser)", () => {
  it("exempts iOS: Bearer token present, no sb-access-token cookie", () => {
    expect(isBearerOnly("Bearer abc123", undefined)).toBe(true);
  });

  it("exempts iOS: Bearer token with leading whitespace, no cookie", () => {
    expect(isBearerOnly("  Bearer abc123", undefined)).toBe(true);
  });

  it("does NOT exempt web browser: Bearer token present AND sb-access-token cookie present", () => {
    expect(isBearerOnly("Bearer abc123", "supabase-session-token")).toBe(false);
  });

  it("does NOT exempt requests with no auth header and no cookie", () => {
    expect(isBearerOnly(undefined, undefined)).toBe(false);
  });

  it("does NOT exempt requests with no auth header but with cookie", () => {
    expect(isBearerOnly(undefined, "supabase-session-token")).toBe(false);
  });

  it("does NOT exempt non-Bearer auth schemes (Basic, etc.)", () => {
    expect(isBearerOnly("Basic dXNlcjpwYXNz", undefined)).toBe(false);
  });
});

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
    it("does NOT exempt /api/family/ (blanket exemption removed)", () => {
      expect(isExempt("/api/family/")).toBe(false);
    });
    it("does NOT exempt /api/family/invite", () => {
      expect(isExempt("/api/family/invite")).toBe(false);
    });
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
