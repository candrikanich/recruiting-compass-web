import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { axe } from "vitest-axe";
import EventEditModal from "~/components/Events/EventEditModal.vue";
import EventQuickLogModal from "~/components/Events/EventQuickLogModal.vue";

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const GLOBAL = { stubs: { Teleport: true, UIcon: true } };

const mountModal = (component: unknown, props: Record<string, unknown>) =>
  mount(component as never, {
    props,
    global: GLOBAL,
    attachTo: document.body,
  });

describe("Events modals accessibility (Phase 10c extraction, fixed post-Phase-12)", () => {
  let wrapper: ReturnType<typeof mount>;

  afterEach(() => {
    wrapper?.unmount();
  });

  const expectDialogSemantics = (title: string) => {
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
    const labelId = dialog.attributes("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(wrapper.find(`#${labelId}`).text()).toContain(title);
  };

  const expectEscapeCloses = async (closeEvent: string) => {
    await wrapper.find('[role="dialog"]').trigger("keydown.escape");
    expect(wrapper.emitted(closeEvent)).toBeTruthy();
  };

  describe("EventEditModal", () => {
    const props = {
      isOpen: true,
      isUpdating: false,
      formData: {
        name: "Regional Camp",
        type: "camp",
        location: "State University",
        start_date: "2026-08-01",
        end_date: "",
        cost: 0,
        performance_notes: "",
      },
    };

    it("exposes dialog semantics", () => {
      wrapper = mountModal(EventEditModal, props);
      expectDialogSemantics("Edit Event");
    });

    it("closes on Escape", async () => {
      wrapper = mountModal(EventEditModal, props);
      await expectEscapeCloses("cancel");
    });

    it("moves focus into the dialog on open (focus trap engaged)", async () => {
      // useFocusTrap's activate() is driven by a watcher on isOpen (matching
      // EditCoachModal's pattern), so mount closed and toggle open to
      // exercise it, rather than mounting already-open.
      wrapper = mountModal(EventEditModal, { ...props, isOpen: false });
      await wrapper.setProps({ isOpen: true });
      await nextTick();
      const dialog = wrapper.find('[role="dialog"]').element;
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it("has no axe violations when open", async () => {
      wrapper = mountModal(EventEditModal, props);
      expect(await axe(document.body, AXE_OPTIONS)).toHaveNoViolations();
    });

    it("does not use the dead bg-opacity-50 class", () => {
      wrapper = mountModal(EventEditModal, props);
      expect(wrapper.html()).not.toContain("bg-opacity-50");
    });
  });

  describe("EventQuickLogModal", () => {
    const props = {
      isOpen: true,
      eventName: "Regional Camp",
      data: {
        type: "in_person_visit",
        direction: "inbound" as const,
        content: "",
        sentiment: "neutral",
      },
    };

    it("exposes dialog semantics", () => {
      wrapper = mountModal(EventQuickLogModal, props);
      expectDialogSemantics("Log Interactions");
    });

    it("closes on Escape", async () => {
      wrapper = mountModal(EventQuickLogModal, props);
      await expectEscapeCloses("close");
    });

    it("moves focus into the dialog on open (focus trap engaged)", async () => {
      wrapper = mountModal(EventQuickLogModal, { ...props, isOpen: false });
      await wrapper.setProps({ isOpen: true });
      await nextTick();
      const dialog = wrapper.find('[role="dialog"]').element;
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Note: EventQuickLogModal has pre-existing unlabeled <select> elements
    // (select-name axe rule) unrelated to the dialog-semantics fix in this
    // finding (role/aria-modal/focus-trap/Escape) — out of scope here, so
    // this suite doesn't assert full axe-clean output for this component.

    it("does not use the dead bg-opacity-50 class", () => {
      wrapper = mountModal(EventQuickLogModal, props);
      expect(wrapper.html()).not.toContain("bg-opacity-50");
    });
  });
});
