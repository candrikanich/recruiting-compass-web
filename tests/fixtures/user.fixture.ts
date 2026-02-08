import type { User } from "~/types/models";
import { generateId, generateEmail } from "./index";

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: generateId("user"),
    email: generateEmail(),
    role: "player",
    full_name: "Test User",
    profile_photo_url: null,
    is_admin: false,
    current_phase: "junior",
    status_label: "on_track",
    status_score: 85,
    target_division: "D1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
