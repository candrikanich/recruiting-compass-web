/**
 * Auth Flow With Onboarding Integration Tests
 *
 * The previous version of this file (86 tests) was fully tautological —
 * every test body was `expect(true).toBe(true); // <narrated behavior>`
 * describing a signup -> onboarding -> family-link UI journey that was
 * never actually exercised against real code. Deleted in full; see
 * planning/audit-2026-07-27-findings.md ("6. Testing") and
 * .superpowers/sdd/task-11-report.md for what replaces it in the following
 * commit.
 */
import { describe, it } from "vitest";

describe.skip(
  "Auth Flow With Onboarding Integration Tests (real tests land in the next commit)",
  () => {
    it.skip("placeholder removed — see task-11-report.md", () => {});
  },
);
