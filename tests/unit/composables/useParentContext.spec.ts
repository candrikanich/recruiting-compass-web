import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useParentContext } from "~/composables/useParentContext";
import { useUserStore } from "~/stores/user";

const routerPushMock = vi.fn();
const routeMock = { query: {} as Record<string, string | undefined> };

vi.mock("vue-router", () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

const loggerState = { error: vi.fn() };
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    error: (...args: unknown[]) => loggerState.error(...args),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

interface LinkedAccount {
  user_id: string;
  full_name?: string;
  email: string;
  relationship: string;
}

const athleteA: LinkedAccount = {
  user_id: "athlete-1",
  full_name: "Alex Athlete",
  email: "alex@example.com",
  relationship: "player",
};

const athleteB: LinkedAccount = {
  user_id: "athlete-2",
  full_name: "Bailey Athlete",
  email: "bailey@example.com",
  relationship: "player",
};

const spouse: LinkedAccount = {
  user_id: "spouse-1",
  full_name: "Sam Spouse",
  email: "sam@example.com",
  relationship: "spouse",
};

const setUser = (
  user: {
    id: string;
    role: "parent" | "player" | "admin" | null;
    linked_accounts?: LinkedAccount[];
  } | null,
) => {
  const store = useUserStore();
  // @ts-expect-error - test override
  store.user = user;
};

describe("useParentContext", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routerPushMock.mockReset();
    loggerState.error.mockReset();
    routeMock.query = {};
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("exposes expected API surface", () => {
      const ctx = useParentContext();
      expect(typeof ctx.initialize).toBe("function");
      expect(typeof ctx.canViewAthlete).toBe("function");
      expect(typeof ctx.switchAthlete).toBe("function");
      expect(typeof ctx.getCurrentAthlete).toBe("function");
      expect(typeof ctx.getContextDisplay).toBe("function");
      expect(ctx.linkedAthletes.value).toEqual([]);
      expect(ctx.currentAthleteId.value).toBe(null);
    });

    it("isParent is false when no user is set", () => {
      const { isParent } = useParentContext();
      expect(isParent.value).toBe(false);
    });

    it("isParent is true when user role is parent", () => {
      setUser({ id: "parent-1", role: "parent" });
      const { isParent } = useParentContext();
      expect(isParent.value).toBe(true);
    });

    it("isParent is false when user role is player", () => {
      setUser({ id: "player-1", role: "player" });
      const { isParent } = useParentContext();
      expect(isParent.value).toBe(false);
    });

    it("isViewingAsParent is false when not a parent", () => {
      setUser({ id: "player-1", role: "player" });
      const { isViewingAsParent } = useParentContext();
      expect(isViewingAsParent.value).toBe(false);
    });
  });

  describe("initialize", () => {
    it("clears state when user is not a parent", async () => {
      setUser({ id: "player-1", role: "player" });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe(null);
      expect(ctx.linkedAthletes.value).toEqual([]);
    });

    it("clears state when there is no user at all", async () => {
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe(null);
      expect(ctx.linkedAthletes.value).toEqual([]);
    });

    it("filters linked_accounts to only player relationships", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, spouse, athleteB],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.linkedAthletes.value).toHaveLength(2);
      expect(ctx.linkedAthletes.value.map((a) => a.user_id)).toEqual([
        "athlete-1",
        "athlete-2",
      ]);
    });

    it("handles missing linked_accounts by defaulting to empty array", async () => {
      setUser({ id: "parent-1", role: "parent" });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.linkedAthletes.value).toEqual([]);
      expect(ctx.currentAthleteId.value).toBe(null);
    });

    it("uses query param athlete_id when valid", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, athleteB],
      });
      routeMock.query = { athlete_id: "athlete-2" };
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe("athlete-2");
    });

    it("ignores query param athlete_id when not in linked list", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      routeMock.query = { athlete_id: "unknown-id" };
      const ctx = useParentContext();
      await ctx.initialize();
      // Falls back to first athlete
      expect(ctx.currentAthleteId.value).toBe("athlete-1");
    });

    it("falls back to localStorage when no query param", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, athleteB],
      });
      localStorage.setItem("parent_last_viewed_athlete", "athlete-2");
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe("athlete-2");
    });

    it("ignores stale localStorage id not in current linked list", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      localStorage.setItem("parent_last_viewed_athlete", "athlete-99");
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe("athlete-1");
    });

    it("falls back to first athlete when no query param and no localStorage", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteB, athleteA],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe("athlete-2");
    });

    it("leaves currentAthleteId null when parent has no athletes", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe(null);
      expect(ctx.linkedAthletes.value).toEqual([]);
    });

    it("query param wins over localStorage", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, athleteB],
      });
      localStorage.setItem("parent_last_viewed_athlete", "athlete-1");
      routeMock.query = { athlete_id: "athlete-2" };
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe("athlete-2");
    });
  });

  describe("isViewingAsParent", () => {
    it("is true when parent is viewing a linked athlete", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.isViewingAsParent.value).toBe(true);
    });

    it("is false when currentAthleteId equals the parent's own id", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [{ ...athleteA, user_id: "parent-1" }],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.currentAthleteId.value).toBe("parent-1");
      expect(ctx.isViewingAsParent.value).toBe(false);
    });

    it("is false when currentAthleteId is null", () => {
      setUser({ id: "parent-1", role: "parent" });
      const ctx = useParentContext();
      expect(ctx.isViewingAsParent.value).toBe(false);
    });
  });

  describe("canViewAthlete", () => {
    it("returns false when user is not a parent", () => {
      setUser({ id: "player-1", role: "player" });
      const { canViewAthlete } = useParentContext();
      expect(canViewAthlete("athlete-1")).toBe(false);
    });

    it("returns true for an athlete in the linked list", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, athleteB],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.canViewAthlete("athlete-1")).toBe(true);
      expect(ctx.canViewAthlete("athlete-2")).toBe(true);
    });

    it("returns false for an athlete not in the linked list", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.canViewAthlete("not-linked")).toBe(false);
    });
  });

  describe("switchAthlete", () => {
    it("switches to a permitted athlete, persists to localStorage, and pushes router", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, athleteB],
      });
      const ctx = useParentContext();
      await ctx.initialize();

      await ctx.switchAthlete("athlete-2");

      expect(ctx.currentAthleteId.value).toBe("athlete-2");
      expect(localStorage.getItem("parent_last_viewed_athlete")).toBe(
        "athlete-2",
      );
      expect(routerPushMock).toHaveBeenCalledWith({
        query: { athlete_id: "athlete-2" },
      });
    });

    it("refuses to switch to an athlete not in the linked list and logs error", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      const ctx = useParentContext();
      await ctx.initialize();

      await ctx.switchAthlete("not-linked");

      expect(ctx.currentAthleteId.value).toBe("athlete-1");
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(localStorage.getItem("parent_last_viewed_athlete")).toBe(null);
      expect(loggerState.error).toHaveBeenCalledWith(
        "Parent does not have access to this athlete",
      );
    });

    it("refuses to switch when user is not a parent", async () => {
      setUser({ id: "player-1", role: "player" });
      const ctx = useParentContext();
      await ctx.switchAthlete("athlete-1");

      expect(routerPushMock).not.toHaveBeenCalled();
      expect(loggerState.error).toHaveBeenCalled();
    });
  });

  describe("getCurrentAthlete", () => {
    it("returns null when not viewing as parent", () => {
      setUser({ id: "player-1", role: "player" });
      const { getCurrentAthlete } = useParentContext();
      expect(getCurrentAthlete()).toBe(null);
    });

    it("returns the linked account matching currentAthleteId", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA, athleteB],
      });
      routeMock.query = { athlete_id: "athlete-2" };
      const ctx = useParentContext();
      await ctx.initialize();
      const current = ctx.getCurrentAthlete();
      expect(current).toEqual(athleteB);
    });

    it("returns null when parent has no linked athletes selected", () => {
      setUser({ id: "parent-1", role: "parent" });
      const { getCurrentAthlete } = useParentContext();
      expect(getCurrentAthlete()).toBe(null);
    });
  });

  describe("getContextDisplay", () => {
    it("returns empty string when not viewing as parent", () => {
      setUser({ id: "player-1", role: "player" });
      const { getContextDisplay } = useParentContext();
      expect(getContextDisplay()).toBe("");
    });

    it("renders full_name when available", async () => {
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.getContextDisplay()).toBe("Viewing Alex Athlete's profile");
    });

    it("falls back to email when full_name is missing", async () => {
      const athleteNoName: LinkedAccount = {
        user_id: "athlete-3",
        email: "noname@example.com",
        relationship: "player",
      };
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteNoName],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      expect(ctx.getContextDisplay()).toBe(
        "Viewing noname@example.com's profile",
      );
    });

    it("returns empty string when current athlete cannot be resolved", async () => {
      // Force isViewingAsParent true but mismatched currentAthleteId so find() returns undefined
      setUser({
        id: "parent-1",
        role: "parent",
        linked_accounts: [athleteA],
      });
      const ctx = useParentContext();
      await ctx.initialize();
      // Mutate currentAthleteId to a value that is not the parent's id (so isViewingAsParent stays true)
      // but is also absent from linkedAthletes — getCurrentAthlete().find returns undefined.
      ctx.currentAthleteId.value = "ghost-athlete";
      // linkedAthletes still contains athleteA, so find() returns undefined
      expect(ctx.isViewingAsParent.value).toBe(true);
      // getCurrentAthlete returns undefined (no match), so getContextDisplay short-circuits to ""
      expect(ctx.getContextDisplay()).toBe("");
    });
  });
});
