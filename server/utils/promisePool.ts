/**
 * Bounded-concurrency async map — process `items` through `worker`, at most
 * `concurrency` in flight at once. No external dependency (avoids pulling in
 * p-limit). Preserves input order in the returned results array.
 *
 * Used by housekeeping crons that iterate many rows/objects: sequential is too
 * slow at scale, unbounded Promise.all can exhaust connections or trip
 * third-party rate limits. A small pool (e.g. 5) is the safe middle.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runner(): Promise<void> {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    runner(),
  );
  await Promise.all(runners);
  return results;
}
