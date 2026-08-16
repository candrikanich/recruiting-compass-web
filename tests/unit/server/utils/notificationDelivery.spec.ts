import { describe, it, expect } from "vitest";
import {
  selectDeadlineEmails,
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
});
