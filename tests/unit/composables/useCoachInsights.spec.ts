import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useCoachInsights, OVERDUE_DAYS } from "~/composables/useCoachInsights";
import type { Coach, Interaction } from "~/types/models";

const coach = (over: Partial<Coach> = {}): Coach => ({
  id: "c1", role: "head", first_name: "D", last_name: "W", email: null, phone: null,
  twitter_handle: null, instagram_handle: null, notes: null, tags: [], source: null,
  last_contact_date: null, ...over,
});
const ix = (over: Partial<Interaction> = {}): Interaction => ({
  id: Math.random().toString(), type: "phone_call", direction: "inbound", ...over,
});
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

describe("useCoachInsights", () => {
  it("returns null daysSinceContact and no overdue when no last_contact", () => {
    const i = useCoachInsights(ref(coach()), ref([]));
    expect(i.daysSinceContact.value).toBeNull();
    expect(i.isOverdue.value).toBe(false);
  });

  it("flags overdue past the threshold", () => {
    const i = useCoachInsights(ref(coach({ last_contact_date: daysAgo(OVERDUE_DAYS + 1) })), ref([]));
    expect(i.isOverdue.value).toBe(true);
    expect(i.daysSinceContact.value).toBe(OVERDUE_DAYS + 1);
  });

  it("is not overdue exactly at the threshold", () => {
    const i = useCoachInsights(ref(coach({ last_contact_date: daysAgo(OVERDUE_DAYS) })), ref([]));
    expect(i.isOverdue.value).toBe(false);
  });

  it("computes preferred channel as the mode of interaction types", () => {
    const i = useCoachInsights(ref(coach()), ref([ix({ type: "phone_call" }), ix({ type: "phone_call" }), ix({ type: "email" })]));
    expect(i.preferredChannel.value).toBe("phone_call");
  });

  it("computes sent/received and response rate", () => {
    const i = useCoachInsights(ref(coach()), ref([ix({ direction: "outbound" }), ix({ direction: "inbound" })]));
    expect(i.sentReceived.value).toEqual({ sent: 1, received: 1 });
    expect(i.responseRate.value).toBe(50);
    expect(i.totalInteractions.value).toBe(2);
  });

  it("has no channel preference alert with zero interactions", () => {
    const i = useCoachInsights(ref(coach()), ref([]));
    expect(i.channelPreferenceAlert.value).toBe(false);
    expect(i.preferredChannel.value).toBeNull();
  });
});
