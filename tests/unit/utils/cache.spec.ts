import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createCache,
  cacheKey,
  CACHE_DURATION,
  globalCache,
} from "~/utils/cache";

describe("CacheManager (via createCache)", () => {
  let cache: ReturnType<typeof createCache>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = createCache(60000);
  });

  afterEach(() => {
    cache.stopCleanup();
    vi.useRealTimers();
  });

  describe("set and get", () => {
    it("stores and retrieves a string value", () => {
      cache.set("key1", "hello");
      expect(cache.get("key1")).toBe("hello");
    });

    it("stores and retrieves an object value", () => {
      const obj = { id: 1, name: "test" };
      cache.set("obj", obj);
      expect(cache.get("obj")).toEqual(obj);
    });

    it("returns null for a key that was never set", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("overwrites an existing key", () => {
      cache.set("k", "first");
      cache.set("k", "second");
      expect(cache.get("k")).toBe("second");
    });
  });

  describe("TTL expiration", () => {
    it("returns the value before TTL expires", () => {
      cache.set("expiring", "value", 5000);
      vi.advanceTimersByTime(4999);
      expect(cache.get("expiring")).toBe("value");
    });

    it("returns null after TTL expires", () => {
      cache.set("expiring", "value", 5000);
      vi.advanceTimersByTime(5001);
      expect(cache.get("expiring")).toBeNull();
    });

    it("removes expired entry from the cache on access", () => {
      cache.set("temp", "x", 1000);
      vi.advanceTimersByTime(2000);
      cache.get("temp");
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe("has", () => {
    it("returns true for an existing, non-expired key", () => {
      cache.set("present", 42);
      expect(cache.has("present")).toBe(true);
    });

    it("returns false for a missing key", () => {
      expect(cache.has("absent")).toBe(false);
    });

    it("returns false for an expired key", () => {
      cache.set("gone", "soon", 100);
      vi.advanceTimersByTime(200);
      expect(cache.has("gone")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes an existing key and returns true", () => {
      cache.set("del", "bye");
      expect(cache.delete("del")).toBe(true);
      expect(cache.get("del")).toBeNull();
    });

    it("returns false when deleting a non-existent key", () => {
      expect(cache.delete("nope")).toBe(false);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe("clearPattern", () => {
    it("removes only keys matching the pattern", () => {
      cache.set("schools:user1", []);
      cache.set("schools:user2", []);
      cache.set("coaches:user1", []);
      cache.clearPattern(/^schools:/);
      expect(cache.get("schools:user1")).toBeNull();
      expect(cache.get("schools:user2")).toBeNull();
      expect(cache.get("coaches:user1")).not.toBeNull();
    });
  });

  describe("getStats", () => {
    it("returns size equal to number of active entries", () => {
      cache.set("x", 1);
      cache.set("y", 2);
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it("includes key, ttl, and age in each entry", () => {
      cache.set("z", "data", 30000);
      vi.advanceTimersByTime(1000);
      const stats = cache.getStats();
      const entry = stats.entries.find((e) => e.key === "z");
      expect(entry).toBeDefined();
      expect(entry?.ttl).toBe(30000);
      expect(entry?.age).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("stopCleanup", () => {
    it("can be called without throwing", () => {
      expect(() => cache.stopCleanup()).not.toThrow();
    });

    it("can be called multiple times safely", () => {
      cache.stopCleanup();
      expect(() => cache.stopCleanup()).not.toThrow();
    });
  });
});

describe("cacheKey", () => {
  it("generates schools key", () => {
    expect(cacheKey.schools("u1")).toBe("schools:u1");
  });

  it("generates schoolDetail key", () => {
    expect(cacheKey.schoolDetail("s42")).toBe("school:s42");
  });

  it("generates coaches key", () => {
    expect(cacheKey.coaches("u1")).toBe("coaches:u1");
  });

  it("generates coachDetail key", () => {
    expect(cacheKey.coachDetail("c7")).toBe("coach:c7");
  });

  it("generates interactions key", () => {
    expect(cacheKey.interactions("u1")).toBe("interactions:u1");
  });

  it("generates metrics key", () => {
    expect(cacheKey.metrics("u1")).toBe("metrics:u1");
  });

  it("generates search key with all three segments", () => {
    expect(cacheKey.search("u1", "Harvard", "school")).toBe(
      "search:u1:Harvard:school",
    );
  });

  it("generates templates key", () => {
    expect(cacheKey.templates("u1")).toBe("templates:u1");
  });

  it("generates reminders key", () => {
    expect(cacheKey.reminders("u1")).toBe("reminders:u1");
  });
});

describe("CACHE_DURATION", () => {
  it("SHORT is 60 seconds in ms", () => {
    expect(CACHE_DURATION.SHORT).toBe(60000);
  });

  it("MEDIUM is 5 minutes in ms", () => {
    expect(CACHE_DURATION.MEDIUM).toBe(300000);
  });

  it("LONG is 15 minutes in ms", () => {
    expect(CACHE_DURATION.LONG).toBe(900000);
  });

  it("VERY_LONG is 1 hour in ms", () => {
    expect(CACHE_DURATION.VERY_LONG).toBe(3600000);
  });

  it("durations are in ascending order", () => {
    expect(CACHE_DURATION.SHORT).toBeLessThan(CACHE_DURATION.MEDIUM);
    expect(CACHE_DURATION.MEDIUM).toBeLessThan(CACHE_DURATION.LONG);
    expect(CACHE_DURATION.LONG).toBeLessThan(CACHE_DURATION.VERY_LONG);
  });
});

describe("globalCache", () => {
  afterEach(() => {
    globalCache.clear();
  });

  it("is a shared singleton that persists between calls", () => {
    globalCache.set("shared", "yes");
    expect(globalCache.get("shared")).toBe("yes");
  });
});
