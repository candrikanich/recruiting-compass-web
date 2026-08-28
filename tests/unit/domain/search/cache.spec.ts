import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "~/domain/search";

describe("domain/search ttl cache", () => {
  it("builds a key from query, type, and filters", () => {
    const cache = createTtlCache<string>(1000);
    expect(cache.makeKey("stanford", "schools", { division: "D1" })).toBe(
      'stanford|schools|{"division":"D1"}',
    );
  });

  it("returns entries within TTL and rejects stale ones", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const cache = createTtlCache<number>(1000);
    cache.set("k", 42);
    expect(cache.isValid(cache.get("k"))).toBe(true);
    vi.setSystemTime(new Date("2024-01-01T00:00:02Z"));
    expect(cache.isValid(cache.get("k"))).toBe(false);
    cache.clear();
    expect(cache.get("k")).toBeUndefined();
    vi.useRealTimers();
  });
});
