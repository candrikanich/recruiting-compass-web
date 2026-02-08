import type { Event } from "~/types/models";
import { generateId, generateTimestamp } from "./index";

export function createMockEvent(overrides: Partial<Event> = {}): Event {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // Default to 7 days from now

  return {
    id: generateId("event"),
    user_id: generateId("user"),
    school_id: null,
    type: "camp",
    name: "Test Camp",
    location: "Stanford, CA",
    address: null,
    city: "Stanford",
    state: "CA",
    start_date: startDate.toISOString(),
    end_date: null,
    start_time: null,
    end_time: null,
    checkin_time: null,
    url: null,
    description: null,
    event_source: null,
    coaches_present: [],
    performance_notes: null,
    stats_recorded: null,
    cost: null,
    registered: false,
    attended: false,
    created_by: generateId("user"),
    updated_by: generateId("user"),
    created_at: generateTimestamp(0),
    updated_at: generateTimestamp(0),
    ...overrides,
  };
}
