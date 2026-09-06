import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useRealtimeSchoolDetail } from "~/composables/useRealtimeSchoolDetail";

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

const unmountCallbacks: (() => void)[] = [];
vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onUnmounted: (cb: () => void) => unmountCallbacks.push(cb),
  };
});

describe("useRealtimeSchoolDetail", () => {
  const onSchoolChange = vi.fn();
  const onCoachesChange = vi.fn();

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

  it("subscribes to schools and coaches when ready", () => {
    const ready = ref(true);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    // 1 school UPDATE + 3 coach events (INSERT/UPDATE/DELETE) = 4
    expect(mockChannel.on).toHaveBeenCalledTimes(4);
    expect(mockSubscribe).toHaveBeenCalled();

    const tables = onCalls.map((c) => `${c.filter.table}:${c.filter.event}`);
    expect(tables).toContain("schools:UPDATE");
    expect(tables).toContain("coaches:INSERT");
    expect(tables).toContain("coaches:UPDATE");
    expect(tables).toContain("coaches:DELETE");
  });

  it("does not subscribe when not ready", () => {
    const ready = ref(false);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    expect(mockChannel.on).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes when ready becomes true", async () => {
    const ready = ref(false);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    expect(mockSubscribe).not.toHaveBeenCalled();

    ready.value = true;
    await nextTick();

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockChannel.on).toHaveBeenCalledTimes(4);
  });

  it("calls onSchoolChange when school UPDATE fires", () => {
    const ready = ref(true);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    const schoolCall = onCalls.find(
      (c) => c.filter.table === "schools" && c.filter.event === "UPDATE",
    );
    schoolCall!.callback({ new: { id: "school-abc" } });

    expect(onSchoolChange).toHaveBeenCalledTimes(1);
    expect(onCoachesChange).not.toHaveBeenCalled();
  });

  it("calls onCoachesChange when coach INSERT fires", () => {
    const ready = ref(true);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    const coachCall = onCalls.find(
      (c) => c.filter.table === "coaches" && c.filter.event === "INSERT",
    );
    coachCall!.callback({ new: { id: "coach-1" } });

    expect(onCoachesChange).toHaveBeenCalledTimes(1);
    expect(onSchoolChange).not.toHaveBeenCalled();
  });

  it("filters schools by schoolId", () => {
    const ready = ref(true);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    const schoolCall = onCalls.find((c) => c.filter.table === "schools");
    expect(schoolCall!.filter.filter).toBe("id=eq.school-abc");
  });

  it("filters coaches by school_id", () => {
    const ready = ref(true);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    const coachCalls = onCalls.filter((c) => c.filter.table === "coaches");
    for (const call of coachCalls) {
      expect(call.filter.filter).toBe("school_id=eq.school-abc");
    }
  });

  it("removes channel on unmount", () => {
    const ready = ref(true);

    useRealtimeSchoolDetail("school-abc", ready, {
      onSchoolChange,
      onCoachesChange,
    });

    expect(mockRemoveChannel).not.toHaveBeenCalled();
    unmountCallbacks.forEach((cb) => cb());
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
