import type { PerformanceMetric } from "~/types/models";
import { generateId, generateTimestamp } from "./index";

export function createMockMetric(
  overrides: Partial<PerformanceMetric> = {},
): PerformanceMetric {
  return {
    id: generateId("metric"),
    user_id: generateId("user"),
    recorded_date: generateTimestamp(0),
    metric_type: "exit_velo",
    value: 92.5,
    unit: "mph",
    event_id: null,
    notes: null,
    verified: true,
    created_at: generateTimestamp(0),
    updated_at: generateTimestamp(0),
    ...overrides,
  };
}
