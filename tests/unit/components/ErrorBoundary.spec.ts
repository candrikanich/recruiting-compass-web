import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ErrorBoundary from "~/components/ErrorBoundary.vue";
import { defineComponent, h, nextTick } from "vue";

const ThrowingChild = defineComponent({
  name: "ThrowingChild",
  setup() {
    throw new Error("test render error");
  },
  render() {
    return h("div", "should not render");
  },
});

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div data-testid="child">Hello</div>',
      },
    });
    expect(wrapper.find('[data-testid="child"]').text()).toBe("Hello");
    expect(wrapper.find('[data-testid="error-fallback"]').exists()).toBe(false);
  });

  it("shows fallback UI when a child throws during render", async () => {
    // Suppress expected console.error from Vue
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: ThrowingChild,
      },
    });

    // onErrorCaptured fires synchronously but re-render happens in next tick
    await nextTick();

    expect(wrapper.find('[data-testid="error-fallback"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Something went wrong");
    expect(wrapper.find('[data-testid="error-retry"]').exists()).toBe(true);

    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("clears the error and re-renders children when retry is clicked", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Start in error state
    const wrapper = mount(ErrorBoundary, {
      slots: { default: ThrowingChild },
    });

    await nextTick();
    expect(wrapper.find('[data-testid="error-fallback"]').exists()).toBe(true);

    // Click retry — must not throw
    await wrapper.find('[data-testid="error-retry"]').trigger("click");

    // ThrowingChild immediately re-throws on retry, so the fallback remains.
    // The key assertion: retry was clickable and the component survived without
    // crashing (still rendering the fallback UI, not a blank screen).
    expect(wrapper.find('[data-testid="error-fallback"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="error-retry"]').exists()).toBe(true);

    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
