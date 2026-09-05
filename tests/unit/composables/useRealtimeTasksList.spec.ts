import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useRealtimeTasksList } from "~/composables/useRealtimeTasksList";

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

describe("useRealtimeTasksList", () => {
  const onTaskChange = vi.fn();

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

  it("subscribes to athlete_task when athleteId is set", () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });

    expect(mockChannel.on).toHaveBeenCalledTimes(3);
    expect(mockSubscribe).toHaveBeenCalled();

    const events = onCalls.map((c) => c.filter.event);
    expect(events).toContain("INSERT");
    expect(events).toContain("UPDATE");
    expect(events).toContain("DELETE");

    for (const call of onCalls) {
      expect(call.filter.table).toBe("athlete_task");
    }
  });

  it("does not subscribe when athleteId is null", () => {
    const athleteId = ref<string | null>(null);

    useRealtimeTasksList(athleteId, { onTaskChange });

    expect(mockChannel.on).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("re-subscribes when athleteId changes", async () => {
    const athleteId = ref<string | null>(null);

    useRealtimeTasksList(athleteId, { onTaskChange });
    expect(mockSubscribe).not.toHaveBeenCalled();

    athleteId.value = "athlete-xyz";
    await nextTick();

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledTimes(3);
  });

  it("calls onTaskChange when INSERT fires", () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });

    const call = onCalls.find((c) => c.filter.event === "INSERT");
    call!.callback({ new: { id: "at-1" } });

    expect(onTaskChange).toHaveBeenCalledTimes(1);
  });

  it("calls onTaskChange when UPDATE fires", () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });

    const call = onCalls.find((c) => c.filter.event === "UPDATE");
    call!.callback({ new: { id: "at-1" } });

    expect(onTaskChange).toHaveBeenCalledTimes(1);
  });

  it("filters by athlete_id", () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });

    for (const call of onCalls) {
      expect(call.filter.filter).toBe("athlete_id=eq.athlete-abc");
    }
  });

  it("removes channel on unmount", () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    unmountCallbacks.forEach((cb) => cb());
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("removes old channel before re-subscribing", async () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    athleteId.value = "athlete-new";
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when athleteId becomes null", async () => {
    const athleteId = ref<string | null>("athlete-abc");

    useRealtimeTasksList(athleteId, { onTaskChange });

    athleteId.value = null;
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
