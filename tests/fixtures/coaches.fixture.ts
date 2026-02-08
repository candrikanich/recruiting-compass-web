import type { Coach } from "~/types/models";
import { generateId, generateTimestamp } from "./index";

export function createMockCoach(overrides: Partial<Coach> = {}): Coach {
  return {
    id: generateId("coach"),
    school_id: generateId("school"),
    user_id: generateId("user"),
    role: "head",
    first_name: "John",
    last_name: "Smith",
    email: "john.smith@university.edu",
    phone: "555-123-4567",
    twitter_handle: "@coachsmith",
    instagram_handle: "coachsmith",
    notes: "Head coach",
    responsiveness_score: 85,
    last_contact_date: generateTimestamp(7),
    created_at: generateTimestamp(30),
    updated_at: generateTimestamp(0),
    ...overrides,
  };
}

export function createMockCoaches(
  count: number,
  overrideFn?: (index: number) => Partial<Coach>,
): Coach[] {
  return Array.from({ length: count }, (_, i) =>
    createMockCoach({
      id: `coach-${i + 1}`,
      first_name: `Coach`,
      last_name: `${String.fromCharCode(65 + i)}`,
      ...(overrideFn?.(i) || {}),
    }),
  );
}
