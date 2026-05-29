import { describe, it, expect, vi } from "vitest";
import { retryWithBackoff } from "~/server/utils/retry";

const instantSleep = () => Promise.resolve();
const always = () => true;

describe("retryWithBackoff", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn(async () => "ok");

    const result = await retryWithBackoff(fn, {
      retries: 3,
      baseDelayMs: 1,
      isRetryable: always,
      sleep: instantSleep,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure and succeeds on a later attempt", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return "ok";
    });

    const result = await retryWithBackoff(fn, {
      retries: 3,
      baseDelayMs: 1,
      isRetryable: always,
      sleep: instantSleep,
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry a non-retryable failure and rethrows immediately", async () => {
    const fn = vi.fn(async () => {
      throw new Error("bad request");
    });

    await expect(
      retryWithBackoff(fn, {
        retries: 3,
        baseDelayMs: 1,
        isRetryable: () => false,
        sleep: instantSleep,
      }),
    ).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting retries and throws the last error", async () => {
    const fn = vi.fn(async () => {
      throw new Error("still failing");
    });

    await expect(
      retryWithBackoff(fn, {
        retries: 3,
        baseDelayMs: 1,
        isRetryable: always,
        sleep: instantSleep,
      }),
    ).rejects.toThrow("still failing");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff delays between attempts", async () => {
    const delays: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms);
    });
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return "ok";
    };

    await retryWithBackoff(fn, {
      retries: 3,
      baseDelayMs: 100,
      isRetryable: always,
      sleep,
    });

    expect(delays.length).toBe(2);
    expect(delays[1]).toBeGreaterThan(delays[0]);
  });
});
