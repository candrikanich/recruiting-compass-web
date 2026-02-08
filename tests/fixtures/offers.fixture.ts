import type { Offer } from "~/types/models";
import { generateId, generateTimestamp } from "./index";

export function createMockOffer(overrides: Partial<Offer> = {}): Offer {
  const offerDate = new Date();
  offerDate.setDate(offerDate.getDate() - 30); // Default to 30 days ago

  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 30); // Default to 30 days from now

  return {
    id: generateId("offer"),
    user_id: generateId("user"),
    school_id: generateId("school"),
    offer_type: "partial",
    scholarship_amount: 25000,
    scholarship_percentage: 50,
    offer_date: offerDate.toISOString(),
    deadline_date: deadlineDate.toISOString(),
    status: "pending",
    notes: null,
    conditions: null,
    academic_requirements: null,
    athletic_requirements: null,
    created_at: generateTimestamp(0),
    updated_at: generateTimestamp(0),
    ...overrides,
  };
}
