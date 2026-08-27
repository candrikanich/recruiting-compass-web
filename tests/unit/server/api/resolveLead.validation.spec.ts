import { describe, it, expect } from "vitest";
import { resolveBodySchema } from "~/server/api/player/profile/contacts/[id]/resolve.post";

describe("resolveBodySchema", () => {
  it("requires interactionId when status is resolved", () => {
    expect(resolveBodySchema.safeParse({ status: "resolved" }).success).toBe(false);
    expect(
      resolveBodySchema.safeParse({
        status: "resolved",
        interactionId: "00000000-0000-0000-0000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("allows dismissed without an interactionId", () => {
    expect(resolveBodySchema.safeParse({ status: "dismissed" }).success).toBe(true);
  });

  it("rejects unknown status", () => {
    expect(resolveBodySchema.safeParse({ status: "open" }).success).toBe(false);
  });
});
