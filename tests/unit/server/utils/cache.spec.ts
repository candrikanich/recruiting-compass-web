import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCached,
  setCached,
  clearCache,
  clearAllCache,
  clearCachePattern,
  getOrFetch,
} from "~/server/utils/cache";

describe("server/utils/cache", () => {
  beforeEach(() => {
    clearAllCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCached / setCached", () => {
    it("returns null for missing key", () => {
      expect(getCached("missing")).toBeNull();
    });

    it("returns cached value before TTL expires", () => {
      setCached("key", { foo: "bar" }, 60);
      expect(getCached("key")).toEqual({ foo: "bar" });
    });

    it("returns null after TTL expires", () => {
      setCached("key", "value", 1);
      vi.advanceTimersByTime(1001);
      expect(getCached("key")).toBeNull();
    });
  });

  describe("clearCache", () => {
    it("removes a specific key", () => {
      setCached("a", 1);
      setCached("b", 2);
      clearCache("a");
      expect(getCached("a")).toBeNull();
      expect(getCached("b")).toBe(2);
    });
  });

  describe("clearCachePattern", () => {
    it("removes keys matching a regex pattern", () => {
      setCached("school:1", "a");
      setCached("school:2", "b");
      setCached("coach:1", "c");
      clearCachePattern(/^school:/);
      expect(getCached("school:1")).toBeNull();
      expect(getCached("school:2")).toBeNull();
      expect(getCached("coach:1")).toBe("c");
    });
  });

  describe("getOrFetch", () => {
    it("calls fetchFn on cache miss and caches result", async () => {
      const fetchFn = vi.fn().mockResolvedValue("fetched");
      const result = await getOrFetch("key", fetchFn, 60);
      expect(result).toBe("fetched");
      expect(fetchFn).toHaveBeenCalledOnce();
    });

    it("returns cached value without calling fetchFn on cache hit", async () => {
      setCached("key", "cached");
      const fetchFn = vi.fn();
      const result = await getOrFetch("key", fetchFn, 60);
      expect(result).toBe("cached");
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe("size limit (MAX_CACHE_SIZE = 10000)", () => {
    it("evicts the oldest entry when max size is reached", () => {
      // Fill cache to max
      for (let i = 0; i < 10000; i++) {
        setCached(`key:${i}`, i);
      }
      // First entry still exists before overflow
      expect(getCached("key:0")).toBe(0);

      // Adding one more should evict the oldest (key:0)
      setCached("key:10000", 10000);
      expect(getCached("key:0")).toBeNull();
      expect(getCached("key:10000")).toBe(10000);
    });

    it("does not grow beyond MAX_CACHE_SIZE", () => {
      for (let i = 0; i < 10100; i++) {
        setCached(`key:${i}`, i);
      }
      // Early keys are evicted, late keys exist
      expect(getCached("key:99")).toBeNull();  // evicted
      expect(getCached("key:10099")).toBe(10099); // present
    });
  });
});
