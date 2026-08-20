import type { Page } from "@playwright/test";

/**
 * Memory soak-test helpers. Repeats a user flow inside a single browser
 * context and compares detached-DOM / listener counts before and after, to
 * catch SPA leaks (unremoved listeners, abandoned timers, growing caches).
 *
 * Technique from denodell.com "Your SPA Is Leaking Memory — Soak-Test It":
 *  - double GC before every reading (single pass leaves ~17% false detached-DOM)
 *  - warm up first so lazy chunks / API responses land in heap once
 *  - assert listeners <= baseline, nodes < baseline + NODE_ALLOWANCE
 */

export interface PageMetrics {
  heap: number;
  nodes: number;
  listeners: number;
}

interface CdpMetric {
  name: string;
  value: number;
}

type CdpClient = {
  send(method: "Performance.enable"): Promise<unknown>;
  send(method: "HeapProfiler.collectGarbage"): Promise<unknown>;
  send(method: "Performance.getMetrics"): Promise<{ metrics: CdpMetric[] }>;
};

/** Fixed node allowance — small views have high relative variance, so a
 *  percentage threshold is unreliable. See article. */
export const NODE_ALLOWANCE = 100;

/** Force two full GC passes, then read heap / DOM-node / listener counts. */
export async function getPageMetrics(client: CdpClient): Promise<PageMetrics> {
  await client.send("HeapProfiler.collectGarbage");
  await client.send("HeapProfiler.collectGarbage");

  const { metrics } = await client.send("Performance.getMetrics");
  const byName = Object.fromEntries(
    metrics.map((m) => [m.name, m.value]),
  ) as Record<string, number>;

  return {
    heap: byName.JSHeapUsedSize ?? 0,
    nodes: byName.Nodes ?? 0,
    listeners: byName.JSEventListeners ?? 0,
  };
}

export interface SoakResult {
  baseline: PageMetrics;
  after: PageMetrics;
}

/**
 * Run `runFlow` `warmup` times to prime the heap, snapshot the baseline, then
 * run it `loops - warmup` more times and snapshot again.
 */
export async function soak(
  page: Page,
  runFlow: () => Promise<void>,
  loops = 60,
  warmup = 5,
): Promise<SoakResult> {
  const client = (await page
    .context()
    .newCDPSession(page)) as unknown as CdpClient;
  await client.send("Performance.enable");

  for (let i = 0; i < warmup; i++) {
    await runFlow();
  }

  const baseline = await getPageMetrics(client);

  for (let i = warmup; i < loops; i++) {
    await runFlow();
  }

  const after = await getPageMetrics(client);

  return { baseline, after };
}
