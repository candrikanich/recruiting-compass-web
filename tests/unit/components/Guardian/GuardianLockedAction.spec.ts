import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

// Real refs, not plain { value } objects: the component's template reads these
// unwrapped (`v-if="hasNoGuardianYet"`, not `hasNoGuardianYet.value`), which only
// Vue-reactive refs auto-unwrap in a template — a plain object is always truthy.
const mockHasNoGuardianYet = ref(false);
const mockGuardianEmailMasked = ref<string | null>(null);
const mockResend = vi.fn(async () => {});
const mockShowToast = vi.fn();

vi.mock("~/composables/useGuardianStatus", () => ({
  useGuardianStatus: () => ({
    hasNoGuardianYet: mockHasNoGuardianYet,
    guardianEmailMasked: mockGuardianEmailMasked,
    resend: mockResend,
  }),
}));
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({ showToast: mockShowToast }),
}));

import GuardianLockedAction from "~/components/Guardian/GuardianLockedAction.vue";

describe("GuardianLockedAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasNoGuardianYet.value = false;
    mockGuardianEmailMasked.value = null;
    mockResend.mockImplementation(async () => {});
  });

  it("offers 'Remind them' when a guardian was already named", async () => {
    mockHasNoGuardianYet.value = false;
    mockGuardianEmailMasked.value = "p****@example.com";
    const wrapper = mount(GuardianLockedAction, { props: { action: "message coaches" } });

    expect(wrapper.find('[data-testid="guardian-locked-invite-email"]').exists()).toBe(false);
    await wrapper.find("button").trigger("click");
    expect(mockResend).toHaveBeenCalledWith();
  });

  it("offers an email input + 'Invite' — not a dead-end resend — when no guardian was ever named", async () => {
    mockHasNoGuardianYet.value = true;
    const wrapper = mount(GuardianLockedAction, { props: { action: "message coaches" } });

    expect(wrapper.find('[data-testid="guardian-locked-invite-email"]').exists()).toBe(true);

    await wrapper.find('[data-testid="guardian-locked-invite-email"]').setValue("mom@example.com");
    await wrapper.find('[data-testid="guardian-locked-invite-submit"]').trigger("click");

    expect(mockResend).toHaveBeenCalledWith("mom@example.com");
  });

  it("disables the invite submit until an email is typed", async () => {
    mockHasNoGuardianYet.value = true;
    const wrapper = mount(GuardianLockedAction, { props: {} });

    const submit = wrapper.find('[data-testid="guardian-locked-invite-submit"]');
    expect(submit.attributes("disabled")).toBeDefined();
  });
});
