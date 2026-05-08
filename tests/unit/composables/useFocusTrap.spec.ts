import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";

function makeContainer(): HTMLElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}

function addButton(container: HTMLElement, id: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = id;
  // Make visible to offsetParent filter used in getFocusableElements
  Object.defineProperty(btn, "offsetParent", {
    get: () => container,
    configurable: true,
  });
  container.appendChild(btn);
  return btn;
}

describe("useFocusTrap", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = makeContainer();
  });

  afterEach(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it("activate() does not throw with null containerRef", () => {
    const containerRef = ref<HTMLElement | null>(null);
    const { activate } = useFocusTrap(containerRef);
    expect(() => activate()).not.toThrow();
  });

  it("deactivate() can be called without prior activate", () => {
    const containerRef = ref<HTMLElement | null>(container);
    const { deactivate } = useFocusTrap(containerRef);
    expect(() => deactivate()).not.toThrow();
  });

  it("Tab key does not throw when container has no focusable elements", () => {
    const containerRef = ref<HTMLElement | null>(container);
    const { activate } = useFocusTrap(containerRef);
    activate();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    expect(() => document.dispatchEvent(event)).not.toThrow();
  });

  it("non-Tab keys are ignored without error", () => {
    const containerRef = ref<HTMLElement | null>(container);
    addButton(container, "btn1");
    const { activate } = useFocusTrap(containerRef);
    activate();
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    expect(() => document.dispatchEvent(event)).not.toThrow();
  });

  it("activate() focuses the first focusable element", () => {
    addButton(container, "btn1");
    addButton(container, "btn2");
    const containerRef = ref<HTMLElement | null>(container);
    const { activate } = useFocusTrap(containerRef);
    activate();
    expect(document.activeElement?.id).toBe("btn1");
  });
});
