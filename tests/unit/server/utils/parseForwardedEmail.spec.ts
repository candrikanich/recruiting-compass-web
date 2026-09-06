import { describe, it, expect } from "vitest";
import { parseForwardedEmail, parseForwardedThread } from "~/server/utils/parseForwardedEmail";

const SINGLE_MESSAGE_FIXTURES = [
  `Hey, saw this — let's talk soon.\n\nOn Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:\n> Thanks for reaching out.`,
  `FYI\n\nFrom: Coach Smith <smith@osu.edu>\nSent: Monday, September 2, 2026 3:15 PM\nTo: Player <player@example.com>\nSubject: Re: Camp invite\n\nThanks for reaching out.`,
  `On Sep 2, 2026, at 3:15 PM, Coach Smith <smith@osu.edu> wrote:\n\nThanks for reaching out.`,
  `Just a plain note, no forward here.`,
  `On Mon, Sep 2, 2026 at 3:15 PM <smith@osu.edu> wrote:\n> hi`,
  `---------- Forwarded message ---------\nFrom: Coach Smith <smith@osu.edu>\nDate: Mon, Sep 2, 2026 at 3:15 PM\nSubject: Camp invite\nTo: Player <player@example.com>\n\nThanks for reaching out.`,
  `Sent from my iPhone\n\n---------- Forwarded message ----------\nFrom: Coach Smith <smith@osu.edu>\nTo: player@example.com\nDate: Mon, Sep 2, 2026, 3:15 PM\nSubject: Camp invite\n\nThanks for reaching out.`,
  `Hey, saw this — let's talk soon.\n\nOn Mon, Sep 2, 2026 at 3:15\nPM Coach Smith <smith@osu.edu> wrote:\n> Thanks for reaching out.`,
  `On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu>\nwrote:\n> Thanks for reaching out.\n> Talk soon.`,
  `El vie, 2 sept 2026 a las 15:15, Coach Smith <smith@osu.edu> escribió:\n> Gracias por contactarnos.`,
];

describe("parseForwardedThread", () => {
  it("returns exactly one segment matching parseForwardedEmail byte-for-byte, for every single-message fixture (regression)", () => {
    for (const body of SINGLE_MESSAGE_FIXTURES) {
      const segments = parseForwardedThread(body);
      expect(segments).toHaveLength(1);
      expect(segments[0].segmentText).toBe(body);
      expect(segments[0].parsed).toEqual(parseForwardedEmail(body));
    }
  });

  it("splits a bulk-forwarded thread with 3 nested 'On ... wrote:' blocks into 3 segments, oldest last", () => {
    const body = [
      "Hey — take a look at this whole thread.",
      "",
      "On Wed, Sep 3, 2026 at 9:00 AM Coach Alpha <alpha@osu.edu> wrote:",
      "> Following up on the earlier note below.",
      ">",
      "> On Tue, Sep 2, 2026 at 3:15 PM Coach Beta <beta@osu.edu> wrote:",
      "> > Passing this along, see the original ask.",
      "> >",
      "> > On Mon, Sep 1, 2026 at 10:00 AM Coach Gamma <gamma@osu.edu> wrote:",
      "> > > Reaching out about camp registration.",
    ].join("\n");

    const segments = parseForwardedThread(body);

    expect(segments).toHaveLength(3);
    expect(segments[0].parsed).toMatchObject({ senderName: "Coach Alpha", senderEmail: "alpha@osu.edu" });
    expect(segments[1].parsed).toMatchObject({ senderName: "Coach Beta", senderEmail: "beta@osu.edu" });
    expect(segments[2].parsed).toMatchObject({ senderName: "Coach Gamma", senderEmail: "gamma@osu.edu" });

    // Each segment's own text carries only its own marker + quoted content —
    // no bleed-through from an earlier or later message's From:/Date: line.
    expect(segments[0].segmentText).toContain("Coach Alpha");
    expect(segments[0].segmentText).not.toContain("Coach Beta");
    expect(segments[0].segmentText).not.toContain("Coach Gamma");
    expect(segments[1].segmentText).toContain("Coach Beta");
    expect(segments[1].segmentText).not.toContain("Coach Gamma");
    expect(segments[2].segmentText).toContain("Coach Gamma");

    // Concatenating the slices back together reconstructs the original body —
    // no content is dropped or duplicated across segments.
    expect(segments.map((s) => s.segmentText).join("")).toBe(body);
  });

  it("returns a single unparsed segment for a body with no quote markers", () => {
    const body = "Just a plain note, no forward here.";
    expect(parseForwardedThread(body)).toEqual([{ parsed: null, segmentText: body }]);
  });
});

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
