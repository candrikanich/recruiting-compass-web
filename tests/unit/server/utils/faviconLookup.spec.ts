import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  findFaviconUrl,
  isAllowedDomain,
  isPrivateIp,
  normalizeDomain,
} from "~/server/utils/faviconLookup";

const mockLookup = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({
  lookup: mockLookup,
  default: { lookup: mockLookup },
}));

describe("faviconLookup", () => {
  describe("normalizeDomain", () => {
    it("strips protocol and www", () => {
      expect(normalizeDomain("https://www.florida.edu")).toBe("florida.edu");
      expect(normalizeDomain("http://mit.edu/")).toBe("mit.edu");
    });

    it("lowercases and sanitizes unsafe characters", () => {
      expect(normalizeDomain("Florida State.EDU")).toBe("florida-state.edu");
    });

    it("trims leading/trailing dashes from sanitization", () => {
      expect(normalizeDomain(" florida.edu ")).toBe("florida.edu");
    });
  });

  describe("isAllowedDomain", () => {
    it("allows normal public domains", () => {
      expect(isAllowedDomain("florida.edu")).toBe(true);
      expect(isAllowedDomain("bc.edu")).toBe(true);
    });

    it("rejects bare hostnames without dots", () => {
      expect(isAllowedDomain("localhost")).toBe(false);
      expect(isAllowedDomain("metadata")).toBe(false);
    });

    it("rejects private and loopback IPs", () => {
      expect(isAllowedDomain("127.0.0.1")).toBe(false);
      expect(isAllowedDomain("10.0.0.5")).toBe(false);
      expect(isAllowedDomain("192.168.1.1")).toBe(false);
      expect(isAllowedDomain("169.254.169.254")).toBe(false);
    });

    it("rejects domains with ports", () => {
      expect(isAllowedDomain("florida.edu:8080")).toBe(false);
    });

    it("rejects all IP-literals — school websites are hostnames", () => {
      expect(isAllowedDomain("8.8.8.8")).toBe(false);
      expect(isAllowedDomain("0.0.0.0")).toBe(false);
    });
  });

  describe("isPrivateIp", () => {
    it("flags loopback, RFC1918, link-local, CGNAT, multicast", () => {
      expect(isPrivateIp("127.0.0.1")).toBe(true);
      expect(isPrivateIp("10.1.2.3")).toBe(true);
      expect(isPrivateIp("172.20.0.1")).toBe(true);
      expect(isPrivateIp("192.168.0.1")).toBe(true);
      expect(isPrivateIp("169.254.169.254")).toBe(true);
      expect(isPrivateIp("100.64.0.1")).toBe(true);
      expect(isPrivateIp("224.0.0.1")).toBe(true);
    });

    it("flags IPv6 loopback, ULA, link-local, and v4-mapped private", () => {
      expect(isPrivateIp("::1")).toBe(true);
      expect(isPrivateIp("fd12:3456::1")).toBe(true);
      expect(isPrivateIp("fe80::1")).toBe(true);
      expect(isPrivateIp("::ffff:10.0.0.5")).toBe(true);
    });

    it("allows public addresses", () => {
      expect(isPrivateIp("93.184.216.34")).toBe(false);
      expect(isPrivateIp("2606:4700::6810:84e5")).toBe(false);
      expect(isPrivateIp("::ffff:93.184.216.34")).toBe(false);
    });
  });

  describe("findFaviconUrl", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.useRealTimers();
    });

    it("returns the first source that responds ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await findFaviconUrl("florida.edu", "florida.edu");

      expect(result).toContain("florida.edu");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("returns null when all sources fail", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network"));

      const result = await findFaviconUrl("nonexistent.edu", "nonexistent.edu");

      expect(result).toBeNull();
    });

    it("never fetches school-host sources when DNS resolves private (SSRF)", async () => {
      mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      const result = await findFaviconUrl("internal.evil.com", "internal.evil.com");

      expect(result).toBeNull();
      const fetchedUrls = vi
        .mocked(global.fetch)
        .mock.calls.map(([url]) => String(url));
      expect(fetchedUrls.length).toBeGreaterThan(0); // trusted providers still probed
      for (const url of fetchedUrls) {
        expect(url).not.toContain("//internal.evil.com");
        expect(url).not.toContain("//www.internal.evil.com");
      }
    });

    it("never fetches when DNS resolution fails", async () => {
      mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      await findFaviconUrl("nonexistent.edu", "nonexistent.edu");

      const fetchedUrls = vi
        .mocked(global.fetch)
        .mock.calls.map(([url]) => String(url));
      for (const url of fetchedUrls) {
        expect(url).not.toContain("//nonexistent.edu");
      }
    });

    it("does not follow redirects (blocks 302-into-internal pivots)", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await findFaviconUrl("florida.edu", "florida.edu");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ redirect: "manual" }),
      );
    });

    it("stops probing once the deadline is exhausted", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await findFaviconUrl("florida.edu", "florida.edu", {
        deadlineMs: 0,
      });

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("skips non-ok responses and tries the next source", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValue({ ok: true });

      const result = await findFaviconUrl("florida.edu", "florida.edu");

      expect(result).toBeTruthy();
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(2);
    });
  });
});
