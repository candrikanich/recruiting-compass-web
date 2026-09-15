import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import verifyEmailTokenPage from "~/pages/verify-email/[token].vue";

const mockRoute = { params: { token: "tok-1" } };
vi.stubGlobal("useRoute", () => mockRoute);

const mockGetSession = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({ auth: { getSession: mockGetSession } }),
}));

// The resend button must go through the composable (which uses $fetchAuth) —
// the resend endpoint is requireAuth-gated and a bare $fetch would 401.
const mockResendVerificationEmail = vi.fn(async () => true);
vi.mock("~/composables/useEmailVerification", () => ({
  useEmailVerification: () => ({
    resendVerificationEmail: mockResendVerificationEmail,
  }),
}));

describe("pages/verify-email/[token].vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResendVerificationEmail.mockResolvedValue(true);
    global.navigateTo = vi.fn();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
  });

  const createWrapper = () => mount(verifyEmailTokenPage);

  it("shows success and routes to dashboard when a session exists", async () => {
    global.$fetch = vi.fn().mockResolvedValue({ status: "verified" }) as never;
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("verified");
    expect(global.navigateTo).toHaveBeenCalledWith("/dashboard");
  });

  it("routes to login with a success banner when no session exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    global.$fetch = vi.fn().mockResolvedValue({ status: "verified" }) as never;
    createWrapper();
    await flushPromises();

    expect(global.navigateTo).toHaveBeenCalledWith(
      "/login?reason=email_verified",
    );
  });

  it("shows an inline resend button on an expired token", async () => {
    global.$fetch = vi.fn().mockRejectedValue({ statusCode: 410 }) as never;
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("expired");
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("resends through the authed composable, not a bare $fetch", async () => {
    global.$fetch = vi.fn().mockRejectedValue({ statusCode: 410 }) as never;
    const wrapper = createWrapper();
    await flushPromises();

    (global.$fetch as unknown as ReturnType<typeof vi.fn>).mockClear();
    await wrapper.find("button").trigger("click");
    await flushPromises();

    expect(mockResendVerificationEmail).toHaveBeenCalled();
    expect(global.$fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("New verification email sent");
  });

  it("offers a login link instead of resend when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    global.$fetch = vi.fn().mockRejectedValue({ statusCode: 410 }) as never;
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain("expired");
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.text()).toContain("Log in to request a new link");
  });
});
