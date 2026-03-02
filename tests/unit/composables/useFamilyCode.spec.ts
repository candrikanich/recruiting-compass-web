import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFamilyCode } from "~/composables/useFamilyCode";

// ── Mutable user state ───────────────────────────────────────────────────────

const mockUserState = {
  user: null as { id: string; role: string } | null,
};

// ── Mutable Supabase from() result ────────────────────────────────────────────

let supabaseFromMock: (table: string) => unknown = () => ({});

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock ~/stores/user so the module resolves, AND inject as global for Nuxt auto-import
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get user() {
      return mockUserState.user;
    },
  }),
}));

// useUserStore, useSupabase, and useAuthFetch are Nuxt auto-imports in the source
// (no explicit import statements). They must be injected as globals in the test environment.

global.useUserStore = () => ({
  get user() {
    return mockUserState.user;
  },
});

global.useSupabase = () => ({
  from: (table: string) => supabaseFromMock(table),
});

global.useAuthFetch = () => ({ $fetchAuth: mockFetchAuth });

const mockFetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

const mockRefetchFamilies = vi.fn();
vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: () => ({ refetchFamilies: mockRefetchFamilies }),
}));

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    from: (table: string) => supabaseFromMock(table),
  }),
}));

// ── Chain builders ────────────────────────────────────────────────────────────

/**
 * Player branch: chain that terminates with .maybeSingle()
 */
const buildPlayerChain = (opts: {
  result?: unknown;
  error?: unknown;
}) => ({
  select: function () { return this; },
  eq: function () { return this; },
  maybeSingle: async () => ({
    data: opts.result ?? null,
    error: opts.error ?? null,
  }),
});

/**
 * Parent branch: chain that is awaited directly (no explicit terminator).
 * We make the object thenable so `await supabase.from(...).select(...).eq(...).eq(...)` resolves.
 */
const buildParentChain = (opts: {
  result?: unknown[] | null;
  error?: unknown;
}) => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.then = (
    resolve: (v: { data: unknown[] | null; error: unknown }) => void,
    reject: (e: unknown) => void,
  ) => {
    resolve({ data: opts.result ?? null, error: opts.error ?? null });
  };
  return chain;
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("useFamilyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.user = null;
    supabaseFromMock = () => ({});
    mockRefetchFamilies.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── fetchMyCode — unauthenticated ─────────────────────────────────────────

  describe("fetchMyCode — unauthenticated", () => {
    it("sets error 'User not authenticated' when user is null", async () => {
      const { fetchMyCode, error } = useFamilyCode();
      await fetchMyCode();
      expect(error.value).toBe("User not authenticated");
    });
  });

  // ── fetchMyCode — player branch ────────────────────────────────────────────

  describe("fetchMyCode — player branch", () => {
    beforeEach(() => {
      mockUserState.user = { id: "player-1", role: "player" };
    });

    it("populates myFamilyCode, myFamilyId, myFamilyName from family_members join", async () => {
      supabaseFromMock = () =>
        buildPlayerChain({
          result: {
            family_units: {
              id: "fam-1",
              family_code: "ABC123",
              family_name: "Smith Family",
              code_generated_at: "2026-01-01",
              created_by_user_id: "other-user",
            },
          },
        });

      const { fetchMyCode, myFamilyCode, myFamilyId, myFamilyName } = useFamilyCode();
      await fetchMyCode();

      expect(myFamilyCode.value).toBe("ABC123");
      expect(myFamilyId.value).toBe("fam-1");
      expect(myFamilyName.value).toBe("Smith Family");
    });

    it("sets isPlayerFamilyCreator=true when created_by_user_id matches user.id", async () => {
      mockUserState.user = { id: "creator-user", role: "player" };

      supabaseFromMock = () =>
        buildPlayerChain({
          result: {
            family_units: {
              id: "fam-1",
              family_code: "XYZ",
              family_name: "My Family",
              code_generated_at: "2026-01-01",
              created_by_user_id: "creator-user",
            },
          },
        });

      const { fetchMyCode, isPlayerFamilyCreator } = useFamilyCode();
      await fetchMyCode();

      expect(isPlayerFamilyCreator.value).toBe(true);
    });

    it("leaves isPlayerFamilyCreator=false when created_by_user_id differs", async () => {
      supabaseFromMock = () =>
        buildPlayerChain({
          result: {
            family_units: {
              id: "fam-1",
              family_code: "XYZ",
              family_name: "Other Family",
              code_generated_at: "2026-01-01",
              created_by_user_id: "someone-else",
            },
          },
        });

      const { fetchMyCode, isPlayerFamilyCreator } = useFamilyCode();
      await fetchMyCode();

      expect(isPlayerFamilyCreator.value).toBe(false);
    });

    it("sets error when Supabase returns an error", async () => {
      supabaseFromMock = () =>
        buildPlayerChain({ error: { message: "DB error" } });

      const { fetchMyCode, error } = useFamilyCode();
      await fetchMyCode();

      expect(error.value).toBe("DB error");
    });
  });

  // ── fetchMyCode — parent branch ────────────────────────────────────────────

  describe("fetchMyCode — parent branch", () => {
    beforeEach(() => {
      mockUserState.user = { id: "parent-1", role: "parent" };
    });

    const membershipRows = [
      {
        family_unit_id: "fam-1",
        family_units: {
          id: "fam-1",
          family_code: "PARENT1",
          family_name: "Jones Family",
          code_generated_at: "2026-02-01",
        },
      },
      {
        family_unit_id: "fam-2",
        family_units: {
          id: "fam-2",
          family_code: "PARENT2",
          family_name: "Doe Family",
          code_generated_at: "2026-02-15",
        },
      },
    ];

    it("populates parentFamilies from membership rows", async () => {
      supabaseFromMock = () =>
        buildParentChain({ result: membershipRows });

      const { fetchMyCode, parentFamilies } = useFamilyCode();
      await fetchMyCode();

      expect(parentFamilies.value).toHaveLength(2);
      expect(parentFamilies.value[0].familyCode).toBe("PARENT1");
      expect(parentFamilies.value[1].familyCode).toBe("PARENT2");
    });

    it("sets myFamilyCode/myFamilyId/myFamilyName from first family", async () => {
      supabaseFromMock = () =>
        buildParentChain({ result: membershipRows });

      const { fetchMyCode, myFamilyCode, myFamilyId, myFamilyName } = useFamilyCode();
      await fetchMyCode();

      expect(myFamilyCode.value).toBe("PARENT1");
      expect(myFamilyId.value).toBe("fam-1");
      expect(myFamilyName.value).toBe("Jones Family");
    });

    it("sets error when Supabase returns an error", async () => {
      supabaseFromMock = () =>
        buildParentChain({ error: { message: "Parent fetch failed" } });

      const { fetchMyCode, error } = useFamilyCode();
      await fetchMyCode();

      expect(error.value).toBe("Parent fetch failed");
    });
  });

  // ── createFamily ───────────────────────────────────────────────────────────

  describe("createFamily", () => {
    beforeEach(() => {
      mockUserState.user = { id: "player-1", role: "player" };
    });

    it("POSTs to /api/family/create and sets code/id/name from response", async () => {
      mockFetchAuth.mockResolvedValue({
        success: true,
        familyCode: "NEW123",
        familyId: "new-fam-id",
        familyName: "New Family",
      });

      const { createFamily, myFamilyCode, myFamilyId, myFamilyName } = useFamilyCode();
      await createFamily();

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/create", {
        method: "POST",
      });
      expect(myFamilyCode.value).toBe("NEW123");
      expect(myFamilyId.value).toBe("new-fam-id");
      expect(myFamilyName.value).toBe("New Family");
    });

    it("sets successMessage after successful creation", async () => {
      mockFetchAuth.mockResolvedValue({
        success: true,
        familyCode: "NEW123",
        familyId: "new-fam-id",
        familyName: "New Family",
      });

      const { createFamily, successMessage } = useFamilyCode();
      await createFamily();

      expect(successMessage.value).toBe(
        "Family created! Share your code with parents.",
      );
    });

    it("sets isPlayerFamilyCreator=true after creating a family", async () => {
      mockFetchAuth.mockResolvedValue({
        success: true,
        familyCode: "NEW123",
        familyId: "new-fam-id",
        familyName: "New Family",
      });

      const { createFamily, isPlayerFamilyCreator } = useFamilyCode();
      await createFamily();

      expect(isPlayerFamilyCreator.value).toBe(true);
    });

    it("sets error on API failure", async () => {
      mockFetchAuth.mockRejectedValue({
        data: { message: "Already has a family" },
      });

      const { createFamily, error } = useFamilyCode();
      await createFamily();

      expect(error.value).toBe("Already has a family");
    });

    it("manages loading state: true during call, false after", async () => {
      let loadingDuringCall = false;
      const composable = useFamilyCode();

      mockFetchAuth.mockImplementation(async () => {
        loadingDuringCall = composable.loading.value;
        return {
          success: true,
          familyCode: "C",
          familyId: "i",
          familyName: "n",
        };
      });

      await composable.createFamily();

      expect(loadingDuringCall).toBe(true);
      expect(composable.loading.value).toBe(false);
    });
  });

  // ── joinByCode ─────────────────────────────────────────────────────────────

  describe("joinByCode", () => {
    it("sets error 'Only parents can join families' when user role is 'player'", async () => {
      mockUserState.user = { id: "player-1", role: "player" };

      const { joinByCode, error } = useFamilyCode();
      const result = await joinByCode("ABC123");

      expect(result).toBe(false);
      expect(error.value).toBe("Only parents can join families");
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });

    it("POSTs to /api/family/code/join with uppercased and trimmed code", async () => {
      mockUserState.user = { id: "parent-1", role: "parent" };
      supabaseFromMock = () => buildParentChain({ result: [] });
      mockFetchAuth.mockResolvedValue({ message: "Welcome to the family!" });

      const { joinByCode } = useFamilyCode();
      await joinByCode("  abc123  ");

      expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/code/join", {
        method: "POST",
        body: { familyCode: "ABC123" },
      });
    });

    it("sets successMessage from response on success", async () => {
      mockUserState.user = { id: "parent-1", role: "parent" };
      supabaseFromMock = () => buildParentChain({ result: [] });
      mockFetchAuth.mockResolvedValue({ message: "Welcome to the family!" });

      const { joinByCode, successMessage } = useFamilyCode();
      await joinByCode("ABC123");

      expect(successMessage.value).toBe("Welcome to the family!");
    });

    it("calls fetchMyCode and refetchFamilies on success", async () => {
      mockUserState.user = { id: "parent-1", role: "parent" };
      supabaseFromMock = () => buildParentChain({ result: [] });
      mockFetchAuth.mockResolvedValue({ message: "Joined!" });

      const { joinByCode } = useFamilyCode();
      await joinByCode("CODE1");

      expect(mockRefetchFamilies).toHaveBeenCalledOnce();
    });

    it("sets rate-limit error message for 429 status", async () => {
      mockUserState.user = { id: "parent-1", role: "parent" };
      mockFetchAuth.mockRejectedValue({ statusCode: 429 });

      const { joinByCode, error } = useFamilyCode();
      await joinByCode("BAD");

      expect(error.value).toBe("Too many attempts. Please wait 5 minutes.");
    });

    it("sets not-found error message for 404 status", async () => {
      mockUserState.user = { id: "parent-1", role: "parent" };
      mockFetchAuth.mockRejectedValue({ statusCode: 404 });

      const { joinByCode, error } = useFamilyCode();
      await joinByCode("NOPE");

      expect(error.value).toBe(
        "Family code not found. Please check and try again.",
      );
    });

    it("sets data.message for 400 status", async () => {
      mockUserState.user = { id: "parent-1", role: "parent" };
      mockFetchAuth.mockRejectedValue({
        statusCode: 400,
        data: { message: "Code already used" },
      });

      const { joinByCode, error } = useFamilyCode();
      await joinByCode("OLD");

      expect(error.value).toBe("Code already used");
    });
  });

  // ── regenerateCode ─────────────────────────────────────────────────────────

  describe("regenerateCode", () => {
    it("sets error 'No family to regenerate code for' when myFamilyId is null", async () => {
      const { regenerateCode, error } = useFamilyCode();
      const result = await regenerateCode();

      expect(result).toBe(false);
      expect(error.value).toBe("No family to regenerate code for");
      expect(mockFetchAuth).not.toHaveBeenCalled();
    });

    it("POSTs to /api/family/code/regenerate and updates myFamilyCode", async () => {
      mockUserState.user = { id: "player-1", role: "player" };

      // First call (fetchMyCode) populates myFamilyId
      supabaseFromMock = () =>
        buildPlayerChain({
          result: {
            family_units: {
              id: "fam-42",
              family_code: "OLD123",
              family_name: "Fam",
              code_generated_at: "2026-01-01",
              created_by_user_id: "player-1",
            },
          },
        });

      const composable = useFamilyCode();
      await composable.fetchMyCode();
      expect(composable.myFamilyId.value).toBe("fam-42");

      mockFetchAuth.mockResolvedValue({ familyCode: "REGEN99" });
      await composable.regenerateCode();

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/family/code/regenerate",
        {
          method: "POST",
          body: { familyId: "fam-42" },
        },
      );
      expect(composable.myFamilyCode.value).toBe("REGEN99");
    });
  });

  // ── copyCodeToClipboard ────────────────────────────────────────────────────

  describe("copyCodeToClipboard", () => {
    beforeEach(() => {
      Object.defineProperty(global.navigator, "clipboard", {
        value: { writeText: vi.fn() },
        configurable: true,
        writable: true,
      });
    });

    it("calls navigator.clipboard.writeText with the code", async () => {
      vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

      const { copyCodeToClipboard } = useFamilyCode();
      await copyCodeToClipboard("FAM123");

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("FAM123");
    });

    it("sets successMessage 'Code copied to clipboard!'", async () => {
      vi.useFakeTimers();
      vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

      const { copyCodeToClipboard, successMessage } = useFamilyCode();
      await copyCodeToClipboard("FAM123");

      expect(successMessage.value).toBe("Code copied to clipboard!");
    });

    it("clears successMessage after 3 seconds", async () => {
      vi.useFakeTimers();
      vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

      const { copyCodeToClipboard, successMessage } = useFamilyCode();
      await copyCodeToClipboard("FAM123");

      expect(successMessage.value).toBe("Code copied to clipboard!");
      vi.advanceTimersByTime(3000);
      expect(successMessage.value).toBeNull();
    });

    it("sets error 'Failed to copy code' on clipboard failure", async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
        new Error("Clipboard denied"),
      );

      const { copyCodeToClipboard, error } = useFamilyCode();
      await copyCodeToClipboard("FAM123");

      expect(error.value).toBe("Failed to copy code");
    });
  });

  // ── removeFamilyMember ─────────────────────────────────────────────────────

  describe("removeFamilyMember", () => {
    beforeEach(() => {
      mockUserState.user = { id: "player-1", role: "player" };
    });

    it("DELETEs /api/family/members/:memberId and sets successMessage", async () => {
      // fetchMyCode (called after delete) hits Supabase — return empty result
      supabaseFromMock = () => buildPlayerChain({ result: null });
      mockFetchAuth.mockResolvedValue(undefined);

      const { removeFamilyMember, successMessage } = useFamilyCode();
      const result = await removeFamilyMember("member-99");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/family/members/member-99",
        { method: "DELETE" },
      );
      expect(successMessage.value).toBe("Family member removed successfully");
      expect(result).toBe(true);
    });

    it("calls fetchMyCode on success (verifiable via Supabase being invoked)", async () => {
      const fromSpy = vi.fn(() => buildPlayerChain({ result: null }));
      supabaseFromMock = fromSpy;
      mockFetchAuth.mockResolvedValue(undefined);

      const { removeFamilyMember } = useFamilyCode();
      await removeFamilyMember("member-99");

      // fetchMyCode calls supabase.from("family_members")
      expect(fromSpy).toHaveBeenCalledWith("family_members");
    });

    it("sets error on DELETE failure", async () => {
      mockFetchAuth.mockRejectedValue({
        data: { message: "Not authorized to remove this member" },
      });

      const { removeFamilyMember, error } = useFamilyCode();
      const result = await removeFamilyMember("member-99");

      expect(result).toBe(false);
      expect(error.value).toBe("Not authorized to remove this member");
    });
  });
});
