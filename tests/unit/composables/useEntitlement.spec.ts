import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, computed, nextTick } from "vue";

const captured: { table?: string; eqArgs?: unknown[]; row?: unknown } = {};
const activeFamilyId = ref<string | null>("fam-1");

vi.mock("~/composables/useSupabase", () => ({
  useSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      captured.table = table;
      return {
        select: vi.fn(() => ({
          eq: vi.fn((...args: unknown[]) => {
            captured.eqArgs = args;
            return {
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: captured.row ?? null, error: null }),
              ),
            };
          }),
        })),
      };
    }),
  })),
}));

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    activeFamilyId: computed(() => activeFamilyId.value),
  })),
}));

import {
  canWriteFrom,
  planLabelFrom,
  trialDaysLeftFrom,
  useEntitlement,
  type FamilySubscription,
} from "~/composables/useEntitlement";

const NOW = new Date("2026-09-03T12:00:00Z");
const sub = (over: Partial<FamilySubscription>): FamilySubscription => ({
  familyUnitId: "fam-1",
  status: "founding",
  source: "founding",
  trialEndsAt: null,
  currentPeriodEnd: null,
  ...over,
});

describe("canWriteFrom", () => {
  it("null row → false", () => expect(canWriteFrom(null, NOW)).toBe(false));
  it("founding/active/comp → true", () => {
    for (const status of ["founding", "active", "comp"] as const) {
      expect(canWriteFrom(sub({ status }), NOW)).toBe(true);
    }
  });
  it("read_only → false", () =>
    expect(canWriteFrom(sub({ status: "read_only" }), NOW)).toBe(false));
  it("trialing before end → true, after end → false", () => {
    expect(
      canWriteFrom(sub({ status: "trialing", trialEndsAt: "2026-09-10T00:00:00Z" }), NOW),
    ).toBe(true);
    expect(
      canWriteFrom(sub({ status: "trialing", trialEndsAt: "2026-09-01T00:00:00Z" }), NOW),
    ).toBe(false);
    expect(canWriteFrom(sub({ status: "trialing", trialEndsAt: null }), NOW)).toBe(false);
  });
});

describe("trialDaysLeftFrom", () => {
  it("non-trial → null", () => expect(trialDaysLeftFrom(sub({}), NOW)).toBeNull());
  it("rounds up remaining days, floors at 0", () => {
    expect(
      trialDaysLeftFrom(sub({ status: "trialing", trialEndsAt: "2026-09-10T00:00:00Z" }), NOW),
    ).toBe(7);
    expect(
      trialDaysLeftFrom(sub({ status: "trialing", trialEndsAt: "2026-09-01T00:00:00Z" }), NOW),
    ).toBe(0);
  });
});

describe("planLabelFrom", () => {
  it.each([
    [sub({}), "Founding Family — free for life"],
    [sub({ status: "comp" }), "Complimentary access"],
    [sub({ status: "read_only" }), "Read-only — subscription needed"],
    [
      sub({ status: "trialing", trialEndsAt: "2026-09-10T00:00:00Z" }),
      "Free trial — 7 days left",
    ],
    [
      sub({ status: "active", currentPeriodEnd: "2027-09-03T00:00:00Z" }),
      "Active — renews Sep 3, 2027",
    ],
    [null, "Plan unavailable"],
  ])("labels %#", (row, expected) => {
    expect(planLabelFrom(row as FamilySubscription | null, NOW)).toBe(expected);
  });
});

describe("useEntitlement", () => {
  beforeEach(() => {
    captured.row = undefined;
    activeFamilyId.value = "fam-1";
  });

  it("loads the active family's row and maps snake_case", async () => {
    captured.row = {
      family_unit_id: "fam-1",
      status: "founding",
      source: "founding",
      trial_ends_at: null,
      current_period_end: null,
    };
    const ent = useEntitlement();
    await ent.load();
    expect(captured.table).toBe("family_subscriptions");
    expect(captured.eqArgs).toEqual(["family_unit_id", "fam-1"]);
    expect(ent.subscription.value?.status).toBe("founding");
    expect(ent.canWrite.value).toBe(true);
    expect(ent.planLabel.value).toBe("Founding Family — free for life");
  });

  it("no active family → null subscription, canWrite false", async () => {
    activeFamilyId.value = null;
    const ent = useEntitlement();
    await ent.load();
    expect(ent.subscription.value).toBeNull();
    expect(ent.canWrite.value).toBe(false);
  });

  it("reloads when activeFamilyId changes", async () => {
    captured.row = {
      family_unit_id: "fam-1",
      status: "founding",
      source: "founding",
      trial_ends_at: null,
      current_period_end: null,
    };
    const ent = useEntitlement();
    await ent.load();
    activeFamilyId.value = "fam-2";
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    expect(captured.eqArgs).toEqual(["family_unit_id", "fam-2"]);
  });
});
