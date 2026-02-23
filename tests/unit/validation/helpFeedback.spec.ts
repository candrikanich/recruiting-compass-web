import { describe, it, expect } from "vitest";
import { helpFeedbackSchema } from "~/utils/validation/schemas";

describe("helpFeedbackSchema", () => {
  it("accepts valid thumbs up payload", () => {
    const result = helpFeedbackSchema.safeParse({ page: "/help/schools", helpful: true });
    expect(result.success).toBe(true);
  });

  it("accepts valid thumbs down payload", () => {
    const result = helpFeedbackSchema.safeParse({ page: "/help/phases", helpful: false });
    expect(result.success).toBe(true);
  });

  it("rejects page that does not start with /", () => {
    const result = helpFeedbackSchema.safeParse({ page: "help/schools", helpful: true });
    expect(result.success).toBe(false);
  });

  it("rejects empty page string", () => {
    const result = helpFeedbackSchema.safeParse({ page: "", helpful: true });
    expect(result.success).toBe(false);
  });

  it("rejects page longer than 200 characters", () => {
    const result = helpFeedbackSchema.safeParse({ page: "/" + "a".repeat(200), helpful: true });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean helpful", () => {
    const result = helpFeedbackSchema.safeParse({ page: "/help/schools", helpful: "yes" });
    expect(result.success).toBe(false);
  });

  it("rejects missing helpful field", () => {
    const result = helpFeedbackSchema.safeParse({ page: "/help/schools" });
    expect(result.success).toBe(false);
  });

  it("rejects missing page field", () => {
    const result = helpFeedbackSchema.safeParse({ helpful: true });
    expect(result.success).toBe(false);
  });
});
