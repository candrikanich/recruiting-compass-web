# E2E Flake Root-Cause Plan (Phase 5 of E2E CI Refactor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** replace name-guessing cleanup with RUN_ID-scoped test data + real teardown, so shared-account races stop producing flaky CI failures.

**Predecessor:** `planning/e2e-ci-refactor-plan.md` (Phases 1-4, all shipped: #711, #712, #713, #715).

**Architecture:** every piece of test data a spec creates gets tagged with a per-job RUN_ID at creation time (one shared helper, not per-file string literals). `global-teardown.ts` deletes everything tagged with that run's RUN_ID after the run finishes — an exact-match sweep instead of `purgeLeakedTestSchools`' 8-prefix guesswork. Specs whose flakes come from *reading* another worker's data (not just leaking it) get their assertions scoped to their own RUN_ID-tagged rows instead of raw counts.

**Tech Stack:** Playwright global-teardown, Supabase admin client (`tests/e2e/seed/helpers/supabase-admin.ts`), existing `TEST_ACCOUNTS` fixture.

**Spec:** this file — no separate PRD, derived from the investigation section below.

## Investigation findings (context, not tasks)

**Task 0 measurement (as of 2026-09-09):** Zero qualifying CI runs exist yet. PR #712 (4-way sharding) merged 13:12:34Z and PR #715 (smoke/full-suite split) merged 13:24:22Z today — both very recent. Checked the last 30 `e2e.yml` runs (`gh run list --workflow=e2e.yml --json databaseId,conclusion,createdAt,headBranch,event`) plus the last 20 `main`-targeted PRs (`gh pr list --base main --state all`) plus all `workflow_dispatch` history: the one develop→main promote run in the window (PR #707, run `34351558563`, started 12:31:58Z) predates #712's merge and still shows the old single-job `Playwright E2E Tests` job, not the sharded matrix — so it's not usable evidence either way. No `main`-targeted PR or manual dispatch has run the new sharded pipeline since #712/#715 landed. Verdict: no data yet to confirm or refute the "sharding widened the race" hypothesis — Task 2's prioritization should stay based on the theoretical worker-count argument in the bullet below, not on measured evidence, until a real promote-to-main run happens post-#715.

- `generateUniqueSchoolName()` (`tests/e2e/fixtures/schools.fixture.ts:187`) already makes names collision-free (timestamp + random suffix) — the flakes are not name collisions, they're **visibility races**: one worker's dashboard/list assertion counts or reads rows another concurrent worker created/deleted against the same shared test account.
- `purgeLeakedTestSchools()` (`tests/e2e/seed/helpers/supabase-admin.ts:241`) matches a hardcoded list of 8 name prefixes (`"[e2e-"`, `"Filter Test"`, `"History Test"`, etc.) — any spec using a naming convention not on that list leaks forever, silently. This is a symptom sweep, not real teardown.
- 23 spec files use `test.afterAll` (`grep -rl "test.afterAll" tests/e2e --include="*.spec.ts" | wc -l`) — real cleanup coverage across them is unaudited; some (e.g. `coaching-philosophy.spec.ts`, `family-invite-flow.spec.ts`) already use `test.describe.configure({ mode: "serial" })` specifically to dodge this class of race, at the cost of losing parallelism for that whole file.
- **New risk surface from Phase 2 (sharding):** the shared test account/schools table now sees up to 12 concurrent workers (3 workers × 4 shard jobs) instead of ≤3, if Playwright's shard balancer happens to put colliding spec files in different concurrent shard jobs. Task 0 below measures whether this actually made things worse before assuming the RUN_ID fix is even sufficient on its own.

## Global Constraints

- Never delete data outside the current run's RUN_ID scope — a teardown bug here is a data-loss bug against the shared test project, treat every query here as production-adjacent.
- `E2E_SKIP_SEED` and `SMOKE_ONLY` (existing flags from Phases 2/4 and PR #710) must keep working unmodified — this plan adds a new tagging/teardown layer, it doesn't touch the seed-skip logic.
- Keep `purgeLeakedTestSchools` in place as a backstop during rollout (don't delete it until Task 3 confirms the new teardown has run clean for a few days) — belt and suspenders while this is new.

---

### Task 0: Measure the sharding impact on flake rate

**Files:** none changed — this is data collection.

**Why first:** confirms whether Phase 2 sharding actually worsened the race (per the investigation note above) before spending effort on a fix sized for the old single-job flake rate.

- [ ] Pull the last ~15 `e2e-tests` matrix runs on develop→main PRs (or manual `workflow_dispatch` runs) since #712 merged via `gh run list --workflow=e2e.yml --json databaseId,conclusion,createdAt | jq` and note pass/fail per shard.
- [ ] For any failures, check the Playwright report artifact for `coaching-philosophy`, `family-invite-flow`, or dashboard-empty-state style assertions (`e2e-test-account-school-leak` pattern) — confirm whether they cluster on specific shard-pairs running concurrently.
- [ ] Record findings as a comment at the top of this plan file (not a separate doc) before starting Task 1 — if sharding measurably worsened things, Task 2's assertion-scoping work becomes higher priority than Task 1's teardown-only fix.

---

### Task 1: RUN_ID tagging helper + teardown sweep

**Files:**
- Create: `tests/e2e/seed/helpers/run-id.ts` — RUN_ID generation/read, tag-string helper
- Modify: `tests/e2e/global-setup.ts` — generate/persist RUN_ID once per Playwright process, export it for spec use
- Modify: `tests/e2e/global-teardown.ts` — exact-match RUN_ID sweep (schools/coaches/interactions owned by TEST_ACCOUNTS, tagged with this run's RUN_ID)
- Modify: `tests/e2e/seed/helpers/supabase-admin.ts` — `purgeLeakedTestSchools` stays as a backstop, unchanged in this task

**Interfaces:**
- Produces: `tagName(prefix: string): string` (from `run-id.ts`) — every fixture that names a test-created row (schools, coaches, whatever else) calls this instead of hand-rolling a prefix, so the RUN_ID lands in the name consistently.
- Produces: `getRunId(): string` — reads the RUN_ID that `global-setup.ts` wrote (env var or a file under `tests/e2e/.auth/`, matching how storageState files are already shared between setup and specs).

- [ ] Write `tests/e2e/seed/helpers/run-id.ts`:

```typescript
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
```

- [ ] In `global-setup.ts`, call `initRunId()` early (before account provisioning) and log the value (`console.log(\`🏷️  RUN_ID: ${runId}\`)`) so a failed CI run's leftovers are traceable in the Actions log.
- [ ] In `e2e.yml`, set `E2E_RUN_ID: "${{ github.run_id }}-${{ matrix.shard || 'seq' }}"` on `e2e-tests`, `e2e-sequential`, `e2e-smoke`, and `e2e-flaky` (mirrors how `E2E_SKIP_SEED` is already threaded per job) — makes a leaked row's origin job identifiable from its name alone.
- [ ] Write the teardown sweep in `global-teardown.ts`:

```typescript
import { getRunId } from "./seed/helpers/run-id";
import { getSupabaseAdmin } from "./seed/helpers/supabase-admin";
import { TEST_ACCOUNTS } from "./config/test-accounts";
import { reapDebris } from "./seed/helpers/debris";

// CORRECTED post-Task-1-ruling: the plan's first draft of this file replaced
// the existing reapDebris(...) step wholesale — a real regression caught by
// the Task 1 implementer. reapDebris cleans up a DIFFERENT debris category
// (one-off auth users, hit 768 leaked once) and has its own
// E2E_SKIP_TEARDOWN=1 kill switch. Both steps now run, gated by the same
// switch, each independently non-fatal.
async function globalTeardown() {
  if (process.env.E2E_SKIP_TEARDOWN === "1") {
    console.log("🧹 E2E teardown skipped (E2E_SKIP_TEARDOWN=1)");
    return;
  }

  const supabase = getSupabaseAdmin();

  try {
    const r = await reapDebris(supabase, { execute: true });
    if (r.matched === 0) {
      console.log("  ✅ No debris users to reap");
    } else {
      console.log(
        `  ✅ Reaped ${r.deletedUsers}/${r.matched} debris users ` +
          `(${r.failedUsers} failed) + ${r.deletedUnits} orphan family_units`,
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠️  Debris-user reap failed (non-fatal): ${msg}`);
  }

  try {
    const runId = getRunId();
    const emails = Object.values(TEST_ACCOUNTS).map((a) => a.email);
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .in("email", emails);
    const userIds = (users ?? []).map((u) => (u as { id: string }).id);
    if (userIds.length === 0) return;

    const { data: schools } = await supabase
      .from("schools")
      .select("id")
      .in("user_id", userIds)
      .like("name", `[e2e-${runId}]%`);
    const ids = (schools ?? []).map((s) => (s as { id: string }).id);
    if (ids.length === 0) {
      console.log(`🧹 RUN_ID ${runId}: nothing to tear down`);
      return;
    }

    await supabase.from("interactions").delete().in("school_id", ids);
    await supabase.from("coaches").delete().in("school_id", ids);
    await supabase.from("schools").delete().in("id", ids);
    console.log(`🧹 RUN_ID ${runId}: tore down ${ids.length} school(s)`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  ⚠️  RUN_ID school sweep failed (non-fatal): ${msg}`);
  }
}

export default globalTeardown;
```

- [ ] Confirm `playwright.config.ts`'s existing `globalTeardown: "./tests/e2e/global-teardown.ts"` entry already wires this up (it does — see current config) — no config change needed, just the file content.
- [ ] Run locally against the test project (`E2E_SEED=true npx playwright test --project=chromium --grep "@smoke"`) and confirm the teardown log line prints a real count, not 0, proving the tag → find → delete path actually works end to end.
- [ ] Commit: `feat(e2e): RUN_ID-tagged test data + exact-match teardown sweep`

---

### Task 2: Migrate the two memory-flagged offenders onto RUN_ID tagging

**Files:**
- Modify: `tests/e2e/coaching-philosophy.spec.ts` — route `createSchoolData({ name: ... })` through `tagName()`
- Modify: `tests/e2e/fixtures/schools.fixture.ts` (`family-invite-flow` uses `schoolHelpers`/`generateUniqueSchoolName` too — check its actual call site first) — same
- Modify: whichever spec(s) hit the `e2e-test-account-school-leak` dashboard-empty-state assertion (`dashboard-8-2:132` per memory) — scope the empty-state check to "no RUN_ID-tagged schools of *this* run" rather than "zero schools total on the account," since the shared account can legitimately hold another concurrent run's not-yet-torn-down data

**Interfaces:**
- Consumes: `tagName(prefix)` and `getRunId()` from Task 1's `run-id.ts`.

- [ ] Read the two specs' current school-creation call sites (`grep -n "generateUniqueSchoolName\|createSchoolData" tests/e2e/coaching-philosophy.spec.ts tests/e2e/family-invite-flow.spec.ts`) before editing — the plan doesn't guess their exact current code.
- [ ] Swap their name generation to go through `tagName()` instead of (or in addition to) `generateUniqueSchoolName()`.
- [ ] For the dashboard-empty-state assertion specifically: change the check from an absolute "0 schools" / "No schools tracked yet" assertion to one that tolerates other runs' in-flight data — either assert on a RUN_ID-scoped count, or (simpler, if the empty-state test's whole point is verifying a *fresh* account) give that one test its own throwaway account instead of the shared `player.json` — pick whichever is the smaller diff once you're looking at the actual test.
- [ ] Run the two specs repeated + parallel locally to reproduce-then-confirm-fixed: `npx playwright test coaching-philosophy.spec.ts family-invite-flow.spec.ts --repeat-each=3 --workers=3` (per superpowers:systematic-debugging — reproduce before declaring fixed).
- [ ] Since `coaching-philosophy.spec.ts` currently has `test.describe.configure({ mode: "serial" })` specifically to dodge this race: if the RUN_ID fix holds under the repeat-parallel run above, remove the serial pin and the `@flaky` tag from PR #713 — that's the actual win condition for this task, not just "still passes serially."
- [ ] Commit: `fix(e2e): migrate coaching-philosophy + family-invite-flow onto RUN_ID-scoped data, un-quarantine`

---

### Task 3: Batch-audit the remaining afterAll files

**Files:** the other ~21 files from `grep -rl "test.afterAll" tests/e2e --include="*.spec.ts"`, audited and fixed in batches (not enumerated here — Task 0/1/2 will reveal the actual pattern shape, and guessing 21 files' current code without reading them first would violate the "no placeholders" rule).

- [ ] Re-run `grep -rl "test.afterAll" tests/e2e --include="*.spec.ts"` to get the current list (may have shifted since Task 2).
- [ ] For each file: does its `afterAll`/`beforeAll` create schools/coaches/interactions without going through `tagName()`? If yes, migrate it (mechanical, same pattern as Task 2).
- [ ] Batch these in groups of ~5 files per subagent dispatch (per superpowers:subagent-driven-development) rather than one file at a time — most will be the same mechanical swap.
- [ ] After each batch, run `purgeLeakedTestSchools`'s prefix list against the live test project and confirm the leaked-count trends toward zero over a few CI runs — that's the actual signal this task is working, not just "lint passes."
- [ ] Once a full week of CI runs shows `purgeLeakedTestSchools` purging 0 (or near-0) schools consistently, remove it and rely solely on the Task 1 teardown sweep — separate small follow-up commit, don't bundle with the last batch.

---

## Sequencing note

Task 0 is cheap and gates whether Task 2's priority is right. Task 1 is infrastructure only — safe to land even if Task 0 shows sharding didn't worsen things. Task 2 is the two memory-flagged specs, the actual proof this approach works. Task 3 is open-ended cleanup, explicitly scoped to "batch it, don't front-load 21 files' worth of unread code into this plan."
