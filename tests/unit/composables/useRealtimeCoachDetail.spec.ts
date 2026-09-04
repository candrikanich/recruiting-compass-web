import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useRealtimeCoachDetail } from "~/composables/useRealtimeCoachDetail";

// Capture .on() registrations so we can invoke callbacks in tests.
type PostgresCallback = (payload: { new: Record<string, unknown> }) => void;
interface OnCall {
  filter: { event: string; table: string; filter?: string };
  callback: PostgresCallback;
}

const onCalls: OnCall[] = [];
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();

const mockChannel = {
  on: vi.fn((_type: string, filter: Record<string, string>, cb: PostgresCallback) => {
    onCalls.push({ filter, callback: cb });
    return mockChannel;
  }),
  subscribe: mockSubscribe,
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

// onUnmounted is a no-op outside a component — stub it so the composable loads.
const unmountCallbacks: (() => void)[] = [];
vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onUnmounted: (cb: () => void) => unmountCallbacks.push(cb),
  };
});

describe("useRealtimeCoachDetail", () => {
  const onInteractionChange = vi.fn();
  const onCoachChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onCalls.length = 0;
    unmountCallbacks.length = 0;
    mockChannel.on.mockClear();
    mockChannel.on.mockImplementation((_type, filter, cb) => {
      onCalls.push({ filter, callback: cb });
      return mockChannel;
    });
  });

  it("subscribes to interactions and coaches when schoolId is set", () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    // 3 interaction events (INSERT/UPDATE/DELETE) + 1 coach UPDATE = 4 .on() calls
    expect(mockChannel.on).toHaveBeenCalledTimes(4);
    expect(mockSubscribe).toHaveBeenCalled();

    const tables = onCalls.map((c) => `${c.filter.table}:${c.filter.event}`);
    expect(tables).toContain("interactions:INSERT");
    expect(tables).toContain("interactions:UPDATE");
    expect(tables).toContain("interactions:DELETE");
    expect(tables).toContain("coaches:UPDATE");
  });

  it("does not subscribe when schoolId is null", () => {
    const schoolId = ref<string | null>(null);

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    expect(mockChannel.on).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("re-subscribes when schoolId changes", async () => {
    const schoolId = ref<string | null>(null);

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    expect(mockSubscribe).not.toHaveBeenCalled();

    schoolId.value = "school-xyz";
    await nextTick();

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledTimes(4);
  });

  it("calls onInteractionChange when interaction INSERT fires", () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    const insertCall = onCalls.find(
      (c) => c.filter.table === "interactions" && c.filter.event === "INSERT",
    );
    insertCall!.callback({ new: { id: "int-1" } });

    expect(onInteractionChange).toHaveBeenCalledTimes(1);
    expect(onCoachChange).not.toHaveBeenCalled();
  });

  it("calls onCoachChange when coach UPDATE fires", () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    const coachCall = onCalls.find(
      (c) => c.filter.table === "coaches" && c.filter.event === "UPDATE",
    );
    coachCall!.callback({ new: { id: "coach-123" } });

    expect(onCoachChange).toHaveBeenCalledTimes(1);
    expect(onInteractionChange).not.toHaveBeenCalled();
  });

  it("filters interactions by school_id", () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    const interactionCalls = onCalls.filter(
      (c) => c.filter.table === "interactions",
    );
    for (const call of interactionCalls) {
      expect(call.filter.filter).toBe("school_id=eq.school-abc");
    }
  });

  it("filters coach updates by coachId", () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    const coachCall = onCalls.find((c) => c.filter.table === "coaches");
    expect(coachCall!.filter.filter).toBe("id=eq.coach-123");
  });

  it("removes channel on unmount", () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    expect(mockRemoveChannel).not.toHaveBeenCalled();

    // Simulate unmount
    unmountCallbacks.forEach((cb) => cb());

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("removes old channel before re-subscribing", async () => {
    const schoolId = ref<string | null>("school-abc");

    useRealtimeCoachDetail({
      coachId: "coach-123",
      schoolId,
      onInteractionChange,
      onCoachChange,
    });

    // Initial subscribe created a channel
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    // Change school → should remove old channel then create new
    schoolId.value = "school-new";
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
