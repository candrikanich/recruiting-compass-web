import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { useAccountProvisioning } from "~/composables/useAccountProvisioning";
import { useAuthFetch } from "~/composables/useAuthFetch";
import { useUserStore } from "~/stores/user";

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: vi.fn(),
}));
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(),
}));
vi.mock("~/utils/logger", () => ({
  createClientLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn() }),
}));

const mockUseAuthFetch = vi.mocked(useAuthFetch);
const mockUseUserStore = vi.mocked(useUserStore);

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-123",
    user_metadata: {},
    ...overrides,
  }) as User;

describe("useAccountProvisioning", () => {
  let fetchAuthMock: ReturnType<typeof vi.fn>;
  let userStoreState: { user: { is_admin: boolean; full_name?: string } | null };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchAuthMock = vi.fn().mockResolvedValue({});
    mockUseAuthFetch.mockReturnValue({ $fetchAuth: fetchAuthMock } as any);

    userStoreState = { user: { is_admin: false, full_name: "Existing Name" } };
    mockUseUserStore.mockReturnValue({
      get user() {
        return userStoreState.user;
      },
      initializeUser: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it("calls /api/family/create for every provisioned user", async () => {
    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(buildUser());

    expect(fetchAuthMock).toHaveBeenCalledWith("/api/family/create", {
      method: "POST",
    });
  });

  it("does not throw when family creation fails — must never block sign-in", async () => {
    fetchAuthMock.mockRejectedValueOnce(new Error("network error"));

    const { ensureAccountProvisioned } = useAccountProvisioning();
    await expect(ensureAccountProvisioned(buildUser())).resolves.toBeUndefined();
  });

  it("applies the pending admin flag when metadata carries it and the user isn't already admin", async () => {
    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(
      buildUser({ user_metadata: { pending_admin: true } }),
    );

    expect(fetchAuthMock).toHaveBeenCalledWith("/api/auth/admin-profile", {
      method: "POST",
      body: { fullName: "Existing Name" },
    });
  });

  it("does not call admin-profile when there is no pending admin intent", async () => {
    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(buildUser());

    expect(fetchAuthMock).not.toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.anything(),
    );
  });

  it("does not re-apply the admin flag once the user is already admin", async () => {
    userStoreState.user = { is_admin: true };

    const { ensureAccountProvisioned } = useAccountProvisioning();
    await ensureAccountProvisioned(
      buildUser({ user_metadata: { pending_admin: true } }),
    );

    expect(fetchAuthMock).not.toHaveBeenCalledWith(
      "/api/auth/admin-profile",
      expect.anything(),
    );
  });
});
