import { describe, it, expect } from "vitest";
import { useLoadingCounter } from "~/utils/loadingCounter";

describe("useLoadingCounter", () => {
  it("starts not loading", () => {
    const { loading } = useLoadingCounter();
    expect(loading.value).toBe(false);
  });

  it("is loading after one start", () => {
    const { loading, startLoading } = useLoadingCounter();
    startLoading();
    expect(loading.value).toBe(true);
  });

  it("stays loading while multiple operations are in-flight", () => {
    const { loading, startLoading, stopLoading } = useLoadingCounter();
    startLoading();
    startLoading();
    stopLoading();
    expect(loading.value).toBe(true);
  });

  it("stops loading only after all operations complete", () => {
    const { loading, startLoading, stopLoading } = useLoadingCounter();
    startLoading();
    startLoading();
    stopLoading();
    stopLoading();
    expect(loading.value).toBe(false);
  });

  it("does not go negative", () => {
    const { loading, stopLoading } = useLoadingCounter();
    stopLoading();
    expect(loading.value).toBe(false);
  });
});
