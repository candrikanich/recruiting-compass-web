import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useFormErrorFocus } from "~/composables/useFormErrorFocus";
import { nextTick } from "vue";

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    nextTick: vi.fn().mockResolvedValue(undefined),
  };
});

describe("useFormErrorFocus", () => {
  let mockElement: {
    focus: ReturnType<typeof vi.fn>;
    scrollIntoView: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockElement = {
      focus: vi.fn(),
      scrollIntoView: vi.fn(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("focuses the error summary element", async () => {
    vi.spyOn(document, "getElementById").mockReturnValue(
      mockElement as unknown as HTMLElement,
    );

    const { focusErrorSummary } = useFormErrorFocus();
    const result = await focusErrorSummary();

    expect(nextTick).toHaveBeenCalled();
    expect(document.getElementById).toHaveBeenCalledWith("form-error-summary");
    expect(mockElement.focus).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
    expect(result).toBe(true);
  });

  it("returns false when element is not found", async () => {
    vi.spyOn(document, "getElementById").mockReturnValue(null);

    const { focusErrorSummary } = useFormErrorFocus();
    const result = await focusErrorSummary();

    expect(result).toBe(false);
    expect(mockElement.focus).not.toHaveBeenCalled();
  });

  it("uses custom element ID when provided", async () => {
    vi.spyOn(document, "getElementById").mockReturnValue(
      mockElement as unknown as HTMLElement,
    );

    const { focusErrorSummary } = useFormErrorFocus({
      elementId: "custom-error",
    });
    await focusErrorSummary();

    expect(document.getElementById).toHaveBeenCalledWith("custom-error");
  });

  it("skips scrollIntoView when shouldScroll is false", async () => {
    vi.spyOn(document, "getElementById").mockReturnValue(
      mockElement as unknown as HTMLElement,
    );

    const { focusErrorSummary } = useFormErrorFocus({ shouldScroll: false });
    await focusErrorSummary();

    expect(mockElement.focus).toHaveBeenCalled();
    expect(mockElement.scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls by default", async () => {
    vi.spyOn(document, "getElementById").mockReturnValue(
      mockElement as unknown as HTMLElement,
    );

    const { focusErrorSummary } = useFormErrorFocus();
    await focusErrorSummary();

    expect(mockElement.scrollIntoView).toHaveBeenCalled();
  });
});
