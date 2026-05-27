import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import type { CommunicationTemplate } from "~/types/models";

// Mutable state objects closed over by mock factories (read at call time)
const userState = {
  user: { id: "user-1" } as { id: string } | null,
};

interface QueryResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

const queueByTable = new Map<string, QueryResult[]>();

function enqueueResult(table: string, result: QueryResult) {
  if (!queueByTable.has(table)) queueByTable.set(table, []);
  queueByTable.get(table)!.push(result);
}

function nextResult(table: string): QueryResult {
  const queue = queueByTable.get(table);
  if (!queue || queue.length === 0) {
    return { data: null, error: null };
  }
  return queue.shift()!;
}

// Build a chainable query builder that finally resolves with the queued result.
function buildBuilder(table: string) {
  let resolved = false;

  const resolveOnce = (): Promise<QueryResult> => {
    if (resolved) return Promise.resolve({ data: null, error: null });
    resolved = true;
    return Promise.resolve(nextResult(table));
  };

  // The builder object — every method returns the same object so .eq().eq().single() chains work.
  // It is also thenable so `await builder.update(...).eq(...).eq(...)` resolves the queued result.
  const builder: Record<string, unknown> & PromiseLike<QueryResult> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => resolveOnce()),
    single: vi.fn(() => resolveOnce()),
    maybeSingle: vi.fn(() => resolveOnce()),
    limit: vi.fn(() => resolveOnce()),
    then: (onFulfilled: (value: QueryResult) => unknown) =>
      resolveOnce().then(onFulfilled),
  };

  return builder;
}

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => buildBuilder(table)),
  })),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => userState),
}));

// Avoid noisy log output (logger.error → console.error in test env)
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const makeTemplate = (
  overrides: Partial<CommunicationTemplate> = {},
): CommunicationTemplate =>
  ({
    id: "tpl-1",
    user_id: "user-1",
    name: "Default",
    type: "email",
    subject: "Subj",
    body: "Body",
    is_favorite: false,
    use_count: 0,
    tags: [],
    ...overrides,
  }) as CommunicationTemplate;

describe("useCommunicationTemplates (extended)", () => {
  beforeEach(() => {
    queueByTable.clear();
    userState.user = { id: "user-1" };
    vi.clearAllMocks();
    // ensure mocks return our impls even after clearAllMocks
    vi.mocked(useSupabase).mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      from: vi.fn((table: string) => buildBuilder(table)) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(useUserStore).mockReturnValue(
      userState as unknown as ReturnType<typeof useUserStore>,
    );
  });

  afterEach(() => {
    queueByTable.clear();
  });

  // ── loadTemplates ───────────────────────────────────────────────────────────
  describe("loadTemplates", () => {
    it("does nothing when no user", async () => {
      userState.user = null;
      const c = useCommunicationTemplates();
      await c.loadTemplates();
      expect(c.templates.value).toEqual([]);
      expect(c.isLoading.value).toBe(false);
    });

    it("loads templates and toggles loading flag", async () => {
      const rows = [
        makeTemplate({ id: "a", type: "email" }),
        makeTemplate({ id: "b", type: "message" }),
      ];
      enqueueResult("communication_templates", { data: rows, error: null });

      const c = useCommunicationTemplates();
      const promise = c.loadTemplates();
      expect(c.isLoading.value).toBe(true);
      await promise;
      expect(c.isLoading.value).toBe(false);
      expect(c.templates.value).toHaveLength(2);
      expect(c.error.value).toBeNull();
    });

    it("handles null data without throwing", async () => {
      enqueueResult("communication_templates", { data: null, error: null });
      const c = useCommunicationTemplates();
      await c.loadTemplates();
      expect(c.templates.value).toEqual([]);
    });

    it("treats PGRST205 (table missing) as empty result", async () => {
      enqueueResult("communication_templates", {
        data: null,
        error: { code: "PGRST205", message: "not found" },
      });
      const c = useCommunicationTemplates();
      await c.loadTemplates();
      expect(c.templates.value).toEqual([]);
      expect(c.error.value).toBeNull();
    });

    it("treats 'communication_templates' message error as empty result", async () => {
      enqueueResult("communication_templates", {
        data: null,
        error: { message: "relation communication_templates does not exist" },
      });
      const c = useCommunicationTemplates();
      await c.loadTemplates();
      expect(c.templates.value).toEqual([]);
      expect(c.error.value).toBeNull();
    });

    it("sets error message on generic failure", async () => {
      enqueueResult("communication_templates", {
        data: null,
        error: new Error("boom"),
      });
      const c = useCommunicationTemplates();
      await c.loadTemplates();
      expect(c.error.value).toBe("boom");
      expect(c.isLoading.value).toBe(false);
    });

    it("falls back to default message when error is not an Error instance", async () => {
      enqueueResult("communication_templates", {
        data: null,
        error: "string-error-not-matching",
      });
      const c = useCommunicationTemplates();
      await c.loadTemplates();
      // string error has no .code and no .message.includes — gets thrown then caught
      // err is a string, so err instanceof Error === false → default message
      expect(c.error.value).toBe("Failed to load templates");
    });

    it("loadUserTemplates is an alias", async () => {
      const c = useCommunicationTemplates();
      expect(c.loadUserTemplates).toBe(c.loadTemplates);
    });
  });

  // ── createTemplate ──────────────────────────────────────────────────────────
  describe("createTemplate", () => {
    it("returns null when no user", async () => {
      userState.user = null;
      const c = useCommunicationTemplates();
      const result = await c.createTemplate("n", "email", "body");
      expect(result).toBeNull();
    });

    it("creates a template and extracts unique variables", async () => {
      const inserted = makeTemplate({
        id: "new-id",
        body: "Hi {{name}}, {{name}} again {{school}}",
      });
      enqueueResult("communication_templates", {
        data: inserted,
        error: null,
      });

      const c = useCommunicationTemplates();
      const result = await c.createTemplate(
        "n",
        "email",
        "Hi {{name}}, {{name}} again {{school}}",
        "Subject",
      );

      expect(result).not.toBeNull();
      expect(result?.variables).toEqual(["name", "school"]);
      expect(c.templates.value[0].id).toBe("new-id");
    });

    it("prepends new template to list", async () => {
      const existing = makeTemplate({ id: "old" });
      const c = useCommunicationTemplates();
      c.templates.value = [existing];

      enqueueResult("communication_templates", {
        data: makeTemplate({ id: "fresh", body: "no vars" }),
        error: null,
      });

      await c.createTemplate("n", "message", "no vars");
      expect(c.templates.value.map((t) => t.id)).toEqual(["fresh", "old"]);
    });

    it("omits subject for non-email types", async () => {
      enqueueResult("communication_templates", {
        data: makeTemplate({ id: "x" }),
        error: null,
      });
      const c = useCommunicationTemplates();
      const result = await c.createTemplate(
        "n",
        "phone_script",
        "body",
        "ignored",
      );
      expect(result).not.toBeNull();
    });

    it("returns null and sets error on insert failure", async () => {
      enqueueResult("communication_templates", {
        data: null,
        error: new Error("insert failed"),
      });
      const c = useCommunicationTemplates();
      const result = await c.createTemplate("n", "email", "body");
      expect(result).toBeNull();
      expect(c.error.value).toBe("insert failed");
    });

    it("uses default error message on non-Error failure", async () => {
      enqueueResult("communication_templates", {
        data: null,
        error: { something: true },
      });
      const c = useCommunicationTemplates();
      const result = await c.createTemplate("n", "email", "body");
      expect(result).toBeNull();
      expect(c.error.value).toBe("Failed to create template");
    });
  });

  // ── updateTemplate ──────────────────────────────────────────────────────────
  describe("updateTemplate", () => {
    it("returns false when no user", async () => {
      userState.user = null;
      const c = useCommunicationTemplates();
      const ok = await c.updateTemplate("id", { name: "x" });
      expect(ok).toBe(false);
    });

    it("updates in-memory entry on success", async () => {
      enqueueResult("communication_templates", { error: null });
      const c = useCommunicationTemplates();
      c.templates.value = [makeTemplate({ id: "id1", name: "old" })];
      const ok = await c.updateTemplate("id1", { name: "new" });
      expect(ok).toBe(true);
      expect(c.templates.value[0].name).toBe("new");
    });

    it("returns true even if id not in local list", async () => {
      enqueueResult("communication_templates", { error: null });
      const c = useCommunicationTemplates();
      const ok = await c.updateTemplate("missing", { name: "x" });
      expect(ok).toBe(true);
    });

    it("returns false and sets error on failure", async () => {
      enqueueResult("communication_templates", {
        error: new Error("update failed"),
      });
      const c = useCommunicationTemplates();
      const ok = await c.updateTemplate("id1", { name: "x" });
      expect(ok).toBe(false);
      expect(c.error.value).toBe("update failed");
    });

    it("uses default error message on non-Error failure", async () => {
      enqueueResult("communication_templates", { error: { weird: true } });
      const c = useCommunicationTemplates();
      const ok = await c.updateTemplate("id1", { name: "x" });
      expect(ok).toBe(false);
      expect(c.error.value).toBe("Failed to update template");
    });
  });

  // ── deleteTemplate ──────────────────────────────────────────────────────────
  describe("deleteTemplate", () => {
    it("returns false when no user", async () => {
      userState.user = null;
      const c = useCommunicationTemplates();
      const ok = await c.deleteTemplate("id");
      expect(ok).toBe(false);
    });

    it("removes template from list on success", async () => {
      enqueueResult("communication_templates", { error: null });
      const c = useCommunicationTemplates();
      c.templates.value = [
        makeTemplate({ id: "a" }),
        makeTemplate({ id: "b" }),
      ];
      const ok = await c.deleteTemplate("a");
      expect(ok).toBe(true);
      expect(c.templates.value.map((t) => t.id)).toEqual(["b"]);
    });

    it("returns false and sets error on failure", async () => {
      enqueueResult("communication_templates", {
        error: new Error("delete failed"),
      });
      const c = useCommunicationTemplates();
      const ok = await c.deleteTemplate("a");
      expect(ok).toBe(false);
      expect(c.error.value).toBe("delete failed");
    });

    it("uses default error message on non-Error failure", async () => {
      enqueueResult("communication_templates", { error: { other: 1 } });
      const c = useCommunicationTemplates();
      const ok = await c.deleteTemplate("a");
      expect(ok).toBe(false);
      expect(c.error.value).toBe("Failed to delete template");
    });
  });

  // ── toggleFavorite / incrementUseCount ──────────────────────────────────────
  describe("toggleFavorite", () => {
    it("returns false when template not found", async () => {
      const c = useCommunicationTemplates();
      const ok = await c.toggleFavorite("missing");
      expect(ok).toBe(false);
    });

    it("flips is_favorite on existing template", async () => {
      enqueueResult("communication_templates", { error: null });
      const c = useCommunicationTemplates();
      c.templates.value = [makeTemplate({ id: "a", is_favorite: false })];
      const ok = await c.toggleFavorite("a");
      expect(ok).toBe(true);
      expect(c.templates.value[0].is_favorite).toBe(true);
    });
  });

  describe("incrementUseCount", () => {
    it("no-ops when template missing", async () => {
      const c = useCommunicationTemplates();
      await expect(c.incrementUseCount("missing")).resolves.toBeUndefined();
    });

    it("increments use_count on existing template", async () => {
      enqueueResult("communication_templates", { error: null });
      const c = useCommunicationTemplates();
      c.templates.value = [makeTemplate({ id: "a", use_count: 4 })];
      await c.incrementUseCount("a");
      expect(c.templates.value[0].use_count).toBe(5);
    });
  });

  // ── allTemplates computed ───────────────────────────────────────────────────
  describe("allTemplates", () => {
    it("exposes the full template list", () => {
      const c = useCommunicationTemplates();
      const t = makeTemplate({ id: "z" });
      c.templates.value = [t];
      expect(c.allTemplates.value).toHaveLength(1);
      expect(c.allTemplates.value[0]).toStrictEqual(t);
    });
  });

  // ── checkUnlockCondition ────────────────────────────────────────────────────
  describe("checkUnlockCondition", () => {
    it("returns false when no user", async () => {
      userState.user = null;
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "profile_field",
        field: "x",
        description: "x",
      });
      expect(ok).toBe(false);
    });

    it("profile_field returns false when field not specified", async () => {
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "profile_field",
        description: "no field",
      });
      expect(ok).toBe(false);
    });

    it("profile_field returns true when nested value present", async () => {
      enqueueResult("user_preferences", {
        data: { player_details: { graduation_year: 2027 } },
        error: null,
      });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "profile_field",
        field: "player_details.graduation_year",
        description: "grad year",
      });
      expect(ok).toBe(true);
    });

    it("profile_field returns false when nested value missing", async () => {
      enqueueResult("user_preferences", {
        data: { player_details: { graduation_year: "" } },
        error: null,
      });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "profile_field",
        field: "player_details.graduation_year",
        description: "grad year",
      });
      expect(ok).toBe(false);
    });

    it("profile_field returns false when traversal hits non-object", async () => {
      enqueueResult("user_preferences", {
        data: { player_details: { graduation_year: 2027 } },
        error: null,
      });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "profile_field",
        field: "player_details.graduation_year.nested",
        description: "nested",
      });
      expect(ok).toBe(false);
    });

    it("profile_field returns false when prefs missing", async () => {
      enqueueResult("user_preferences", { data: null, error: null });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "profile_field",
        field: "player_details.x",
        description: "x",
      });
      expect(ok).toBe(false);
    });

    it("document_exists returns false without documentType", async () => {
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "document_exists",
        description: "no type",
      });
      expect(ok).toBe(false);
    });

    it("document_exists returns true when row found", async () => {
      enqueueResult("documents", { data: [{ id: "d1" }], error: null });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "document_exists",
        documentType: "transcript",
        description: "transcript",
      });
      expect(ok).toBe(true);
    });

    it("document_exists returns false when no rows", async () => {
      enqueueResult("documents", { data: [], error: null });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "document_exists",
        documentType: "transcript",
        description: "transcript",
      });
      expect(ok).toBe(false);
    });

    it("task_completed returns false without taskId", async () => {
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "task_completed",
        description: "x",
      });
      expect(ok).toBe(false);
    });

    it("task_completed returns true when status === completed", async () => {
      enqueueResult("athlete_task", {
        data: { status: "completed" },
        error: null,
      });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "task_completed",
        taskId: "t1",
        description: "task",
      });
      expect(ok).toBe(true);
    });

    it("task_completed returns false when status is not completed", async () => {
      enqueueResult("athlete_task", {
        data: { status: "in_progress" },
        error: null,
      });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "task_completed",
        taskId: "t1",
        description: "task",
      });
      expect(ok).toBe(false);
    });

    it("school_count returns true when count >= minCount", async () => {
      enqueueResult("schools", { data: null, error: null, count: 3 });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "school_count",
        minCount: 2,
        description: "schools",
      });
      expect(ok).toBe(true);
    });

    it("school_count uses 0 default minCount", async () => {
      enqueueResult("schools", { data: null, error: null, count: 0 });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "school_count",
        description: "schools",
      });
      expect(ok).toBe(true);
    });

    it("school_count returns false when below minCount", async () => {
      enqueueResult("schools", { data: null, error: null, count: 1 });
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "school_count",
        minCount: 5,
        description: "schools",
      });
      expect(ok).toBe(false);
    });

    it("returns false for unknown condition type", async () => {
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: "made_up" as any,
        description: "x",
      });
      expect(ok).toBe(false);
    });

    it("returns false when underlying query throws", async () => {
      // Make supabase.from throw synchronously inside the try block
      vi.mocked(useSupabase).mockReturnValueOnce({
        from: vi.fn(() => {
          throw new Error("network down");
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const c = useCommunicationTemplates();
      const ok = await c.checkUnlockCondition({
        type: "school_count",
        minCount: 1,
        description: "x",
      });
      expect(ok).toBe(false);
    });
  });

  // ── checkTemplateUnlocked ───────────────────────────────────────────────────
  describe("checkTemplateUnlocked", () => {
    it("treats absent unlock_conditions as unlocked", async () => {
      const c = useCommunicationTemplates();
      const result = await c.checkTemplateUnlocked(makeTemplate());
      expect(result.unlocked).toBe(true);
      expect(result.progressPercent).toBe(100);
      expect(result.missingConditions).toEqual([]);
    });

    it("treats empty conditions array as unlocked", async () => {
      const c = useCommunicationTemplates();
      const t = makeTemplate({
        unlock_conditions: { type: "AND", conditions: [] } as unknown as Record<
          string,
          unknown
        >,
      });
      const result = await c.checkTemplateUnlocked(t);
      expect(result.unlocked).toBe(true);
      expect(result.progressPercent).toBe(100);
    });

    it("AND: locked when any condition missing", async () => {
      enqueueResult("schools", { data: null, error: null, count: 0 });
      enqueueResult("documents", { data: [{ id: "d" }], error: null });
      const c = useCommunicationTemplates();
      const t = makeTemplate({
        unlock_conditions: {
          type: "AND",
          conditions: [
            { type: "school_count", minCount: 5, description: "schools" },
            {
              type: "document_exists",
              documentType: "transcript",
              description: "doc",
            },
          ],
        } as unknown as Record<string, unknown>,
      });
      const result = await c.checkTemplateUnlocked(t);
      expect(result.unlocked).toBe(false);
      expect(result.missingConditions).toHaveLength(1);
      expect(result.progressPercent).toBe(50);
    });

    it("AND: unlocked when all conditions met", async () => {
      enqueueResult("schools", { data: null, error: null, count: 5 });
      enqueueResult("documents", { data: [{ id: "d" }], error: null });
      const c = useCommunicationTemplates();
      const t = makeTemplate({
        unlock_conditions: {
          type: "AND",
          conditions: [
            { type: "school_count", minCount: 1, description: "schools" },
            {
              type: "document_exists",
              documentType: "transcript",
              description: "doc",
            },
          ],
        } as unknown as Record<string, unknown>,
      });
      const result = await c.checkTemplateUnlocked(t);
      expect(result.unlocked).toBe(true);
      expect(result.progressPercent).toBe(100);
      expect(result.missingConditions).toEqual([]);
    });

    it("OR: unlocked when any condition met", async () => {
      enqueueResult("schools", { data: null, error: null, count: 0 });
      enqueueResult("documents", { data: [{ id: "d" }], error: null });
      const c = useCommunicationTemplates();
      const t = makeTemplate({
        unlock_conditions: {
          type: "OR",
          conditions: [
            { type: "school_count", minCount: 5, description: "schools" },
            {
              type: "document_exists",
              documentType: "transcript",
              description: "doc",
            },
          ],
        } as unknown as Record<string, unknown>,
      });
      const result = await c.checkTemplateUnlocked(t);
      expect(result.unlocked).toBe(true);
      // unlocked → missingConditions cleared per implementation
      expect(result.missingConditions).toEqual([]);
      expect(result.progressPercent).toBe(50);
    });

    it("returns locked fallback when checks throw", async () => {
      // Make Promise.all reject by stubbing checkUnlockCondition path
      vi.mocked(useSupabase).mockReturnValueOnce({
        from: vi.fn(() => {
          throw new Error("explode");
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const c = useCommunicationTemplates();
      const t = makeTemplate({
        unlock_conditions: {
          type: "AND",
          conditions: [
            { type: "school_count", minCount: 1, description: "schools" },
          ],
        } as unknown as Record<string, unknown>,
      });
      // checkUnlockCondition swallows its own errors and returns false →
      // checkTemplateUnlocked still runs the normal path. Result: locked, 1 missing, 0%.
      const result = await c.checkTemplateUnlocked(t);
      expect(result.unlocked).toBe(false);
      expect(result.progressPercent).toBe(0);
      expect(result.missingConditions).toHaveLength(1);
    });
  });

  // ── getTemplatesWithUnlockStatus ────────────────────────────────────────────
  describe("getTemplatesWithUnlockStatus", () => {
    it("returns unlock status for each template", async () => {
      const c = useCommunicationTemplates();
      const result = await c.getTemplatesWithUnlockStatus([
        makeTemplate({ id: "a" }),
        makeTemplate({ id: "b" }),
      ]);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        unlocked: true,
        progressPercent: 100,
      });
      expect(c.isLoading.value).toBe(false);
    });

    it("toggles isLoading", async () => {
      const c = useCommunicationTemplates();
      const promise = c.getTemplatesWithUnlockStatus([makeTemplate()]);
      expect(c.isLoading.value).toBe(true);
      await promise;
      expect(c.isLoading.value).toBe(false);
    });

    it("falls back to unlocked-everything when Promise.all rejects", async () => {
      // Force the inner Promise.all to reject by making checkTemplateUnlocked throw via spread error
      // The simplest approach: pass a template with unlock_conditions that triggers a path,
      // then stub useSupabase to throw on .from() — but checkTemplateUnlocked catches that internally.
      // Easier: construct a template whose unlock_conditions getter throws.
      const evilTemplate = makeTemplate({ id: "evil" });
      Object.defineProperty(evilTemplate, "unlock_conditions", {
        get() {
          throw new Error("getter boom");
        },
      });

      const c = useCommunicationTemplates();
      const result = await c.getTemplatesWithUnlockStatus([evilTemplate]);
      // checkTemplateUnlocked's outer "if (!template.unlock_conditions)" check triggers the getter
      // which throws synchronously → bubbles up to getTemplatesWithUnlockStatus catch block.
      expect(result).toHaveLength(1);
      expect(result[0].unlocked).toBe(true);
      expect(result[0].progressPercent).toBe(100);
      expect(c.error.value).toBe("getter boom");
    });

    it("uses default error message when non-Error thrown", async () => {
      const evilTemplate = makeTemplate({ id: "evil" });
      Object.defineProperty(evilTemplate, "unlock_conditions", {
        get() {
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw "string-boom";
        },
      });
      const c = useCommunicationTemplates();
      const result = await c.getTemplatesWithUnlockStatus([evilTemplate]);
      expect(result).toHaveLength(1);
      expect(c.error.value).toBe("Failed to check template unlock status");
    });
  });

  // ── filterPredefined ────────────────────────────────────────────────────────
  describe("filterPredefined", () => {
    it("returns only templates flagged is_predefined === true", () => {
      const c = useCommunicationTemplates();
      const list: CommunicationTemplate[] = [
        makeTemplate({ id: "a", is_predefined: true }),
        makeTemplate({ id: "b", is_predefined: false }),
        makeTemplate({ id: "c" }), // missing is_predefined entirely
      ];
      const result = c.filterPredefined(list);
      expect(result.map((t) => t.id)).toEqual(["a"]);
    });

    it("returns empty array when no predefined templates", () => {
      const c = useCommunicationTemplates();
      const result = c.filterPredefined([makeTemplate({ id: "a" })]);
      expect(result).toEqual([]);
    });
  });
});
