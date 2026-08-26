import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { verifyTurnstile, isHoneypotTripped } from "~/server/utils/turnstile";

describe("turnstile", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.NUXT_TURNSTILE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.NUXT_TURNSTILE_SECRET_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.NUXT_TURNSTILE_SECRET_KEY;
    } else {
      process.env.NUXT_TURNSTILE_SECRET_KEY = originalKey;
    }
  });

  describe("verifyTurnstile", () => {
    it("resolves ok:true reason:disabled when no secret key is configured (no fetch call)", async () => {
      global.fetch = vi.fn();

      const result = await verifyTurnstile("anything");

      expect(result).toEqual({ ok: true, reason: "disabled" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("resolves ok:true when secret set and Cloudflare reports success", async () => {
      process.env.NUXT_TURNSTILE_SECRET_KEY = "test-secret";
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await verifyTurnstile("token-123", "1.2.3.4");

      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        expect.objectContaining({ method: "POST" }),
      );
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
