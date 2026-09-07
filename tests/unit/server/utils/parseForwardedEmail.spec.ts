import { describe, it, expect } from "vitest";
import { parseForwardedEmail } from "~/server/utils/parseForwardedEmail";

describe("parseForwardedEmail", () => {
  it("parses a Gmail-style forward header", () => {
    const body = `Hey, saw this — let's talk soon.\n\nOn Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> Thanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });

  it("parses an Outlook-style forward header", () => {
    const body = `FYI\n\nFrom: Coach Smith <smith@osu.edu>\nSent: Monday, September 2, 2026 3:15 PM\nTo: Player <player@example.com>\nSubject: Re: Camp invite\n\nThanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Monday, September 2, 2026 3:15 PM",
    });
  });

  it("parses an Apple Mail-style forward header", () => {
    const body = `On Sep 2, 2026, at 3:15 PM, Coach Smith <smith@osu.edu> wrote:\n\nThanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Sep 2, 2026, at 3:15 PM",
    });
  });

  it("returns null when no forward marker is present", () => {
    expect(
      parseForwardedEmail("Just a plain note, no forward here."),
    ).toBeNull();
  });

  it("falls back to a bare email address with no display name", () => {
    const body = `On Mon, Sep 2, 2026 at 3:15 PM <smith@osu.edu> wrote:\n> hi`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: null,
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });
});
