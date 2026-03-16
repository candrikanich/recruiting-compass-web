import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mockFetchAuth = vi.fn();
const mockUpdateProfileFields = vi.fn();
const mockStore = {
  user: { id: "u1", full_name: "Jane", email: "j@example.com", role: "player" },
  isAthlete: true,
  updateProfileFields: mockUpdateProfileFields,
};

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => mockStore),
}));

// Import after mocks
const { useUserProfile } = await import("~/composables/useUserProfile");

describe("useUserProfile", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockStore.isAthlete = true;
  });

  describe("savePersonalInfo", () => {
    it("calls $fetchAuth with PATCH /api/user/profile and returns true on success", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { savePersonalInfo } = useUserProfile();
      const result = await savePersonalInfo({ full_name: "Jane Doe" });
      expect(result).toBe(true);
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/user/profile",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("calls store.updateProfileFields with saved fields", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { savePersonalInfo } = useUserProfile();
      await savePersonalInfo({ full_name: "Jane Doe", phone: "555-1234" });
      expect(mockUpdateProfileFields).toHaveBeenCalledWith({
        full_name: "Jane Doe",
        phone: "555-1234",
      });
    });

    it("sets personalInfoError and returns false on network error", async () => {
      mockFetchAuth.mockRejectedValue(new Error("Network error"));
      const { savePersonalInfo, personalInfoError } = useUserProfile();
      const result = await savePersonalInfo({ full_name: "Jane Doe" });
      expect(result).toBe(false);
      expect(personalInfoError.value).toBeTruthy();
    });

    it("sets personalInfoSaved to true on success", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { savePersonalInfo, personalInfoSaved } = useUserProfile();
      await savePersonalInfo({ full_name: "Jane Doe" });
      expect(personalInfoSaved.value).toBe(true);
    });

    it("resets personalInfoSaved to false at start of new call", async () => {
      mockFetchAuth.mockResolvedValueOnce({ success: true });
      mockFetchAuth.mockRejectedValueOnce(new Error("fail"));
      const { savePersonalInfo, personalInfoSaved } = useUserProfile();
      await savePersonalInfo({ full_name: "Jane Doe" });
      expect(personalInfoSaved.value).toBe(true);
      await savePersonalInfo({ full_name: "Jane Doe" });
      expect(personalInfoSaved.value).toBe(false);
    });
  });

  describe("changePassword", () => {
    it("returns true and sets passwordSaved on success", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { changePassword, passwordSaved } = useUserProfile();
      const result = await changePassword("OldPass!", "NewPass123!");
      expect(result).toBe(true);
      expect(passwordSaved.value).toBe(true);
    });

    it("calls $fetchAuth with POST /api/auth/change-password", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { changePassword } = useUserProfile();
      await changePassword("OldPass!", "NewPass123!");
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("sets 401-specific error message on 401 response", async () => {
      mockFetchAuth.mockRejectedValue({ statusCode: 401 });
      const { changePassword, passwordError } = useUserProfile();
      const result = await changePassword("wrong", "NewPass123!");
      expect(result).toBe(false);
      expect(passwordError.value).toContain("incorrect");
    });

    it("sets generic error message on non-401 failure", async () => {
      mockFetchAuth.mockRejectedValue({ statusCode: 500 });
      const { changePassword, passwordError } = useUserProfile();
      await changePassword("OldPass!", "NewPass123!");
      expect(passwordError.value).toContain("Failed to change password");
    });
  });

  describe("changeEmail", () => {
    it("returns true and sets emailChangePending on success", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { changeEmail, emailChangePending } = useUserProfile();
      const result = await changeEmail("new@example.com", "MyPass!");
      expect(result).toBe(true);
      expect(emailChangePending.value).toBe(true);
    });

    it("calls $fetchAuth with POST /api/auth/change-email", async () => {
      mockFetchAuth.mockResolvedValue({ success: true });
      const { changeEmail } = useUserProfile();
      await changeEmail("new@example.com", "MyPass!");
      expect(mockFetchAuth).toHaveBeenCalledWith(
        "/api/auth/change-email",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("sets 401-specific error message on 401 response", async () => {
      mockFetchAuth.mockRejectedValue({ statusCode: 401 });
      const { changeEmail, emailError } = useUserProfile();
      await changeEmail("new@example.com", "wrong");
      expect(emailError.value).toContain("incorrect");
    });

    it("sets generic error message on non-401 failure", async () => {
      mockFetchAuth.mockRejectedValue({ statusCode: 500 });
      const { changeEmail, emailError } = useUserProfile();
      await changeEmail("new@example.com", "MyPass!");
      expect(emailError.value).toContain("Failed to update email");
    });
  });

  describe("isAthlete", () => {
    it("returns true when store.isAthlete is true", () => {
      const { isAthlete } = useUserProfile();
      expect(isAthlete.value).toBe(true);
    });

    it("returns false when store.isAthlete is false", () => {
      mockStore.isAthlete = false;
      const { isAthlete } = useUserProfile();
      expect(isAthlete.value).toBe(false);
    });
  });
});
