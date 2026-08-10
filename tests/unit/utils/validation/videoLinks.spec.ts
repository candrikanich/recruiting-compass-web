import { describe, it, expect } from "vitest";
import { createVideoLinkSchema, updateVideoLinkSchema } from "~/utils/validation/schemas";

describe("video-link schemas", () => {
  it("accepts a valid create payload", () => {
    const r = createVideoLinkSchema.safeParse({ platform: "hudl", url: "https://hudl.com/x", title: "Fall reel", position: 0 });
    expect(r.success).toBe(true);
  });
  it("accepts the 'other' platform for sites we don't enumerate", () => {
    expect(createVideoLinkSchema.safeParse({ platform: "other", url: "https://somevideosite.com/x", position: 0 }).success).toBe(true);
  });
  it("rejects an unknown platform", () => {
    expect(createVideoLinkSchema.safeParse({ platform: "tiktok", url: "https://x", position: 0 }).success).toBe(false);
  });
  it("rejects a non-URL", () => {
    expect(createVideoLinkSchema.safeParse({ platform: "hudl", url: "not-a-url", position: 0 }).success).toBe(false);
  });
  it("rejects title longer than 200 chars", () => {
    const longTitle = "a".repeat(201);
    expect(createVideoLinkSchema.safeParse({ platform: "hudl", url: "https://hudl.com/x", title: longTitle }).success).toBe(false);
  });
  it("rejects position outside 0-4", () => {
    expect(createVideoLinkSchema.safeParse({ platform: "hudl", url: "https://hudl.com/x", position: 5 }).success).toBe(false);
  });
  it("update allows partial fields", () => {
    expect(updateVideoLinkSchema.safeParse({ title: "New" }).success).toBe(true);
  });
  it("rejects empty update payload", () => {
    expect(updateVideoLinkSchema.safeParse({}).success).toBe(false);
  });
});
