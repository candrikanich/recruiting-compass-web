import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAutoSave } from "~/composables/useAutoSave";

// Mock useToast at module level
vi.mock("~/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it("should initialize with correct default values", () => {
    const mockSave = vi.fn();
    const { isSaving, lastSaveTime, saveError } = useAutoSave({
      onSave: mockSave,
    });

    expect(isSaving.value).toBe(false);
    expect(lastSaveTime.value).toBeNull();
    expect(saveError.value).toBeNull();
  });

  it("should debounce save calls", async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      debounceMs: 500,
    });

    triggerSave();
    triggerSave();
    triggerSave();

    expect(mockSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("should set isSaving state correctly", async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave, isSaving } = useAutoSave({
      onSave: mockSave,
      debounceMs: 0,
    });

    expect(isSaving.value).toBe(false);

    triggerSave();
    vi.advanceTimersByTime(50);
    expect(isSaving.value).toBe(true);

    await vi.runAllTimersAsync();
    expect(isSaving.value).toBe(false);

    vi.useRealTimers();
  });

  it("should update lastSaveTime on successful save", async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave, lastSaveTime } = useAutoSave({
      onSave: mockSave,
      debounceMs: 0,
    });

    expect(lastSaveTime.value).toBeNull();

    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(lastSaveTime.value).not.toBeNull();
    expect(lastSaveTime.value).toBeInstanceOf(Date);

    vi.useRealTimers();
  });

  it("should set saveError on failed save", async () => {
    vi.useFakeTimers();
    const testError = new Error("Save failed");
    const mockSave = vi.fn().mockRejectedValue(testError);
    const { triggerSave, saveError } = useAutoSave({
      onSave: mockSave,
      debounceMs: 0,
    });

    expect(saveError.value).toBeNull();

    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(saveError.value).toEqual(testError);

    vi.useRealTimers();
  });

  it("should call onError callback on save failure", async () => {
    vi.useFakeTimers();
    const mockOnError = vi.fn();
    const testError = new Error("Save failed");
    const mockSave = vi.fn().mockRejectedValue(testError);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      onError: mockOnError,
      debounceMs: 0,
    });

    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(mockOnError).toHaveBeenCalledWith(testError);

    vi.useRealTimers();
  });

  it("should call onSave function", async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      debounceMs: 0,
    });

    triggerSave();
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("should respect debounceMs option", async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { triggerSave } = useAutoSave({
      onSave: mockSave,
      debounceMs: 1000,
    });

    triggerSave();

    // After 500ms, save should not be called yet
    vi.advanceTimersByTime(500);
    expect(mockSave).not.toHaveBeenCalled();

    // After 1000ms, save should be called
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    expect(mockSave).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
