import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGuardianStatus } from "~/composables/useGuardianStatus";
import type { GuardianStatus } from "~/server/api/guardian/status.get";

const mockFetchAuth = vi.fn();

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchAuth }),
}));

const statusOf = (overrides: Partial<GuardianStatus>): GuardianStatus => ({
  locked: true,
  guardianEmailMasked: null,
  expiresAt: null,
  status: "pending",
  ...overrides,
});

describe("useGuardianStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["none", "expired", "revoked"] as const)(
    "hasNoGuardianYet is true for status '%s' — no live claim to resend, needs the invite form",
    async (status) => {
      mockFetchAuth.mockResolvedValueOnce(statusOf({ status }));
      const { hasNoGuardianYet, load } = useGuardianStatus();

      await load(true);

      expect(hasNoGuardianYet.value).toBe(true);
    },
  );

  it.each(["pending", "claimed"] as const)(
    "hasNoGuardianYet is false for status '%s' — a live or resolved claim exists",
    async (status) => {
      mockFetchAuth.mockResolvedValueOnce(statusOf({ status }));
      const { hasNoGuardianYet, load } = useGuardianStatus();

      await load(true);

      expect(hasNoGuardianYet.value).toBe(false);
    },
  );

  it("hasNoGuardianYet is false before any status has loaded", () => {
    const { hasNoGuardianYet } = useGuardianStatus();

    expect(hasNoGuardianYet.value).toBe(false);
  });

  it("reset() clears cached status and forces the next load() to refetch — prevents a new user's session from seeing the previous user's cached status", async () => {
    mockFetchAuth.mockResolvedValueOnce(statusOf({ status: "pending" }));
    const { status, reset, load } = useGuardianStatus();

    await load(true);
    expect(status.value?.status).toBe("pending");

    reset();
    expect(status.value).toBeNull();

    mockFetchAuth.mockResolvedValueOnce(statusOf({ status: "claimed" }));
    await load(); // no force — must still refetch because reset() cleared `loaded`

    expect(mockFetchAuth).toHaveBeenCalledTimes(2);
    expect(status.value?.status).toBe("claimed");
  });
});
