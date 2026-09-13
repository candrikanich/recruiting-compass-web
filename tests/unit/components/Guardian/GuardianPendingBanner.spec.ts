import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

const mockStatus: { value: { locked: boolean; status: string; guardianEmailMasked: string | null } } = {
  value: { locked: false, status: "none", guardianEmailMasked: null },
};
const mockLoad = vi.fn(async () => mockStatus.value);
const mockResend = vi.fn(async () => {});

vi.mock("~/composables/useGuardianStatus", () => ({
  useGuardianStatus: () => ({
    isPending: { value: mockStatus.value.status === "pending" },
    isLocked: { value: mockStatus.value.locked },
    guardianEmailMasked: { value: mockStatus.value.guardianEmailMasked },
    status: mockStatus,
    load: mockLoad,
    resend: mockResend,
  }),
}));
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: vi.fn() }),
}));

import GuardianPendingBanner from "~/components/Guardian/GuardianPendingBanner.vue";

describe("GuardianPendingBanner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an 'invite a parent' form when locked with status 'none'", async () => {
    mockStatus.value = { locked: true, status: "none", guardianEmailMasked: null };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Invite a parent or guardian");
    expect(wrapper.find('[data-testid="guardian-invite-email"]').exists()).toBe(true);
  });

  it("shows the waiting message when locked with status 'pending'", async () => {
    mockStatus.value = { locked: true, status: "pending", guardianEmailMasked: "p****@example.com" };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Waiting on your parent or guardian");
    expect(wrapper.find('[data-testid="guardian-invite-email"]').exists()).toBe(false);
  });

  it("renders nothing when not locked", async () => {
    mockStatus.value = { locked: false, status: "claimed", guardianEmailMasked: null };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("submits the typed email via resend()", async () => {
    mockStatus.value = { locked: true, status: "none", guardianEmailMasked: null };
    const wrapper = mount(GuardianPendingBanner);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-testid="guardian-invite-email"]').setValue("mom@example.com");
    await wrapper.find('[data-testid="guardian-invite-submit"]').trigger("click");

    expect(mockResend).toHaveBeenCalledWith("mom@example.com");
  });
});
