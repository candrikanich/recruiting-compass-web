import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
import type { User, Session } from "@supabase/supabase-js";

// _debug exports are gated on NODE_ENV === "development". Set the env var
// BEFORE importing the module so the conditional export is included.
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
beforeAll(() => {
  process.env.NODE_ENV = "development";
});
afterAll(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

vi.mock("~/composables/useSupabase");

let storeState = {
  user: null as { id: string; email: string } | null,
  isAuthenticated: false,
  loading: false,
};

vi.mock("~/stores/user", () => ({
  useUserStore: () => storeState,
}));

import { useAuth } from "~/composables/useAuth";
import { useSupabase } from "~/composables/useSupabase";

const mockUseSupabase = vi.mocked(useSupabase);

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  user_metadata: {},
  app_metadata: {},
  ...overrides,
});

const buildSession = (user: User): Session => ({
  user,
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  expires_at: Date.now() / 1000 + 3600,
});

describe("useAuth — _debug helpers", () => {
  let mockAuth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storeState = { user: null, isAuthenticated: false, loading: false };
    mockAuth = {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(),
    };
    mockUseSupabase.mockReturnValue({ auth: mockAuth } as never);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "group").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    vi.spyOn(console, "table").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("debug exports presence", () => {
    it("exposes _debug helpers when NODE_ENV=development", () => {
      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug?: Record<string, unknown>;
      };
      expect(auth._debug).toBeDefined();
      expect(typeof auth._debug?.getAuthState).toBe("function");
      expect(typeof auth._debug?.logAuthState).toBe("function");
      expect(typeof auth._debug?.compareAuthStates).toBe("function");
      expect(typeof auth._debug?.verifyUserIdStability).toBe("function");
    });
  });

  describe("getAuthState", () => {
    it("returns consistent state when auth, session, and store agree", async () => {
      const user = buildUser({ id: "u-1", email: "a@b.com" });
      const session = buildSession(user);
      mockAuth.getUser.mockResolvedValue({ data: { user } });
      mockAuth.getSession.mockResolvedValue({ data: { session } });
      storeState = {
        user: { id: "u-1", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            isConsistent: boolean;
            issues: string[];
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.isConsistent).toBe(true);
      expect(state.issues).toEqual([]);
    });

    it("flags mismatched user IDs", async () => {
      const user = buildUser({ id: "u-1", email: "a@b.com" });
      mockAuth.getUser.mockResolvedValue({ data: { user } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(user) },
      });
      storeState = {
        user: { id: "u-2", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            isConsistent: boolean;
            issues: string[];
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.isConsistent).toBe(false);
      expect(
        state.issues.some((i) => i.includes("doesn't match store user ID")),
      ).toBe(true);
    });

    it("flags mismatched emails", async () => {
      const user = buildUser({ id: "u-1", email: "a@b.com" });
      mockAuth.getUser.mockResolvedValue({ data: { user } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(user) },
      });
      storeState = {
        user: { id: "u-1", email: "other@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            isConsistent: boolean;
            issues: string[];
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.isConsistent).toBe(false);
      expect(
        state.issues.some((i) => i.includes("doesn't match store email")),
      ).toBe(true);
    });

    it("flags when auth is set but store is empty", async () => {
      const user = buildUser({ id: "u-1", email: "a@b.com" });
      mockAuth.getUser.mockResolvedValue({ data: { user } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(user) },
      });
      storeState = { user: null, isAuthenticated: false, loading: false };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            isConsistent: boolean;
            issues: string[];
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.isConsistent).toBe(false);
      expect(state.issues).toContain(
        "User is authenticated but store is empty",
      );
    });

    it("flags when store is populated but auth is empty", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });
      storeState = {
        user: { id: "u-1", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            isConsistent: boolean;
            issues: string[];
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.isConsistent).toBe(false);
      expect(state.issues).toContain("Store has user ID but auth is empty");
    });

    it("flags session/store user id mismatch", async () => {
      const authUser = buildUser({ id: "u-1", email: "a@b.com" });
      const sessionUser = buildUser({ id: "u-session", email: "a@b.com" });
      mockAuth.getUser.mockResolvedValue({ data: { user: authUser } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(sessionUser) },
      });
      storeState = {
        user: { id: "u-store", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            isConsistent: boolean;
            issues: string[];
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.isConsistent).toBe(false);
      expect(state.issues.some((i) => i.includes("Session user ID"))).toBe(
        true,
      );
    });

    it("returns nulls when nothing is set", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });
      mockAuth.getSession.mockResolvedValue({ data: { session: null } });
      storeState = { user: null, isAuthenticated: false, loading: false };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          getAuthState: () => Promise<{
            authUserId: string | null;
            sessionUserId: string | null;
            storeUserId: string | null;
            isConsistent: boolean;
          }>;
        };
      };
      const state = await auth._debug.getAuthState();

      expect(state.authUserId).toBe(null);
      expect(state.sessionUserId).toBe(null);
      expect(state.storeUserId).toBe(null);
      expect(state.isConsistent).toBe(true);
    });
  });

  describe("logAuthState", () => {
    it("returns the same state object getAuthState would", async () => {
      const user = buildUser({ id: "u-1", email: "a@b.com" });
      mockAuth.getUser.mockResolvedValue({ data: { user } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(user) },
      });
      storeState = {
        user: { id: "u-1", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: { logAuthState: () => Promise<{ isConsistent: boolean }> };
      };
      const state = await auth._debug.logAuthState();

      expect(state.isConsistent).toBe(true);
    });
  });

  describe("compareAuthStates", () => {
    const baseState = {
      authUserId: "u-1",
      authEmail: "a@b.com",
      sessionUserId: "u-1",
      sessionEmail: "a@b.com",
      storeUserId: "u-1",
      storeEmail: "a@b.com",
      storeAuthenticated: true,
      storeLoading: false,
      isConsistent: true,
      issues: [],
    };

    it("returns undefined when no changes detected", async () => {
      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          compareAuthStates: (
            a: typeof baseState,
            b: typeof baseState,
          ) => Promise<unknown>;
        };
      };
      const result = await auth._debug.compareAuthStates(baseState, baseState);
      expect(result).toBeUndefined();
    });

    it("returns a diff when auth user id changes", async () => {
      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          compareAuthStates: (
            a: typeof baseState,
            b: typeof baseState,
          ) => Promise<
            Record<string, { before: string | null; after: string | null }>
          >;
        };
      };
      const next = { ...baseState, authUserId: "u-2" };
      const diff = await auth._debug.compareAuthStates(baseState, next);
      expect(diff?.authUserId).toEqual({ before: "u-1", after: "u-2" });
    });

    it("returns a diff for every changed field", async () => {
      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          compareAuthStates: (
            a: typeof baseState,
            b: typeof baseState,
          ) => Promise<Record<string, unknown>>;
        };
      };
      const next = {
        ...baseState,
        authUserId: "x",
        authEmail: "new@b.com",
        storeUserId: "y",
        storeEmail: "store@b.com",
      };
      const diff = await auth._debug.compareAuthStates(baseState, next);
      expect(Object.keys(diff ?? {}).sort()).toEqual([
        "authEmail",
        "authUserId",
        "storeEmail",
        "storeUserId",
      ]);
    });
  });

  describe("verifyUserIdStability", () => {
    it("returns areStable=true when ids never change across three measurements", async () => {
      const user = buildUser({ id: "u-1", email: "a@b.com" });
      mockAuth.getUser.mockResolvedValue({ data: { user } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(user) },
      });
      storeState = {
        user: { id: "u-1", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          verifyUserIdStability: () => Promise<{
            measurements: unknown[];
            areStable: boolean;
          }>;
        };
      };
      const result = await auth._debug.verifyUserIdStability();

      expect(result.areStable).toBe(true);
      expect(result.measurements).toHaveLength(3);
    });

    it("returns areStable=false when auth user id changes between measurements", async () => {
      const userA = buildUser({ id: "u-1", email: "a@b.com" });
      const userB = buildUser({ id: "u-2", email: "a@b.com" });
      mockAuth.getUser
        .mockResolvedValueOnce({ data: { user: userA } })
        .mockResolvedValueOnce({ data: { user: userB } })
        .mockResolvedValueOnce({ data: { user: userB } });
      mockAuth.getSession.mockResolvedValue({
        data: { session: buildSession(userA) },
      });
      storeState = {
        user: { id: "u-1", email: "a@b.com" },
        isAuthenticated: true,
        loading: false,
      };

      const auth = useAuth() as ReturnType<typeof useAuth> & {
        _debug: {
          verifyUserIdStability: () => Promise<{ areStable: boolean }>;
        };
      };
      const result = await auth._debug.verifyUserIdStability();

      expect(result.areStable).toBe(false);
    });
  });
});
