import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFamilyInvitations } from "~/composables/useFamilyInvitations";

const mockFetchAuth = vi.fn();
vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe("useFamilyInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAuth.mockResolvedValue({ invitations: [] });
  });

  describe("fetchInvitations", () => {
    it("sets invitations, clears error, and resets loading on success", async () => {
      const sampleInvites = [
        {
          id: "inv-1",
          invited_email: "a@test.com",
          role: "player",
          expires_at: "2099-01-01",
          created_at: "2026-01-01",
        },
      ];
      mockFetchAuth.mockResolvedValueOnce({ invitations: sampleInvites });
      const { fetchInvitations, invitations, error, loading } =
        useFamilyInvitations();
      await fetchInvitations();
      expect(invitations.value).toEqual(sampleInvites);
      expect(error.value).toBeNull();
      expect(loading.value).toBe(false);
    });

    it("sets error and resets loading when fetch rejects", async () => {
      mockFetchAuth.mockRejectedValueOnce(new Error("Network failure"));
      const { fetchInvitations, error, loading } = useFamilyInvitations();
      await fetchInvitations();
      expect(error.value).toBe("Failed to load invitations");
      expect(loading.value).toBe(false);
    });
  });

  describe("revokeInvitation", () => {
    it("calls DELETE then re-fetches invitations on success", async () => {
      const remaining = [
        {
          id: "inv-2",
          invited_email: "b@test.com",
          role: "parent",
          expires_at: "2099-01-01",
          created_at: "2026-01-01",
        },
      ];
      mockFetchAuth
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce({ invitations: remaining }); // re-fetch
      const { revokeInvitation, invitations } = useFamilyInvitations();
      await revokeInvitation("inv-1");
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/family/invitations/inv-1",
        { method: "DELETE" },
      );
      expect(invitations.value).toEqual(remaining);
    });

    it("sets error and resets loading when DELETE rejects", async () => {
      mockFetchAuth.mockRejectedValueOnce(new Error("Delete failed"));
      const { revokeInvitation, error, loading } = useFamilyInvitations();
      await revokeInvitation("inv-1");
      expect(error.value).toBe("Failed to revoke invitation");
      expect(loading.value).toBe(false);
    });
  });

  describe("resendInvitation", () => {
    it("revokes the old invite then creates a new one with the same email and role", async () => {
      const { resendInvitation } = useFamilyInvitations();

      await resendInvitation("inv-123", "owen@example.com", "player");

      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/family/invitations/inv-123",
        { method: "DELETE" },
      );
      expect(mockFetchAuth).toHaveBeenCalledWith("/api/family/invite", {
        method: "POST",
        body: { email: "owen@example.com", role: "player" },
      });
    });

    it("sets error and re-throws when the POST invite call fails", async () => {
      const { resendInvitation, error } = useFamilyInvitations();
      mockFetchAuth
        .mockResolvedValueOnce(undefined) // DELETE succeeds
        .mockRejectedValueOnce(new Error("Server error")); // POST fails

      await expect(
        resendInvitation("inv-123", "owen@example.com", "player"),
      ).rejects.toThrow("Server error");

      expect(error.value).toBe("Failed to resend invitation");
    });

    it("refreshes invitations after resend", async () => {
      const { resendInvitation, invitations } = useFamilyInvitations();
      mockFetchAuth
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(undefined) // POST invite
        .mockResolvedValueOnce({
          invitations: [
            {
              id: "new-inv",
              invited_email: "owen@example.com",
              role: "player",
              expires_at: "2099-01-01",
              created_at: "2026-02-28",
            },
          ],
        });

      await resendInvitation("inv-123", "owen@example.com", "player");

      expect(invitations.value).toHaveLength(1);
      expect(invitations.value[0].id).toBe("new-inv");
    });
  });
});
