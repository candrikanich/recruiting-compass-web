import type { Interaction } from "~/types/models";
import { generateId, generateTimestamp } from "./index";

export function createMockInteraction(
  overrides: Partial<Interaction> = {},
): Interaction {
  return {
    id: generateId("interaction"),
    school_id: generateId("school"),
    coach_id: generateId("coach"),
    event_id: null,
    type: "email",
    direction: "outbound",
    subject: "Introduction",
    content: "Hello coach",
    sentiment: "positive",
    occurred_at: generateTimestamp(0),
    logged_by: generateId("user"),
    attachments: [],
    created_at: generateTimestamp(0),
    updated_at: generateTimestamp(0),
    user_id: generateId("user"),
    ...overrides,
  };
}

export function createMockInteractions(
  count: number,
  overrideFn?: (index: number) => Partial<Interaction>,
): Interaction[] {
  return Array.from({ length: count }, (_, i) =>
    createMockInteraction({
      id: `interaction-${i + 1}`,
      ...(overrideFn?.(i) || {}),
    }),
  );
}
