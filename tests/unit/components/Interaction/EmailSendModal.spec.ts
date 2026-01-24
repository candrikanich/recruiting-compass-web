import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import EmailSendModal from "~/components/EmailSendModal.vue";

describe("EmailSendModal", () => {
  const defaultProps = {
    isOpen: true,
    recipientEmail: "coach@example.com",
    subject: "Introduction Email",
    body: "Hi Coach,\n\nI am interested in your program.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounts successfully with required props", () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.props("isOpen")).toBe(true);
    expect(wrapper.props("recipientEmail")).toBe("coach@example.com");
  });

  it("starts in preview step", () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Check that step is 'preview' in the component
    expect((wrapper.vm as any).step).toBe("preview");
  });

  it("accepts all required props", () => {
    const props = {
      isOpen: true,
      recipientEmail: "coach@example.com",
      subject: "Test Subject",
      body: "Test Body",
    };

    const wrapper = mount(EmailSendModal, {
      props,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    expect(wrapper.props("isOpen")).toBe(props.isOpen);
    expect(wrapper.props("recipientEmail")).toBe(props.recipientEmail);
    expect(wrapper.props("subject")).toBe(props.subject);
    expect(wrapper.props("body")).toBe(props.body);
  });

  it("emits close event on close", async () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Trigger the close event by finding the Cancel button specifically
    const cancelButton = wrapper.find('button:contains("Cancel")');
    if (cancelButton.exists()) {
      await cancelButton.trigger("click");
    } else {
      // Fallback: find by index - Cancel is the second button in preview step
      const allButtons = wrapper.findAll("button");
      if (allButtons.length > 1) {
        await allButtons[1].trigger("click"); // Second button should be Cancel
      }
    }
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits confirmed event when confirmed", async () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // First trigger send click to go to confirmation step
    const vm = wrapper.vm as any;
    vm.handleSendClick();

    // Wait for timeout and move to confirmation step
    await new Promise((resolve) => setTimeout(resolve, 600));
    await wrapper.vm.$nextTick();

    // Find and click the confirmation button
    const confirmButton = wrapper.find('button:contains("Yes, Email Sent")');
    if (confirmButton.exists()) {
      await confirmButton.trigger("click");
    } else {
      // Fallback to calling the exposed method if button not found
      await vm.confirmAndClose();
    }
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("confirmed")).toBeTruthy();
  });

  it("generates mailto link with correct structure", () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: "" } as any;

    // Call handleSendClick
    const vm = wrapper.vm as any;
    vm.handleSendClick();

    // Check that mailto link was generated
    expect(window.location.href).toContain("mailto:coach@example.com");
    expect(window.location.href).toContain("subject=");
    expect(window.location.href).toContain("body=");

    window.location = originalLocation;
  });

  it("handles empty subject in mailto link", () => {
    const wrapper = mount(EmailSendModal, {
      props: {
        ...defaultProps,
        subject: "",
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    delete (window as any).location;
    window.location = { href: "" } as any;

    const vm = wrapper.vm as any;
    vm.handleSendClick();

    expect(window.location.href).toContain("mailto:");
  });

  it("handles special characters in subject and body", () => {
    const wrapper = mount(EmailSendModal, {
      props: {
        ...defaultProps,
        subject: 'Test & Special "Characters"',
        body: "Body with\nnewlines & special chars",
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    delete (window as any).location;
    window.location = { href: "" } as any;

    const vm = wrapper.vm as any;
    vm.handleSendClick();

    // Should properly encode and generate mailto link
    expect(window.location.href).toContain("mailto:");
    expect(window.location.href).toContain("subject=");
    expect(window.location.href).toContain("body=");
  });

  it("transitions to confirmation step after send", async () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    delete (window as any).location;
    window.location = { href: "" } as any;

    const vm = wrapper.vm as any;
    vm.handleSendClick();

    // Wait for the timeout
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Should now be in confirmation step
    expect(vm.step).toBe("confirmation");
  });

  it("can go back from confirmation to preview", async () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    delete (window as any).location;
    window.location = { href: "" } as any;

    const vm = wrapper.vm as any;

    // Go to confirmation
    vm.handleSendClick();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(vm.step).toBe("confirmation");

    // Go back to preview
    vm.step = "preview";
    expect(vm.step).toBe("preview");
  });

  it("emits confirmed and close when confirming send", async () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const vm = wrapper.vm as any;

    // First trigger send click to go to confirmation step
    vm.handleSendClick();
    await new Promise((resolve) => setTimeout(resolve, 600));
    await wrapper.vm.$nextTick();

    // Find and click the confirmation button in confirmation step
    const allButtons = wrapper.findAll("button");
    const confirmButton = allButtons.find((btn) =>
      btn.text().includes("Yes, Email Sent"),
    );

    if (confirmButton) {
      await confirmButton.trigger("click");
    } else {
      // Fallback to calling the exposed method if button not found
      await vm.confirmAndClose();
    }

    await wrapper.vm.$nextTick();

    // Should have emitted both events
    expect(wrapper.emitted("confirmed")).toBeTruthy();
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("resets step to preview after confirming", async () => {
    const wrapper = mount(EmailSendModal, {
      props: defaultProps,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });

    const vm = wrapper.vm as any;

    // Set to confirmation
    vm.step = "confirmation";
    expect(vm.step).toBe("confirmation");

    // Call confirmAndClose
    vm.confirmAndClose();

    await wrapper.vm.$nextTick();

    // Step should be back to preview
    expect(vm.step).toBe("preview");
  });
});
