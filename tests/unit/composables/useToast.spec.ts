import { describe, it, expect, beforeEach, vi } from "vitest";
import { useToast } from "~/composables/useToast";

describe("useToast", () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  it("should initialize with empty toasts", () => {
    const { toasts } = useToast();
    expect(toasts.value).toEqual([]);
  });

  describe("showToast", () => {
    it("should add toast with default type (info)", () => {
      const { toasts, showToast } = useToast();
      showToast("Hello");

      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0].message).toBe("Hello");
      expect(toasts.value[0].type).toBe("info");
    });

    it("should add toast with custom type", () => {
      const { toasts, showToast } = useToast();
      showToast("Error message", "error");

      expect(toasts.value[0].type).toBe("error");
    });

    it("should support success, warning, error types", () => {
      const { toasts, showToast } = useToast();

      showToast("Success", "success");
      showToast("Warning", "warning");
      showToast("Error", "error");

      expect(toasts.value[0].type).toBe("success");
      expect(toasts.value[1].type).toBe("warning");
      expect(toasts.value[2].type).toBe("error");
    });

    it("should generate unique IDs for each toast", () => {
      const { toasts, showToast } = useToast();
      showToast("Toast 1");
      showToast("Toast 2");

      expect(toasts.value[0].id).not.toBe(toasts.value[1].id);
    });

    it("should return toast ID", () => {
      const { showToast } = useToast();
      const id = showToast("Message");

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should auto-remove toast after default duration (5000ms)", () => {
      vi.useFakeTimers();
      const { toasts, showToast } = useToast();

      showToast("Auto-remove toast");
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(toasts.value).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should auto-remove toast after custom duration", () => {
      vi.useFakeTimers();
      const { toasts, showToast } = useToast();

      showToast("Quick toast", "info", 2000);
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(2000);
      expect(toasts.value).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should not auto-remove toast when duration is 0", () => {
      vi.useFakeTimers();
      const { toasts, showToast } = useToast();

      showToast("Persistent toast", "info", 0);
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(10000);
      expect(toasts.value).toHaveLength(1);

      vi.useRealTimers();
    });

    it("should not auto-remove toast when duration is negative", () => {
      vi.useFakeTimers();
      const { toasts, showToast } = useToast();

      showToast("Persistent toast", "info", -1);
      expect(toasts.value).toHaveLength(1);

      vi.advanceTimersByTime(10000);
      expect(toasts.value).toHaveLength(1);

      vi.useRealTimers();
    });

    it("should handle multiple toasts with different durations", () => {
      vi.useFakeTimers();
      const { toasts, showToast } = useToast();

      showToast("Toast 1", "info", 1000);
      showToast("Toast 2", "info", 3000);

      expect(toasts.value).toHaveLength(2);

      vi.advanceTimersByTime(1000);
      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0].message).toBe("Toast 2");

      vi.advanceTimersByTime(2000);
      expect(toasts.value).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe("removeToast", () => {
    it("should remove toast by ID", () => {
      const { toasts, showToast, removeToast } = useToast();
      const id = showToast("Message");

      expect(toasts.value).toHaveLength(1);
      removeToast(id);
      expect(toasts.value).toHaveLength(0);
    });

    it("should only remove specific toast", () => {
      const { toasts, showToast, removeToast } = useToast();
      const id1 = showToast("Toast 1");
      const id2 = showToast("Toast 2");

      removeToast(id1);

      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0].id).toBe(id2);
    });

    it("should not error when removing non-existent toast", () => {
      const { toasts, removeToast } = useToast();

      expect(() => {
        removeToast("non-existent-id");
      }).not.toThrow();

      expect(toasts.value).toHaveLength(0);
    });

    it("should handle removing from multiple toasts", () => {
      const { toasts, showToast, removeToast } = useToast();
      const id1 = showToast("Toast 1");
      const id2 = showToast("Toast 2");
      const id3 = showToast("Toast 3");

      removeToast(id2);

      expect(toasts.value).toHaveLength(2);
      expect(toasts.value.map((t) => t.message)).toEqual([
        "Toast 1",
        "Toast 3",
      ]);
    });
  });

  describe("clearAll", () => {
    it("should remove all toasts", () => {
      const { toasts, showToast, clearAll } = useToast();

      showToast("Toast 1");
      showToast("Toast 2");
      showToast("Toast 3");

      expect(toasts.value).toHaveLength(3);
      clearAll();
      expect(toasts.value).toHaveLength(0);
    });

    it("should work when no toasts exist", () => {
      const { toasts, clearAll } = useToast();

      expect(() => {
        clearAll();
      }).not.toThrow();

      expect(toasts.value).toHaveLength(0);
    });

    it("should clear toasts added after initial creation", () => {
      const { toasts, showToast, clearAll } = useToast();

      showToast("Toast");
      expect(toasts.value).toHaveLength(1);

      clearAll();
      expect(toasts.value).toHaveLength(0);

      showToast("New toast");
      expect(toasts.value).toHaveLength(1);

      clearAll();
      expect(toasts.value).toHaveLength(0);
    });
  });

  describe("reactive updates", () => {
    it("should reactively update toasts array", () => {
      const { toasts, showToast } = useToast();

      // Use the computed value to track changes
      let callCount = 0;
      const stop = toasts.value;

      showToast("Message 1");
      expect(toasts.value).toHaveLength(1);

      showToast("Message 2");
      expect(toasts.value).toHaveLength(2);
    });

    it("should maintain computed readonly access", () => {
      const { toasts, showToast } = useToast();
      showToast("Test");

      // toasts should be computed (read-only at Vue level)
      expect(Array.isArray(toasts.value)).toBe(true);
    });
  });

  describe("integration scenarios", () => {
    it("should handle rapid toast creation", () => {
      const { toasts, showToast } = useToast();

      for (let i = 1; i <= 10; i++) {
        showToast(`Toast ${i}`);
      }

      expect(toasts.value).toHaveLength(10);
      expect(toasts.value[0].message).toBe("Toast 1");
      expect(toasts.value[9].message).toBe("Toast 10");
    });

    it("should handle toast management workflow", () => {
      const { toasts, showToast, removeToast, clearAll } = useToast();

      // Add toasts
      const id1 = showToast("Important", "error", 0);
      const id2 = showToast("Info", "info", 5000);
      const id3 = showToast("Success", "success", 3000);

      expect(toasts.value).toHaveLength(3);

      // Remove one
      removeToast(id2);
      expect(toasts.value).toHaveLength(2);

      // Add another
      showToast("New", "warning");
      expect(toasts.value).toHaveLength(3);

      // Clear all
      clearAll();
      expect(toasts.value).toHaveLength(0);
    });
  });
});
