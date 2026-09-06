import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useRealtimeInteractionsList } from "~/composables/useRealtimeInteractionsList";

type PostgresCallback = (payload: { new: Record<string, unknown> }) => void;
interface OnCall {
  filter: { event: string; table: string; filter?: string };
  callback: PostgresCallback;
}

const onCalls: OnCall[] = [];
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();

const mockChannel = {
  on: vi.fn(
    (_type: string, filter: Record<string, string>, cb: PostgresCallback) => {
      onCalls.push({ filter, callback: cb });
      return mockChannel;
    },
  ),
  subscribe: mockSubscribe,
};

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: () => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

const unmountCallbacks: (() => void)[] = [];
vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onUnmounted: (cb: () => void) => unmountCallbacks.push(cb),
  };
});

describe("useRealtimeInteractionsList", () => {
  const onInteractionChange = vi.fn();

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

  it("subscribes to interactions when familyUnitId is set", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });

    // INSERT + UPDATE + DELETE = 3 .on() calls
    expect(mockChannel.on).toHaveBeenCalledTimes(3);
    expect(mockSubscribe).toHaveBeenCalled();

    const events = onCalls.map((c) => c.filter.event);
    expect(events).toContain("INSERT");
    expect(events).toContain("UPDATE");
    expect(events).toContain("DELETE");
  });

  it("does not subscribe when familyUnitId is null", () => {
    const familyUnitId = ref<string | null>(null);

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });

    expect(mockChannel.on).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("re-subscribes when familyUnitId changes", async () => {
    const familyUnitId = ref<string | null>(null);

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });
    expect(mockSubscribe).not.toHaveBeenCalled();

    familyUnitId.value = "family-xyz";
    await nextTick();

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledTimes(3);
  });

  it("calls onInteractionChange when INSERT fires", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });

    const insertCall = onCalls.find((c) => c.filter.event === "INSERT");
    insertCall!.callback({ new: { id: "int-1" } });

    expect(onInteractionChange).toHaveBeenCalledTimes(1);
  });

  it("calls onInteractionChange when UPDATE fires", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });

    const updateCall = onCalls.find((c) => c.filter.event === "UPDATE");
    updateCall!.callback({ new: { id: "int-1" } });

    expect(onInteractionChange).toHaveBeenCalledTimes(1);
  });

  it("calls onInteractionChange when DELETE fires", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });

    const deleteCall = onCalls.find((c) => c.filter.event === "DELETE");
    deleteCall!.callback({ new: { id: "int-1" } });

    expect(onInteractionChange).toHaveBeenCalledTimes(1);
  });

  it("filters by family_unit_id", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });

    for (const call of onCalls) {
      expect(call.filter.filter).toBe("family_unit_id=eq.family-abc");
    }
  });

  it("removes channel on unmount", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    unmountCallbacks.forEach((cb) => cb());
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("removes old channel before re-subscribing", async () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    familyUnitId.value = "family-new";
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when familyUnitId becomes null", async () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeInteractionsList(familyUnitId, { onInteractionChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    familyUnitId.value = null;
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
