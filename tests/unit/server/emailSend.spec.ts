import { describe, it, expect } from "vitest";
import { z } from "zod";

const emailSendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.enum(["weekly-digest", "deadline-alert"]),
  data: z.record(z.string(), z.unknown()),
});

describe("email/send schema", () => {
  it("accepts weekly-digest payload", () => {
    const result = emailSendSchema.safeParse({
      to: "test@example.com",
      subject: "Your weekly recap",
      template: "weekly-digest",
      data: { lines: ["3 interactions logged"], upcomingDeadlines: [] },
    });
    expect(result.success).toBe(true);
  });
  it("accepts deadline-alert payload", () => {
    const result = emailSendSchema.safeParse({
      to: "test@example.com",
      subject: "Deadline in 3 days",
      template: "deadline-alert",
      data: {
        label: "Application Deadline",
        daysUntil: 3,
        deadline_date: "2026-11-01",
      },
    });
    expect(result.success).toBe(true);
  });
  it("rejects unknown template", () => {
    const result = emailSendSchema.safeParse({
      to: "test@example.com",
      subject: "Test",
      template: "banana",
      data: {},
    });
    expect(result.success).toBe(false);
  });
  it("rejects invalid email", () => {
    const result = emailSendSchema.safeParse({
      to: "not-an-email",
      subject: "Test",
      template: "weekly-digest",
      data: {},
    });
    expect(result.success).toBe(false);
  });
  it("rejects empty subject", () => {
    const result = emailSendSchema.safeParse({
      to: "test@example.com",
      subject: "",
      template: "weekly-digest",
      data: {},
    });
    expect(result.success).toBe(false);
  });
});
