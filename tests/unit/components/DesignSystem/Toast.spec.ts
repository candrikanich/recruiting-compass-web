import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import Toast from "~/components/DesignSystem/Toast.vue";

const mockRemoveToast = vi.fn();
// Must be a real ref, not a plain `{ value: [...] }` object — Vue templates
// only auto-unwrap actual refs. A plain object made v-for iterate the
// object's own key ("value") instead of the array, rendering one bogus
// toast row with every field undefined (the bug this test suite exists to
// catch was hidden behind that same mistake, in the original test's mock).
const mockToasts = ref<Array<{ id: string; message: string; type: string }>>(
  [],
);

// Mock the composable
vi.mock("~/composables/useAppToast", () => ({
  useAppToast: () => ({
    toasts: mockToasts,
    removeToast: mockRemoveToast,
  }),
}));

describe("Toast", () => {
  it("should not crash during SSR when teleport target is unavailable", () => {
    // This simulates SSR environment where body teleport might fail
    // The ClientOnly wrapper prevents SSR rendering of Teleport
    mockToasts.value = [{ id: "1", message: "Test toast", type: "success" }];
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
    mockToasts.value = [{ id: "1", message: "Test toast", type: "success" }];
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

  it.each([
    ["success", "status", "polite"],
    ["error", "alert", "assertive"],
    ["warning", "status", "polite"],
    ["info", "status", "polite"],
  ] as const)(
    "renders %s toast with role=%s and aria-live=%s",
    async (type, expectedRole, expectedAriaLive) => {
      mockToasts.value = [{ id: "1", message: `A ${type} toast`, type }];
      const wrapper = mount(Toast, {
        global: {
          // ClientOnly is intentionally NOT stubbed here — stubbing it (as the
          // previous version of this test did) prevents its default slot from
          // rendering at all, which meant toastClass/getToastIcon/getToastRole/
          // getAriaLive and the toast markup itself were never exercised.
          stubs: { Teleport: true },
        },
      });
      // ClientOnly flips its internal "mounted" ref inside onMounted(), which
      // queues a re-render on the microtask queue rather than rendering the
      // slot synchronously — wait a tick for the real content to appear.
      await nextTick();

      expect(wrapper.text()).toContain(`A ${type} toast`);
      expect(wrapper.find(`[role="${expectedRole}"]`).exists()).toBe(true);
      expect(wrapper.find(`[aria-live="${expectedAriaLive}"]`).exists()).toBe(
        true,
      );
    },
  );

  it("dismisses a toast when the dismiss button is clicked", async () => {
    mockToasts.value = [{ id: "1", message: "Dismiss me", type: "success" }];
    const wrapper = mount(Toast, {
      global: { stubs: { Teleport: true } },
    });
    await nextTick();

    await wrapper.find("button").trigger("click");
    expect(mockRemoveToast).toHaveBeenCalledWith("1");
  });
});
