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
    expect(parseForwardedEmail("Just a plain note, no forward here.")).toBeNull();
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

  it("parses a mobile Gmail forward (Forwarded message banner)", () => {
    const body = `---------- Forwarded message ---------\nFrom: Coach Smith <smith@osu.edu>\nDate: Mon, Sep 2, 2026 at 3:15 PM\nSubject: Camp invite\nTo: Player <player@example.com>\n\nThanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });

  it("parses a mobile Outlook forward (Forwarded message banner, different field order)", () => {
    const body = `Sent from my iPhone\n\n---------- Forwarded message ----------\nFrom: Coach Smith <smith@osu.edu>\nTo: player@example.com\nDate: Mon, Sep 2, 2026, 3:15 PM\nSubject: Camp invite\n\nThanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026, 3:15 PM",
    });
  });

  it("recovers an 'On ... wrote:' line hard-wrapped across two lines", () => {
    const body = `Hey, saw this — let's talk soon.\n\nOn Mon, Sep 2, 2026 at 3:15\nPM Coach Smith <smith@osu.edu> wrote:\n> Thanks for reaching out.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });

  it("does not merge a hard-wrapped line into a quoted reply below it", () => {
    const body = `On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu>\nwrote:\n> Thanks for reaching out.\n> Talk soon.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "Mon, Sep 2, 2026 at 3:15 PM",
    });
  });

  it("parses a Spanish-language forward (escribió:)", () => {
    const body = `El vie, 2 sept 2026 a las 15:15, Coach Smith <smith@osu.edu> escribió:\n> Gracias por contactarnos.`;
    const result = parseForwardedEmail(body);
    expect(result).toEqual({
      senderName: "Coach Smith",
      senderEmail: "smith@osu.edu",
      originalDate: "vie, 2 sept 2026 a las 15:15,",
    });
  });
});
