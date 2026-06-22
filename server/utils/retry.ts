export interface RetryOptions {
  /** Total attempts (not counting attempts as "extra" — 3 means up to 3 calls). */
  retries: number;
  /** Base delay in ms; doubled each attempt (1x, 2x, 4x...). */
  baseDelayMs: number;
  /** Returns true if the thrown error is worth retrying. */
  isRetryable: (err: unknown) => boolean;
  /** Injectable sleep — defaults to setTimeout-based delay. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn`, retrying retryable failures with exponential backoff + jitter.
 * Non-retryable errors rethrow immediately; the last error rethrows after
 * the final attempt.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { retries, baseDelayMs, isRetryable } = options;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries - 1;
      if (isLastAttempt || !isRetryable(err)) throw err;

      const backoff = baseDelayMs * 2 ** attempt;
      const jitter = Math.random() * backoff * 0.25;
      await sleep(backoff + jitter);
    }
  }
  throw lastError;
}
