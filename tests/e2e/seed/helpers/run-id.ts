import { randomUUID } from "crypto";
import fs from "fs";
import { resolve } from "path";

const RUN_ID_PATH = resolve(process.cwd(), "tests/e2e/.auth/run-id.txt");

/** Called once by global-setup. CI sets E2E_RUN_ID (job+shard-scoped) so a
 * failed run's leftovers stay identifiable; local runs generate one. */
export function initRunId(): string {
  const runId = process.env.E2E_RUN_ID || randomUUID().slice(0, 8);
  fs.writeFileSync(RUN_ID_PATH, runId);
  return runId;
}

/** Called by specs/fixtures/teardown to read the RUN_ID global-setup wrote. */
export function getRunId(): string {
  return fs.readFileSync(RUN_ID_PATH, "utf-8").trim();
}

/** Every fixture that names a test-created row should route the name
 * through this instead of hand-rolling a prefix — keeps tagging consistent
 * so teardown can find everything by an exact RUN_ID match. */
export function tagName(prefix: string): string {
  return `[e2e-${getRunId()}] ${prefix}`;
}
