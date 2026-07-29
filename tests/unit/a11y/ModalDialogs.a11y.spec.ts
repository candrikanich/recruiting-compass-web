import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import EmailSendModal from "~/components/EmailSendModal.vue";
import TemplateSendModal from "~/components/TemplateSendModal.vue";
import AddCoachModal from "~/components/Coach/AddCoachModal.vue";
import OtherCoachModal from "~/components/Coach/OtherCoachModal.vue";

vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    allTemplates: { value: [] },
    loadUserTemplates: vi.fn(),
    interpolateTemplate: vi.fn(() => ""),
  }),
}));

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({ createCoach: vi.fn() }),
}));

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const GLOBAL = {
  stubs: { Teleport: true, UIcon: true },
};

describe("modal dialog accessibility", () => {
  let wrapper: ReturnType<typeof mount>;

  afterEach(() => {
    wrapper?.unmount();
  });

  const mountModal = (component: unknown, props: Record<string, unknown>) =>
    mount(component as never, {
      props,
      global: GLOBAL,
      attachTo: document.body,
    });

  const expectDialogSemantics = (title: string) => {
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
    const labelId = dialog.attributes("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(wrapper.find(`#${labelId}`).text()).toContain(title);
  };

  describe("EmailSendModal", () => {
    const props = {
      isOpen: true,
      recipientEmail: "coach@example.com",
      subject: "Introduction",
      body: "Hello coach",
    };

    it("exposes dialog semantics", () => {
      wrapper = mountModal(EmailSendModal, props);
      expectDialogSemantics("Send Email");
    });

    it("emits close on Escape", async () => {
      wrapper = mountModal(EmailSendModal, props);
      await wrapper.find('[role="dialog"]').trigger("keydown.escape");
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("has no axe violations when open", async () => {
      wrapper = mountModal(EmailSendModal, props);
      expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
    });
  });

  describe("TemplateSendModal", () => {
    const props = {
      isOpen: true,
      coach: { first_name: "Jane", last_name: "Doe" },
      messageType: "Email" as const,
    };

    it("exposes dialog semantics", () => {
      wrapper = mountModal(TemplateSendModal, props);
      expectDialogSemantics("Send Email");
    });

    it("emits close on Escape", async () => {
      wrapper = mountModal(TemplateSendModal, props);
      await wrapper.find('[role="dialog"]').trigger("keydown.escape");
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("has no axe violations when open", async () => {
      wrapper = mountModal(TemplateSendModal, props);
      expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
    });
  });

  describe("AddCoachModal", () => {
    const props = { show: true, schoolId: "school-1" };

    it("exposes dialog semantics", () => {
      wrapper = mountModal(AddCoachModal, props);
      expectDialogSemantics("Add New Coach");
    });

    it("emits close on Escape", async () => {
      wrapper = mountModal(AddCoachModal, props);
      await wrapper.find('[role="dialog"]').trigger("keydown.escape");
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("has no axe violations when open", async () => {
      wrapper = mountModal(AddCoachModal, props);
      expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
    });
  });

  describe("OtherCoachModal", () => {
    const props = { show: true };

    it("exposes dialog semantics", () => {
      wrapper = mountModal(OtherCoachModal, props);
      expectDialogSemantics("Other Coach");
    });

    it("emits close on Escape", async () => {
      wrapper = mountModal(OtherCoachModal, props);
      await wrapper.find('[role="dialog"]').trigger("keydown.escape");
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("has no axe violations when open", async () => {
      wrapper = mountModal(OtherCoachModal, props);
      expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
    });
  });
});
