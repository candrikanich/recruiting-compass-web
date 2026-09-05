import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useRealtimeDocumentsList } from "~/composables/useRealtimeDocumentsList";

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

describe("useRealtimeDocumentsList", () => {
  const onDocumentChange = vi.fn();

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

  it("subscribes to documents when familyUnitId is set", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });

    expect(mockChannel.on).toHaveBeenCalledTimes(3);
    expect(mockSubscribe).toHaveBeenCalled();

    const events = onCalls.map((c) => c.filter.event);
    expect(events).toContain("INSERT");
    expect(events).toContain("UPDATE");
    expect(events).toContain("DELETE");

    for (const call of onCalls) {
      expect(call.filter.table).toBe("documents");
    }
  });

  it("does not subscribe when familyUnitId is null", () => {
    const familyUnitId = ref<string | null>(null);

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });

    expect(mockChannel.on).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("re-subscribes when familyUnitId changes", async () => {
    const familyUnitId = ref<string | null>(null);

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });
    expect(mockSubscribe).not.toHaveBeenCalled();

    familyUnitId.value = "family-xyz";
    await nextTick();

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledTimes(3);
  });

  it("calls onDocumentChange when INSERT fires", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });

    const call = onCalls.find((c) => c.filter.event === "INSERT");
    call!.callback({ new: { id: "doc-1" } });

    expect(onDocumentChange).toHaveBeenCalledTimes(1);
  });

  it("filters by family_unit_id", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });

    for (const call of onCalls) {
      expect(call.filter.filter).toBe("family_unit_id=eq.family-abc");
    }
  });

  it("removes channel on unmount", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    unmountCallbacks.forEach((cb) => cb());
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("removes old channel before re-subscribing", async () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });

    familyUnitId.value = "family-new";
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when familyUnitId becomes null", async () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDocumentsList(familyUnitId, { onDocumentChange });

    familyUnitId.value = null;
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
