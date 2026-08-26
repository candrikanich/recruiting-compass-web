import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verifyTurnstile, isHoneypotTripped } from "~/server/utils/turnstile";

describe("turnstile", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.NUXT_TURNSTILE_SECRET_KEY;
  const originalHostnames = process.env.NUXT_TURNSTILE_HOSTNAMES;

  beforeEach(() => {
    delete process.env.NUXT_TURNSTILE_SECRET_KEY;
    delete process.env.NUXT_TURNSTILE_HOSTNAMES;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.NUXT_TURNSTILE_SECRET_KEY;
    } else {
      process.env.NUXT_TURNSTILE_SECRET_KEY = originalKey;
    }
    if (originalHostnames === undefined) {
      delete process.env.NUXT_TURNSTILE_HOSTNAMES;
    } else {
      process.env.NUXT_TURNSTILE_HOSTNAMES = originalHostnames;
    }
  });

  describe("verifyTurnstile", () => {
    it("resolves ok:true reason:disabled when no secret key is configured (no fetch call)", async () => {
      global.fetch = vi.fn();

      const result = await verifyTurnstile("anything");

      expect(result).toEqual({ ok: true, reason: "disabled" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("resolves ok:true when secret set, success true, and action matches expectedAction", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            action: "contact",
            hostname: "example.com",
          }),
      });

      const result = await verifyTurnstile("token-123", {
        ip: "1.2.3.4",
        expectedAction: "contact",
      });

      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("resolves ok:true when no expectedAction is passed (action not checked)", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, action: "whatever" }),
      });

      const result = await verifyTurnstile("token-123");

      expect(result).toEqual({ ok: true });
    });

    it("resolves ok:false reason:action_mismatch when action does not match expectedAction", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, action: "login" }),
      });

      const result = await verifyTurnstile("token-123", {
        expectedAction: "contact",
      });

      expect(result).toEqual({ ok: false, reason: "action_mismatch" });
    });

    it("resolves ok:false when Cloudflare reports success:false", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      });

      const result = await verifyTurnstile("token-123");

      expect(result).toEqual({ ok: false });
    });

    it("resolves ok:true when NUXT_TURNSTILE_HOSTNAMES is set and hostname matches", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      process.env.NUXT_TURNSTILE_HOSTNAMES = "example.com, other.com";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, hostname: "example.com" }),
      });

      const result = await verifyTurnstile("token-123");

      expect(result).toEqual({ ok: true });
    });

    it("resolves ok:false reason:hostname_mismatch when NUXT_TURNSTILE_HOSTNAMES is set and hostname does not match", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      process.env.NUXT_TURNSTILE_HOSTNAMES = "example.com";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, hostname: "evil.com" }),
      });

      const result = await verifyTurnstile("token-123");

      expect(result).toEqual({ ok: false, reason: "hostname_mismatch" });
    });

    it("ignores hostname when NUXT_TURNSTILE_HOSTNAMES is unset", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, hostname: "anything-at-all.com" }),
      });

      const result = await verifyTurnstile("token-123");

      expect(result).toEqual({ ok: true });
    });

    it("resolves ok:false reason:missing_token and never calls fetch when token is undefined", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn();

      const result = await verifyTurnstile(undefined);

      expect(result).toEqual({ ok: false, reason: "missing_token" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("resolves ok:false reason:missing_token and never calls fetch when token is empty string", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn();

      const result = await verifyTurnstile("");

      expect(result).toEqual({ ok: false, reason: "missing_token" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("resolves ok:false reason:missing_token and never calls fetch when token exceeds 2048 chars", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn();

      const result = await verifyTurnstile("a".repeat(2049));

      expect(result).toEqual({ ok: false, reason: "missing_token" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("resolves ok:false reason:verify_failed and never throws when fetch rejects", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

      await expect(verifyTurnstile("token-123")).resolves.toEqual({
        ok: false,
        reason: "verify_failed",
      });
    });

    it("resolves ok:false reason:verify_failed on non-2xx response", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const result = await verifyTurnstile("token-123");

      expect(result).toEqual({ ok: false, reason: "verify_failed" });
    });
  });

  describe("isHoneypotTripped", () => {
    it("returns true for a non-empty string", () => {
      expect(isHoneypotTripped("x")).toBe(true);
    });

    it("returns false for an empty string", () => {
      expect(isHoneypotTripped("")).toBe(false);
    });

    it("returns false for a whitespace-only string", () => {
      expect(isHoneypotTripped("   ")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isHoneypotTripped(undefined)).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isHoneypotTripped(123)).toBe(false);
      expect(isHoneypotTripped(null)).toBe(false);
    });
  });
});
