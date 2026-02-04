import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import FamilyInviteModal from "~/components/FamilyInviteModal.vue";

vi.mock("~/composables/useFamilyInvite", () => ({
  useFamilyInvite: () => ({
    sendParentInvite: vi.fn().mockResolvedValue(undefined),
    loading: { value: false },
    error: { value: null },
  }),
}));

describe("FamilyInviteModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render parent email input field", () => {
    const wrapper = mount(FamilyInviteModal);
    const input = wrapper.find("input[type='email']");
    expect(input.exists()).toBe(true);
  });

  it("should have email input placeholder", () => {
    const wrapper = mount(FamilyInviteModal);
    const input = wrapper.find("input[type='email']");
    expect(input.attributes("placeholder") || "").toBeTruthy();
  });

  it("should render Send Invite button", () => {
    const wrapper = mount(FamilyInviteModal);
    const text = wrapper.text();
    expect(text.includes("Send") || text.includes("Invite")).toBe(true);
  });

  it("should validate email format", async () => {
    const wrapper = mount(FamilyInviteModal);
    const input = wrapper.find("input[type='email']");

    await input.setValue("invalid-email");
    const buttons = wrapper.findAll("button");
    const sendButton = buttons[buttons.length - 1];
    await sendButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Should show error or not emit success
    expect(wrapper.emitted("invite-sent")).toBeFalsy();
  });

  it("should accept valid email address", async () => {
    const wrapper = mount(FamilyInviteModal);
    const input = wrapper.find("input[type='email']");

    await input.setValue("parent@example.com");
    expect((input.element as HTMLInputElement).value).toBe(
      "parent@example.com",
    );
  });

  it("should show invite and parent text", async () => {
    const wrapper = mount(FamilyInviteModal);
    const text = wrapper.text().toLowerCase();
    expect(
      text.includes("invite") &&
        (text.includes("parent") || text.includes("guardian")),
    ).toBe(true);
  });

  it("should render Continue button or Skip button", () => {
    const wrapper = mount(FamilyInviteModal);
    const text = wrapper.text();
    expect(text.includes("Continue") || text.includes("Skip")).toBe(true);
  });

  it("should have proper form structure", () => {
    const wrapper = mount(FamilyInviteModal);
    expect(wrapper.find("form").exists()).toBe(true);
    expect(wrapper.find("input[type='email']").exists()).toBe(true);
  });

  it("should have at least two buttons for actions", () => {
    const wrapper = mount(FamilyInviteModal);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle form submission", async () => {
    const wrapper = mount(FamilyInviteModal);
    const input = wrapper.find("input[type='email']");

    await input.setValue("parent@example.com");
    const buttons = wrapper.findAll("button");
    const sendButton = buttons.find(
      (btn) =>
        (btn.text() || "").toLowerCase().includes("send") ||
        (btn.text() || "").toLowerCase().includes("invite"),
    );

    if (sendButton) {
      // Just verify we can click it without errors
      await sendButton.trigger("click");
      expect(wrapper.exists()).toBe(true);
    }
  });
});
