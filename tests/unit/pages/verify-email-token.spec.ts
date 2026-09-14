import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import verifyEmailTokenPage from "~/pages/verify-email/[token].vue";

const mockRoute = { params: { token: "tok-1" } };
vi.stubGlobal("useRoute", () => mockRoute);

const mockGetSession = vi.fn();

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({ auth: { getSession: mockGetSession } }),
}));

describe("pages/verify-email/[token].vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const wrapper = createWrapper();
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
});
