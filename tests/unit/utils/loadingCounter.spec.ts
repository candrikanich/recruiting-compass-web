import { describe, it, expect } from "vitest";
import { useLoadingCounter } from "~/utils/loadingCounter";

describe("useLoadingCounter", () => {
  it("starts not loading", () => {
    const { loading } = useLoadingCounter();
    expect(loading.value).toBe(false);
  });

  it("is loading after increment", () => {
    const { loading, increment } = useLoadingCounter();
    increment();
    expect(loading.value).toBe(true);
  });

  it("stays loading when decremented once of two", () => {
    const { loading, increment, decrement } = useLoadingCounter();
    increment();
    increment();
    decrement();
    expect(loading.value).toBe(true);
  });

  it("stops loading when all increments matched", () => {
    const { loading, increment, decrement } = useLoadingCounter();
    increment();
    increment();
    decrement();
    decrement();
    expect(loading.value).toBe(false);
  });

  it("does not go below zero", () => {
    const { loading, decrement } = useLoadingCounter();
    decrement();
    expect(loading.value).toBe(false);
  });

  it("wrap() sets loading during async op and clears after", async () => {
    const { loading, wrap } = useLoadingCounter();
    let duringLoading = false;
    await wrap(async () => {
      duringLoading = loading.value;
    });
    expect(duringLoading).toBe(true);
    expect(loading.value).toBe(false);
  });

  it("wrap() clears loading even when op throws", async () => {
    const { loading, wrap } = useLoadingCounter();
    await expect(
      wrap(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(loading.value).toBe(false);
  });
});
