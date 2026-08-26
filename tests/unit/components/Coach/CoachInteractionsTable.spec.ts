import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachInteractionsTable from "~/components/Coach/detail/CoachInteractionsTable.vue";
import type { Interaction } from "~/types/models";

const ix = (over: Partial<Interaction> = {}): Interaction => ({
  id: Math.random().toString(),
  type: "phone_call",
  direction: "inbound",
  occurred_at: new Date().toISOString(),
  ...over,
});

const fixture: Interaction[] = [
  ix({ id: "1", type: "email", direction: "outbound", sentiment: "positive" }),
  ix({ id: "2", type: "phone_call", direction: "inbound", sentiment: "neutral" }),
  ix({ id: "3", type: "email", direction: "outbound", sentiment: "negative" }),
  ix({ id: "4", type: "text", direction: "inbound", sentiment: "positive" }),
];

describe("CoachInteractionsTable", () => {
  it("filters to sent-only via the Direction control and updates the Shown count", async () => {
    const w = mount(CoachInteractionsTable, { props: { interactions: fixture } });

    await w.get('input[value="outbound"]').setValue(true);

    // Both "email" outbound rows remain, both inbound rows are gone.
    expect(w.findAll("ul > li").length).toBe(2);
    expect(w.text()).toContain("Shown");
    expect(w.text()).toMatch(/Shown\s*2/);
  });

  it("narrows rows via the Type filter", async () => {
    const w = mount(CoachInteractionsTable, { props: { interactions: fixture } });

    await w.get("select").setValue("text");

    expect(w.findAll("ul > li").length).toBe(1);
  });

  it("narrows rows via the Sentiment filter", async () => {
    const w = mount(CoachInteractionsTable, { props: { interactions: fixture } });

    const selects = w.findAll("select");
    // Type, Date range, Sentiment selects appear in that DOM order.
    await selects[2]!.setValue("positive");

    expect(w.findAll("ul > li").length).toBe(2);
  });

  it("computes correct Sent/Received tallies for the fixture", () => {
    const w = mount(CoachInteractionsTable, { props: { interactions: fixture } });

    expect(w.text()).toMatch(/Sent\s*2/);
    expect(w.text()).toMatch(/Received\s*2/);
  });
});
