import { vi } from "vitest";

/**
 * Shared Supabase mock builder for the athlete phase read/advance endpoint
 * tests. Each table gets its own thenable chain builder so the same mock
 * supports whichever chain shape the production code uses for that table
 * (`.single()`, `.maybeSingle()`, or awaiting the `.eq()`/`.not()` chain
 * directly) without special-casing on field/value like the old ad-hoc mocks
 * did.
 */

export interface DbResult<T> {
  data: T | null;
  error: { code?: string; message: string } | null;
}

function makeQueryBuilder(terminal: () => Promise<DbResult<unknown>>) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.not = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => terminal());
  builder.single = vi.fn(() => terminal());
  // Some queries (athlete_task select, task select) are awaited directly at
  // the end of the .eq()/.not() chain with no terminal call — making the
  // builder itself thenable covers that shape too.
  builder.then = (
    resolve: (value: DbResult<unknown>) => void,
    reject: (reason: unknown) => void,
  ) => terminal().then(resolve, reject);
  return builder;
}

export interface MockSupabaseConfig {
  user?: DbResult<{ current_phase: string | null }>;
  userPreferences?: DbResult<{ data: Record<string, unknown> } | null>;
  athleteTasks?: DbResult<{ task_id: string }[]>;
  tasks?: DbResult<{ id: string; slug: string }[]>;
  familyMembership?: DbResult<{ family_unit_id: string } | null>;
  playerMember?: DbResult<{ user_id: string } | null>;
  usersUpdate?: DbResult<null>;
}

const okEmpty = <T>(): DbResult<T | null> => ({ data: null, error: null });

export function createMockSupabase(config: MockSupabaseConfig) {
  let familyMemberCallCount = 0;

  // Shared across every `.from("users")` call in a single test (production
  // code calls it once to read current_phase, and again to write on advance) —
  // spy state must survive across those separate builder instances.
  const usersUpdate = vi.fn(
    (_values: Record<string, unknown>) => usersBuilder(true),
  );

  function usersBuilder(isUpdate: boolean) {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.update = usersUpdate;
    const terminal = async () =>
      isUpdate ? (config.usersUpdate ?? { data: null, error: null }) : (config.user ?? okEmpty());
    builder.single = vi.fn(() => terminal());
    builder.maybeSingle = vi.fn(() => terminal());
    builder.then = (
      resolve: (value: DbResult<unknown>) => void,
      reject: (reason: unknown) => void,
    ) => terminal().then(resolve, reject);
    return builder;
  }

  const tables: Record<string, () => ReturnType<typeof makeQueryBuilder>> = {
    users: () => usersBuilder(false) as ReturnType<typeof makeQueryBuilder>,
    user_preferences: () =>
      makeQueryBuilder(
        async () => config.userPreferences ?? okEmpty(),
      ) as ReturnType<typeof makeQueryBuilder>,
    athlete_task: () =>
      makeQueryBuilder(
        async () => config.athleteTasks ?? { data: [], error: null },
      ) as ReturnType<typeof makeQueryBuilder>,
    task: () =>
      makeQueryBuilder(
        async () => config.tasks ?? { data: [], error: null },
      ) as ReturnType<typeof makeQueryBuilder>,
    family_members: () =>
      makeQueryBuilder(async () => {
        familyMemberCallCount += 1;
        // First call resolves the parent's own family_unit_id, second call
        // resolves the linked player row — matches the two sequential
        // family_members queries in phase.get.ts's parent-view branch.
        return familyMemberCallCount === 1
          ? (config.familyMembership ?? okEmpty())
          : (config.playerMember ?? okEmpty());
      }) as ReturnType<typeof makeQueryBuilder>,
  };

  const from = vi.fn((table: string) => {
    const builder = tables[table]?.();
    if (!builder) {
      throw new Error(
        `phaseTestSupport: no mock configured for table "${table}"`,
      );
    }
    return builder;
  });

  return { from, usersUpdate };
}

/**
 * `createError` is a Nuxt auto-import (global) — polyfill it for the test
 * environment, matching the pattern already used by the pre-existing
 * phase.get.spec.ts.
 */
export function installCreateErrorPolyfill(): void {
  (
    globalThis as unknown as {
      createError: (config: {
        statusCode: number;
        statusMessage: string;
      }) => Error & { statusCode: number };
    }
  ).createError = (config: { statusCode: number; statusMessage: string }) => {
    const err = new Error(config.statusMessage) as Error & {
      statusCode: number;
    };
    err.statusCode = config.statusCode;
    return err;
  };
}

export const REQUIRED_SLUGS = [
  "understand-academic-requirements",
  "establish-development-routine",
  "play-travel-ball",
  "research-division-levels",
];

/** `task` rows for the 4 freshmanToSophomore milestones, real UUID-shaped ids. */
export function freshmanMilestoneTaskRows(): { id: string; slug: string }[] {
  return REQUIRED_SLUGS.map((slug, i) => ({
    id: `22222222-0000-4000-8000-${String(i).padStart(12, "0")}`,
    slug,
  }));
}
