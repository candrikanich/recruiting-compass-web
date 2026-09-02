import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  selectDeadlineEmails,
  fetchDeadlineItems,
  DEADLINE_EMAIL_MILESTONES,
  type DeadlineItem,
} from "~/server/utils/notificationDelivery";

const now = new Date("2026-08-16T12:00:00.000Z");

function daysOut(n: number): string {
  // A deadline n whole days after `now` — Math.ceil yields exactly n.
  return new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
}

const base: Omit<DeadlineItem, "deadlineDate"> = {
  entityId: "e-1",
  entityType: "offer",
  label: "Offer from State U",
};

describe("selectDeadlineEmails", () => {
  it("selects deadlines sitting exactly on a milestone", () => {
    const items: DeadlineItem[] = DEADLINE_EMAIL_MILESTONES.map((m, i) => ({
      ...base,
      entityId: `e-${i}`,
      deadlineDate: daysOut(m),
    }));
    const result = selectDeadlineEmails(items, now);
    expect(result.map((r) => r.daysUntil).sort((a, b) => a - b)).toEqual([
      1, 3, 7, 14,
    ]);
  });

  it("ignores deadlines between milestones (no daily spam)", () => {
    const items: DeadlineItem[] = [10, 5, 2].map((m, i) => ({
      ...base,
      entityId: `e-${i}`,
      deadlineDate: daysOut(m),
    }));
    expect(selectDeadlineEmails(items, now)).toHaveLength(0);
  });

  it("ignores past-due deadlines", () => {
    const items: DeadlineItem[] = [{ ...base, deadlineDate: daysOut(-3) }];
    expect(selectDeadlineEmails(items, now)).toHaveLength(0);
  });

  it("carries entity metadata through for idempotency keys", () => {
    const items: DeadlineItem[] = [
      {
        entityId: "off-9",
        entityType: "offer",
        label: "Offer from State U",
        deadlineDate: daysOut(7),
      },
    ];
    const [row] = selectDeadlineEmails(items, now);
    expect(row).toMatchObject({
      entityId: "off-9",
      entityType: "offer",
      daysUntil: 7,
    });
  });

  it("selects user_deadline items at milestone days", () => {
    const items: DeadlineItem[] = [
      {
        entityId: "ud1",
        entityType: "user_deadline",
        label: "Stanford App",
        deadlineDate: "2026-10-16", // 14 days from "now"
      },
    ];
    const result = selectDeadlineEmails(items, new Date("2026-10-02"));
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(14);
  });
});

describe("fetchDeadlineItems with user_deadlines", () => {
  function buildChain(data: unknown[] | null) {
    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;
    chain.select = vi.fn(passthrough);
    chain.eq = vi.fn(passthrough);
    chain.in = vi.fn(passthrough);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data, error: null });
    return chain;
  }

  it("includes user_deadlines in the returned items", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "offers") return buildChain([]);
      if (table === "recommendation_letters") return buildChain([]);
      if (table === "user_deadlines")
        return buildChain([
          {
            id: "ud-1",
            label: "Stanford App",
            deadline_date: "2026-10-16",
          },
        ]);
      return buildChain([]);
    });
    const supabase = { from: fromMock } as unknown as SupabaseClient;

    const items = await fetchDeadlineItems("u-1", supabase);

    expect(items).toContainEqual({
      entityId: "ud-1",
      entityType: "user_deadline",
      label: "Stanford App",
      deadlineDate: "2026-10-16",
    });
  });
});
