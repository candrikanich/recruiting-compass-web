import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useRealtimeDashboard } from "~/composables/useRealtimeDashboard";

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

describe("useRealtimeDashboard", () => {
  const onDashboardChange = vi.fn();

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

  it("subscribes to schools and interactions when familyUnitId is set", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });

    // 3 school events + 3 interaction events = 6 .on() calls
    expect(mockChannel.on).toHaveBeenCalledTimes(6);
    expect(mockSubscribe).toHaveBeenCalled();

    const registrations = onCalls.map(
      (c) => `${c.filter.table}:${c.filter.event}`,
    );
    expect(registrations).toContain("schools:INSERT");
    expect(registrations).toContain("schools:UPDATE");
    expect(registrations).toContain("schools:DELETE");
    expect(registrations).toContain("interactions:INSERT");
    expect(registrations).toContain("interactions:UPDATE");
    expect(registrations).toContain("interactions:DELETE");
  });

  it("does not subscribe when familyUnitId is null", () => {
    const familyUnitId = ref<string | null>(null);

    useRealtimeDashboard(familyUnitId, { onDashboardChange });

    expect(mockChannel.on).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("re-subscribes when familyUnitId changes", async () => {
    const familyUnitId = ref<string | null>(null);

    useRealtimeDashboard(familyUnitId, { onDashboardChange });
    expect(mockSubscribe).not.toHaveBeenCalled();

    familyUnitId.value = "family-xyz";
    await nextTick();

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledTimes(6);
  });

  it("calls onDashboardChange when school INSERT fires", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });

    const call = onCalls.find(
      (c) => c.filter.table === "schools" && c.filter.event === "INSERT",
    );
    call!.callback({ new: { id: "s-1" } });

    expect(onDashboardChange).toHaveBeenCalledTimes(1);
  });

  it("calls onDashboardChange when interaction DELETE fires", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });

    const call = onCalls.find(
      (c) => c.filter.table === "interactions" && c.filter.event === "DELETE",
    );
    call!.callback({ new: { id: "i-1" } });

    expect(onDashboardChange).toHaveBeenCalledTimes(1);
  });

  it("filters all subscriptions by family_unit_id", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });

    for (const call of onCalls) {
      expect(call.filter.filter).toBe("family_unit_id=eq.family-abc");
    }
  });

  it("removes channel on unmount", () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    unmountCallbacks.forEach((cb) => cb());
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("removes old channel before re-subscribing", async () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    familyUnitId.value = "family-new";
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when familyUnitId becomes null", async () => {
    const familyUnitId = ref<string | null>("family-abc");

    useRealtimeDashboard(familyUnitId, { onDashboardChange });

    familyUnitId.value = null;
    await nextTick();

    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
