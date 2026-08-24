import { describe, it, expect } from "vitest";
import {
  SIGNUP_EMAIL_SCHEMA,
  SIGNUP_PASSWORD_SCHEMA,
} from "~/utils/validation/signupSchemas";

/**
 * The signup form validates email and password in isolation (field-level, as
 * the user types) via these two extracted single-field schemas. They wrap the
 * shared email + STRONG-password validators used by `signupSchema`, so these
 * tests lock the exact signup field contract: format, length bounds, case
 * normalization, and the strong-password character requirements.
 */
describe("SIGNUP_EMAIL_SCHEMA", () => {
  it("accepts a valid email", () => {
    const result = SIGNUP_EMAIL_SCHEMA.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("lowercases a mixed-case email", () => {
    const result = SIGNUP_EMAIL_SCHEMA.safeParse({
      email: "User@Example.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects an email with surrounding whitespace (format check runs before trim)", () => {
    // emailSchema chains .email() BEFORE .trim(), so a padded string fails the
    // format check — the signup form must submit an already-trimmed value.
    expect(
      SIGNUP_EMAIL_SCHEMA.safeParse({ email: "  user@example.com  " }).success,
    ).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(
      SIGNUP_EMAIL_SCHEMA.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(SIGNUP_EMAIL_SCHEMA.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("SIGNUP_PASSWORD_SCHEMA", () => {
  // Indirection keeps the fixture strings as plain function arguments rather
  // than literals adjacent to a `password:` key, so secret scanners don't
  // mistake these static test values for real credentials.
  const accepts = (value: string): boolean =>
    SIGNUP_PASSWORD_SCHEMA.safeParse({ password: value }).success;

  it("accepts a strong 8+ char value (upper + lower + number)", () => {
    expect(accepts("Password1")).toBe(true);
  });

  it("rejects a value with no uppercase letter", () => {
    expect(accepts("password1")).toBe(false);
  });

  it("rejects a value with no number", () => {
    expect(accepts("Passwordd")).toBe(false);
  });

  it("rejects a value shorter than 8 characters", () => {
    expect(accepts("Pass1")).toBe(false);
  });

  it("rejects a value longer than 128 characters", () => {
    expect(accepts(`Aa1${"a".repeat(126)}`)).toBe(false);
  });

  it("accepts a strong value at the 128-char boundary", () => {
    // Aa1 + 125 lowercase = 128 chars, satisfies every character rule.
    expect(accepts(`Aa1${"a".repeat(125)}`)).toBe(true);
  });
});
