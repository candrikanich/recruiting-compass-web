import { describe, it, expect } from "vitest";
import { buildSocialLinks } from "~/utils/profile/socialLinks";

describe("buildSocialLinks", () => {
  it("returns only present platforms with correctly derived urls", () => {
    const links = buildSocialLinks({
      twitter_handle: "@owenA",
      instagram_handle: "owen.a",
      tiktok_handle: "@owenAtok",
      facebook_url: "https://facebook.com/owenA",
    });

    expect(links).toEqual([
      {
        platform: "twitter",
        handle: "@owenA",
        url: "https://x.com/owenA",
        icon: "i-heroicons-at-symbol",
      },
      {
        platform: "instagram",
        handle: "@owen.a",
        url: "https://instagram.com/owen.a",
        icon: "i-heroicons-camera",
      },
      {
        platform: "tiktok",
        handle: "@owenAtok",
        url: "https://tiktok.com/@owenAtok",
        icon: "i-heroicons-musical-note",
      },
    ]);
  });

  it("skips platforms with a null or empty handle", () => {
    const links = buildSocialLinks({
      twitter_handle: undefined,
      instagram_handle: "",
      tiktok_handle: "tok",
    });

    expect(links).toEqual([
      {
        platform: "tiktok",
        handle: "@tok",
        url: "https://tiktok.com/@tok",
        icon: "i-heroicons-musical-note",
      },
    ]);
  });

  it("keeps the @ for display but strips it for the url", () => {
    const links = buildSocialLinks({ twitter_handle: "@handle" });
    expect(links[0].handle).toBe("@handle");
    expect(links[0].url).toBe("https://x.com/handle");
  });

  it("returns an empty array for null input", () => {
    expect(buildSocialLinks(null)).toEqual([]);
  });

  it("returns an empty array when no handles are present", () => {
    expect(buildSocialLinks({})).toEqual([]);
  });
});
