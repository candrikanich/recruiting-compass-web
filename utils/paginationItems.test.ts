import { describe, it, expect } from "vitest";
import { paginationItems } from "~/utils/paginationItems";

describe("paginationItems", () => {
  it("returns an empty list when there are no pages", () => {
    expect(paginationItems(1, 0)).toEqual([]);
    expect(paginationItems(1, -2)).toEqual([]);
    expect(paginationItems(1, Number.NaN)).toEqual([]);
  });

  it("returns every page when total is 7 or fewer", () => {
    expect(paginationItems(1, 1)).toEqual([1]);
    expect(paginationItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationItems(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("clamps the current page into range", () => {
    expect(paginationItems(0, 3)).toEqual([1, 2, 3]);
    expect(paginationItems(99, 3)).toEqual([1, 2, 3]);
  });

  it("keeps first, last, and neighbors with ellipses for large ranges", () => {
    expect(paginationItems(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(paginationItems(10, 20)).toEqual([
      1,
      "ellipsis",
      9,
      10,
      11,
      "ellipsis",
      20,
    ]);
    expect(paginationItems(20, 20)).toEqual([1, "ellipsis", 19, 20]);
  });
});
