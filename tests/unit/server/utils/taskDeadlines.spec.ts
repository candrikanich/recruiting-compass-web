import { describe, it, expect } from "vitest";
import { computeTaskDeadline } from "~/server/utils/taskDeadlines";

describe("computeTaskDeadline", () => {
  it("returns null when graduation year is null", () => {
    expect(computeTaskDeadline(null, 6)).toBeNull();
  });

  it("returns null when offset months is null", () => {
    expect(computeTaskDeadline(2028, null)).toBeNull();
  });

  it("subtracts offset months from the June 1 graduation anchor", () => {
    // June 1 2028 minus 6 months = Dec 1 2027
    expect(computeTaskDeadline(2028, 6)).toBe("2027-12-01");
  });

  it("crosses multiple year boundaries for large offsets", () => {
    // June 1 2028 minus 42 months = Dec 1 2024
    expect(computeTaskDeadline(2028, 42)).toBe("2024-12-01");
    // minus 30 months = Dec 1 2025
    expect(computeTaskDeadline(2028, 30)).toBe("2025-12-01");
    // minus 18 months = Dec 1 2026
    expect(computeTaskDeadline(2028, 18)).toBe("2026-12-01");
  });

  it("handles a zero offset (due at graduation)", () => {
    expect(computeTaskDeadline(2028, 0)).toBe("2028-06-01");
  });

  it("zero-pads single-digit months", () => {
    // June 1 2028 minus 1 month = May 1 2028
    expect(computeTaskDeadline(2028, 1)).toBe("2028-05-01");
  });
});
