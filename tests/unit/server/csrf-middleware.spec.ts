import { describe, it, expect, vi } from "vitest";

// server/middleware/csrf.ts's default export relies on Nuxt's ambient
// `defineEventHandler` global (normally injected by the Nitro build); the
// named predicate exports this file cares about don't need it, but simply
// importing the module still evaluates that line, so stub it.
vi.stubGlobal("defineEventHandler", (fn: unknown) => fn);

const {
  isBearerOnlyRequest,
  isCsrfExemptPath,
  CSRF_EXEMPT_PREFIXES,
  CSRF_EXEMPT_EXACT_PATHS,
  CSRF_STATE_CHANGING_METHODS,
} = await import("~/server/middleware/csrf");

// Imports the REAL predicates from server/middleware/csrf.ts instead of a
// hand-copied reimplementation. planning/audit-2026-07-27-findings.md
// flagged the previous version of this file (lines 4-52) for testing a
// duplicate of the exemption logic that could drift from the real
// middleware silently — and it already had: this file used to also assert
// a CSRF_EXEMPT_PATTERNS suffix-based exemption (cascade-delete /
// deletion-blockers) that does NOT exist in the real middleware, and never
// tested the two CSRF_EXEMPT_EXACT_PATHS entries that DO
// (/api/athlete/fit-scores/recalculate-all, /api/email/unsubscribe) — see
// the Phase 11 report for the drift-proof demonstration.

describe("Bearer-only exemption (iOS vs web browser)", () => {
  it("exempts iOS: Bearer token present, no sb-access-token cookie", () => {
    expect(isBearerOnlyRequest("Bearer abc123", undefined)).toBe(true);
  });

  it("exempts iOS: Bearer token with leading whitespace, no cookie", () => {
    expect(isBearerOnlyRequest("  Bearer abc123", undefined)).toBe(true);
  });

  it("does NOT exempt web browser: Bearer token present AND sb-access-token cookie present", () => {
    expect(isBearerOnlyRequest("Bearer abc123", "supabase-session-token")).toBe(
      false,
    );
  });

  it("does NOT exempt requests with no auth header and no cookie", () => {
    expect(isBearerOnlyRequest(undefined, undefined)).toBe(false);
  });

  it("does NOT exempt requests with no auth header but with cookie", () => {
    expect(isBearerOnlyRequest(undefined, "supabase-session-token")).toBe(
      false,
    );
  });

  it("does NOT exempt non-Bearer auth schemes (Basic, etc.)", () => {
    expect(isBearerOnlyRequest("Basic dXNlcjpwYXNz", undefined)).toBe(false);
  });
});

describe("CSRF middleware path exemptions", () => {
  describe("exempt paths", () => {
    it("exempts /api/csrf-token", () => {
      expect(isCsrfExemptPath("/api/csrf-token")).toBe(true);
    });
    it("exempts /api/health", () => {
      expect(isCsrfExemptPath("/api/health")).toBe(true);
    });
    it("exempts /api/auth/*", () => {
      expect(isCsrfExemptPath("/api/auth/login")).toBe(true);
    });
    it("exempts the fit-scores recalculate-all exact path", () => {
      expect(isCsrfExemptPath("/api/athlete/fit-scores/recalculate-all")).toBe(
        true,
      );
    });
    it("exempts the RFC 8058 one-click email unsubscribe exact path", () => {
      expect(isCsrfExemptPath("/api/email/unsubscribe")).toBe(true);
    });
    it("does not exempt undefined path", () => {
      expect(isCsrfExemptPath(undefined)).toBe(false);
    });
  });

  describe("non-exempt paths (must require CSRF)", () => {
    it("does NOT exempt /api/family/ (blanket exemption removed)", () => {
      expect(isCsrfExemptPath("/api/family/")).toBe(false);
    });
    it("does NOT exempt /api/family/invite", () => {
      expect(isCsrfExemptPath("/api/family/invite")).toBe(false);
    });
    it("does NOT exempt /api/schools/ list endpoint", () => {
      expect(isCsrfExemptPath("/api/schools/")).toBe(false);
    });
    it("does NOT exempt /api/schools/create", () => {
      expect(isCsrfExemptPath("/api/schools/create")).toBe(false);
    });
    it("does NOT exempt /api/coaches/update", () => {
      expect(isCsrfExemptPath("/api/coaches/update")).toBe(false);
    });
    it("does NOT exempt arbitrary paths containing 'schools'", () => {
      expect(isCsrfExemptPath("/api/admin/schools/export")).toBe(false);
    });
    // Regression guard for the drift this file previously had: there is no
    // suffix-based cascade-delete/deletion-blockers exemption in the real
    // middleware — those routes must go through normal CSRF validation.
    it("does NOT exempt /api/schools/:id/cascade-delete (no such exemption in the real middleware)", () => {
      expect(isCsrfExemptPath("/api/schools/abc-123/cascade-delete")).toBe(
        false,
      );
    });
    it("does NOT exempt /api/interactions/:id/deletion-blockers (no such exemption in the real middleware)", () => {
      expect(
        isCsrfExemptPath("/api/interactions/ghi-789/deletion-blockers"),
      ).toBe(false);
    });
  });
});

describe("exported constants match what the middleware actually enforces", () => {
  it("CSRF_STATE_CHANGING_METHODS covers exactly the mutating HTTP methods", () => {
    expect([...CSRF_STATE_CHANGING_METHODS].sort()).toEqual(
      ["DELETE", "PATCH", "POST", "PUT"].sort(),
    );
  });

  it("CSRF_EXEMPT_PREFIXES contains exactly the exempt prefixes the middleware enforces", () => {
    expect([...CSRF_EXEMPT_PREFIXES]).toEqual([
      "/api/csrf-token",
      "/api/health",
      "/api/auth",
    ]);
  });

  it("CSRF_EXEMPT_EXACT_PATHS contains exactly the exempt exact paths the middleware enforces", () => {
    expect([...CSRF_EXEMPT_EXACT_PATHS]).toEqual([
      "/api/athlete/fit-scores/recalculate-all",
      "/api/email/unsubscribe",
    ]);
  });
});
