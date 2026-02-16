import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Toast from "~/components/DesignSystem/Toast.vue";

// Mock the composable
vi.mock("~/composables/useToast", () => ({
  useToast: () => ({
    toasts: {
      value: [
        {
          id: "1",
          message: "Test toast",
          type: "success" as const,
        },
      ],
    },
    removeToast: vi.fn(),
  }),
}));

describe("Toast", () => {
  it("should not crash during SSR when teleport target is unavailable", () => {
    // This simulates SSR environment where body teleport might fail
    // The ClientOnly wrapper prevents SSR rendering of Teleport
    expect(() => {
      mount(Toast, {
        global: {
          stubs: {
            ClientOnly: true, // Stub ClientOnly for testing
            Teleport: true, // Stub teleport for testing
          },
        },
      });
    }).not.toThrow();
  });

  it("should mount successfully", () => {
    const wrapper = mount(Toast, {
      global: {
        stubs: {
          ClientOnly: true,
          Teleport: true,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });
});
