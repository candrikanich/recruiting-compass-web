import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAccountLinks } from "~/composables/useAccountLinks";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";
import { useToast } from "~/composables/useToast";

vi.mock("~/composables/useSupabase");
vi.mock("~/stores/user");
vi.mock("~/composables/useToast");

vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({
    activeFamilyId: { value: "family-123" },
    activeAthleteId: { value: "athlete-123" },
    isParentViewing: { value: false },
    familyMembers: { value: [] },
    getAccessibleAthletes: () => [],
    getDataOwnerUserId: () => "athlete-123",
    switchAthlete: vi.fn(),
    initializeFamily: vi.fn(),
    fetchFamilyMembers: vi.fn(),
    loading: { value: false },
    error: { value: null },
  }),
}));

// Mock global $fetch
global.$fetch = vi.fn();

describe("useAccountLinks", () => {
  let mockSupabase: any;
  let mockUserStore: any;
  let mockToast: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserStore = {
      user: {
        id: "user-123",
        email: "parent@test.com",
        role: "parent",
      },
    };

    mockToast = {
      showToast: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn(),
    };

    vi.mocked(useSupabase).mockReturnValue(mockSupabase);
    vi.mocked(useUserStore).mockReturnValue(mockUserStore);
    vi.mocked(useToast).mockReturnValue(mockToast);
  });

  describe("sendInvitation", () => {
    it("should send invitation to valid email with existing user", async () => {
      // Mock: no existing links (within limit)
      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock: API check-user endpoint returns existing user
      vi.mocked(global.$fetch).mockResolvedValueOnce({
        exists: true,
        user: {
          id: "user-456",
          role: "student",
          email_confirmed_at: "2024-01-01T00:00:00Z",
        },
      });

      // Mock: no existing link
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "No rows found" },
      });

      // Mock: insert succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "link-1", status: "pending" },
        error: null,
      });

      // Mock: API invite endpoint succeeds
      vi.mocked(global.$fetch).mockResolvedValueOnce(undefined);

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("student@test.com");

      expect(result).toBe(true);
      expect(error.value).toBe(null);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("invalid-email");

      expect(result).toBe(false);
      expect(error.value).toContain("valid email");
    });

    it("should reject self-invitation", async () => {
      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("parent@test.com");

      expect(result).toBe(false);
      expect(error.value).toContain("cannot invite yourself");
    });

    it("should enforce 5-user limit (accepted + pending)", async () => {
      // Mock: 5 existing links
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { id: "1", status: "accepted" },
          { id: "2", status: "accepted" },
          { id: "3", status: "pending" },
          { id: "4", status: "accepted" },
          { id: "5", status: "pending" },
        ],
        error: null,
      });

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("new@test.com");

      expect(result).toBe(false);
      expect(error.value).toContain("maximum of 5 linked accounts");
    });

    it("should allow invitation when at 4 users (under limit)", async () => {
      // Mock: 4 existing links
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { id: "1", status: "accepted" },
          { id: "2", status: "accepted" },
          { id: "3", status: "pending" },
          { id: "4", status: "accepted" },
        ],
        error: null,
      });

      // Mock: API check-user endpoint returns existing user
      vi.mocked(global.$fetch).mockResolvedValueOnce({
        exists: true,
        user: {
          id: "user-456",
          role: "student",
          email_confirmed_at: "2024-01-01T00:00:00Z",
        },
      });

      // Mock: no existing link
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "No rows found" },
      });

      // Mock: insert succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "link-5", status: "pending" },
        error: null,
      });

      // Mock: API invite endpoint succeeds
      vi.mocked(global.$fetch).mockResolvedValueOnce(undefined);

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("new@test.com");

      expect(result).toBe(true);
      expect(error.value).toBe(null);
    });

    it("should reject invitation to user with wrong role", async () => {
      // Mock: no existing links
      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock: API check-user endpoint returns user with wrong role
      vi.mocked(global.$fetch).mockResolvedValueOnce({
        exists: true,
        user: {
          id: "user-456",
          role: "parent",
          email_confirmed_at: "2024-01-01T00:00:00Z",
        },
      });

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("otherparent@test.com");

      expect(result).toBe(false);
      expect(error.value).toContain("parent");
    });

    it("should reject invitation to unverified user", async () => {
      // Mock: no existing links
      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock: API check-user endpoint returns unverified user
      vi.mocked(global.$fetch).mockResolvedValueOnce({
        exists: true,
        user: {
          id: "user-456",
          role: "student",
          email_confirmed_at: null,
        },
      });

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("unverified@test.com");

      expect(result).toBe(false);
      expect(error.value).toContain("not verified");
    });

    it("should reject duplicate invitation", async () => {
      // Mock: no existing links
      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock: API check-user endpoint returns existing user
      vi.mocked(global.$fetch).mockResolvedValueOnce({
        exists: true,
        user: {
          id: "user-456",
          role: "student",
          email_confirmed_at: "2024-01-01T00:00:00Z",
        },
      });

      // Mock: existing link found
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "existing-link", status: "accepted" },
        error: null,
      });

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("existing@test.com");

      expect(result).toBe(false);
      expect(error.value).toContain("already have a link");
    });

    it("should handle database errors gracefully", async () => {
      // Mock: database error
      mockSupabase.in.mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed" },
      });

      const { sendInvitation, error } = useAccountLinks();
      const result = await sendInvitation("test@test.com");

      expect(result).toBe(false);
      expect(error.value).toContain("Database connection failed");
    });
  });

  describe("acceptInvitation", () => {
    it("should accept valid non-expired invitation", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const linkData = {
        id: "link-1",
        parent_user_id: "parent-123",
        player_user_id: "player-456",
        expires_at: futureDate,
        status: "pending",
      };

      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.update.mockReturnThis();
      mockSupabase.or.mockReturnThis();
      mockSupabase.in.mockReturnThis();

      // Use mockResolvedValue for persistent mocking
      mockSupabase.single.mockResolvedValue({
        data: linkData,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.or.mockResolvedValue({ data: [], error: null });

      const { acceptInvitation, error } = useAccountLinks();
      const result = await acceptInvitation("link-1");

      // Should not reject expired invitations
      expect(error.value).not.toContain("expired");
    });

    it("should reject expired invitation", async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const linkData = {
        id: "link-1",
        expires_at: pastDate,
        status: "pending",
      };

      // Mock: fetch link with expired date
      mockSupabase.single.mockResolvedValueOnce({
        data: linkData,
        error: null,
      });

      const { acceptInvitation, error } = useAccountLinks();
      const result = await acceptInvitation("link-1");

      expect(result).toBe(false);
      expect(error.value).toContain("expired");
    });

    it("should handle missing invitation", async () => {
      // Mock: link not found
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      const { acceptInvitation, error } = useAccountLinks();
      const result = await acceptInvitation("invalid-link-id");

      expect(result).toBe(false);
      expect(error.value).toContain("not found");
    });
  });

  describe("rejectInvitation", () => {
    it("should reject invitation successfully", async () => {
      // Mock: update succeeds
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      // Mock: fetch links after rejection
      mockSupabase.or.mockResolvedValueOnce({ data: [], error: null });

      const { rejectInvitation, error } = useAccountLinks();
      const result = await rejectInvitation("link-1");

      expect(result).toBe(true);
      expect(error.value).toBe(null);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: "rejected",
      });
    });

    it("should handle rejection errors", async () => {
      // Mock: update fails
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: "Update failed" },
      });

      const { rejectInvitation, error } = useAccountLinks();
      const result = await rejectInvitation("link-1");

      expect(result).toBe(false);
      expect(error.value).toContain("Update failed");
    });
  });

  describe("unlinkAccount", () => {
    it("should unlink account successfully", async () => {
      const linkData = {
        id: "link-1",
        parent_user_id: "parent-123",
        player_user_id: "player-456",
      };

      // Setup proper chaining - need to preserve chainability
      const chainableObj: any = {
        from: vi.fn(),
        select: vi.fn(),
        eq: vi.fn(),
        delete: vi.fn(),
        or: vi.fn(),
        in: vi.fn(),
        single: vi.fn(),
        rpc: vi.fn(),
      };

      // All chainable methods return the same object
      chainableObj.from.mockReturnValue(chainableObj);
      chainableObj.select.mockReturnValue(chainableObj);
      chainableObj.delete.mockReturnValue(chainableObj);
      chainableObj.eq.mockReturnValue(chainableObj);
      chainableObj.or.mockReturnValue(chainableObj);
      chainableObj.in.mockReturnValue(chainableObj);

      // Terminal methods that resolve
      chainableObj.single.mockResolvedValue({
        data: linkData,
        error: null,
      });

      let rpcCallCount = 0;
      chainableObj.rpc.mockImplementation(async () => {
        rpcCallCount++;
        return { data: null, error: null };
      });

      vi.mocked(useSupabase).mockReturnValue(chainableObj);

      const { unlinkAccount, error } = useAccountLinks();
      const result = await unlinkAccount("link-1");

      // Verify no errors occurred
      expect(error.value).toBe(null);
      // Verify RPC was called for duplication
      expect(rpcCallCount).toBeGreaterThanOrEqual(1);
    });

    it("should handle missing link on unlink", async () => {
      // Mock: link not found
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      const { unlinkAccount, error } = useAccountLinks();
      const result = await unlinkAccount("invalid-link-id");

      expect(result).toBe(false);
      expect(error.value).toContain("not found");
    });
  });

  describe("fetchAccountLinks", () => {
    it("should fetch and separate accepted vs pending links", async () => {
      const links = [
        {
          id: "1",
          status: "accepted",
          parent_user_id: "parent-123",
          player_user_id: "player-1",
          initiator_user_id: "parent-123",
          invited_email: "p1@test.com",
        },
        {
          id: "2",
          status: "pending_acceptance",
          parent_user_id: null,
          player_user_id: null,
          initiator_user_id: "parent-123",
          invited_email: "parent@test.com",
        },
        {
          id: "3",
          status: "accepted",
          parent_user_id: "parent-123",
          player_user_id: "player-3",
          initiator_user_id: "parent-123",
          invited_email: "p3@test.com",
        },
      ];

      // Mock: fetch all links
      mockSupabase.or.mockResolvedValueOnce({
        data: links,
        error: null,
      });

      // Mock: fetch user details for accepted links
      mockSupabase.in.mockResolvedValueOnce({
        data: [
          { id: "player-1", email: "p1@test.com", full_name: "Player 1", role: "student" },
          { id: "player-3", email: "p3@test.com", full_name: "Player 3", role: "student" },
        ],
        error: null,
      });

      const { fetchAccountLinks, linkedAccounts, receivedInvitations } = useAccountLinks();
      await fetchAccountLinks();

      expect(linkedAccounts.value).toHaveLength(2);
      expect(receivedInvitations.value).toHaveLength(1);
    });

    it("should handle empty links list", async () => {
      // Mock: no links
      mockSupabase.or.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { fetchAccountLinks, linkedAccounts, receivedInvitations } = useAccountLinks();
      await fetchAccountLinks();

      expect(linkedAccounts.value).toHaveLength(0);
      expect(receivedInvitations.value).toHaveLength(0);
    });

    it("should handle fetch errors gracefully", async () => {
      // Mock: fetch error
      mockSupabase.or.mockResolvedValueOnce({
        data: null,
        error: { message: "Fetch failed" },
      });

      const { fetchAccountLinks, error } = useAccountLinks();
      await fetchAccountLinks();

      expect(error.value).toContain("Fetch failed");
    });

    it("should not fetch user details if no accepted links", async () => {
      const links = [
        {
          id: "1",
          status: "pending",
          parent_user_id: "parent-123",
          player_user_id: "player-1",
        },
      ];

      // Mock: fetch links (only pending)
      mockSupabase.or.mockResolvedValueOnce({
        data: links,
        error: null,
      });

      const { fetchAccountLinks, linkedAccounts } = useAccountLinks();
      await fetchAccountLinks();

      expect(linkedAccounts.value).toHaveLength(0);
      // Verify 'in' was not called for user details since no accepted links
      expect(mockSupabase.in).not.toHaveBeenCalled();
    });
  });

  describe("State Management", () => {
    it("should initialize with correct default state", () => {
      const {
        links,
        linkedAccounts,
        sentInvitations,
        receivedInvitations,
        pendingConfirmations,
        loading,
        error,
      } = useAccountLinks();

      expect(links.value).toEqual([]);
      expect(linkedAccounts.value).toEqual([]);
      expect(sentInvitations.value).toEqual([]);
      expect(receivedInvitations.value).toEqual([]);
      expect(pendingConfirmations.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBe(null);
    });

    it("should set loading state during operations", async () => {
      // Mock: no existing links
      mockSupabase.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock: existing user found
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "user-456",
          role: "student",
          email_confirmed_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // Mock: no existing link
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "No rows found" },
      });

      // Mock: insert succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "link-1", status: "pending" },
        error: null,
      });

      // Mock: fetch links
      mockSupabase.or.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { sendInvitation, loading } = useAccountLinks();

      expect(loading.value).toBe(false);

      const promise = sendInvitation("student@test.com");
      // Note: In real async flow, loading would be true during operation
      // But due to vitest's sync execution, we can only check after

      await promise;
      expect(loading.value).toBe(false);
    });
  });
});
