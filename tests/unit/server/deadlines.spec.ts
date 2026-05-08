import { describe, it, expect } from "vitest";
import { createDeadlineSchema } from "~/utils/validation/schemas";

describe("Deadline API schema", () => {
  it("accepts valid deadline", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Application Deadline",
      deadline_date: "2026-11-01",
      category: "application",
    });
    expect(result.success).toBe(true);
  });
  it("accepts deadline with optional school_id", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Visit deadline",
      deadline_date: "2026-09-15",
      category: "visit",
      school_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid date format", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Test",
      deadline_date: "November 1",
      category: "application",
    });
    expect(result.success).toBe(false);
  });
  it("rejects unknown category", () => {
    const result = createDeadlineSchema.safeParse({
      label: "Test",
      deadline_date: "2026-11-01",
      category: "birthday",
    });
    expect(result.success).toBe(false);
  });
  it("rejects empty label", () => {
    const result = createDeadlineSchema.safeParse({
      label: "",
      deadline_date: "2026-11-01",
      category: "custom",
    });
    expect(result.success).toBe(false);
  });
});
