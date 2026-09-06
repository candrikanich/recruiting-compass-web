export interface ParsedForward {
  senderName: string | null;
  senderEmail: string | null;
  originalDate: string | null;
}

// Gmail: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:"
// Apple Mail: "On Sep 2, 2026, at 3:15 PM, Coach Smith <smith@osu.edu> wrote:"
// Spanish clients: "El vie, 2 sept 2026 a las 15:15, Coach Smith <smith@osu.edu> escribió:"
// Captures everything between "On"/"El" and "<email> wrote:"/"<email> escribió:" then
// parses date/name. The leading word and verb are alternated rather than hardcoded so
// this stays a shape match ("quote-marker line + <email> + verb") instead of chasing
// every locale's exact phrasing — add more locale verbs here as they come up.
export const ON_WROTE_RE =
  /(?:On|El)\s+(.+)\s<([^<>\s]+@[^<>\s]+)>\s+(?:wrote|escribió):/i;

// Outlook (desktop): separate "From:"/"Sent:" header lines rather than one "On ... wrote:" line.
export const OUTLOOK_FROM_RE = /From:\s*(?:([^<>\n]+?)\s*)?<?([^<>\s\n]+@[^<>\s\n]+)>?/i;
const OUTLOOK_SENT_RE = /Sent:\s*(.+)/i;

// Mobile Gmail/Outlook apps: "---------- Forwarded message ---------" banner above a
// From:/Date:/Subject:/To: block. Same From: shape as desktop Outlook, but the original
// date sits on a "Date:" line rather than "Sent:", and the banner text (not field order)
// is what distinguishes this from a from-scratch email that happens to quote "From:".
export const FORWARDED_MESSAGE_HEADER_RE = /-{2,}\s*Forwarded message\s*-{2,}/i;
const FORWARDED_DATE_RE = /Date:\s*(.+)/i;

// A hard-wrapped "On ... wrote:" line has its sole line break turned into a paragraph
// break by clients that reflow plain text at ~78 columns. Collapse those breaks (but
// never a real paragraph break, and never anything touching a quoted `>` line) into a
// space in a working copy used only to recover the sender line — bodyText as stored is
// untouched.
const HARD_WRAP_RE = /^([^\n>][^\n]*)\n(?!\n)(?!>)/gm;

function collapseHardWraps(text: string): string {
  return text.replace(HARD_WRAP_RE, "$1 ");
}

/**
 * Best-effort extraction of the original sender from a forwarded email body.
 * Handles Gmail/Apple-Mail's single "On <date> <name> <email> wrote:" line
 * (including a Spanish "escribió:" variant and hard-wrapped splits), mobile
 * Gmail/Outlook's "---------- Forwarded message ---------" header block, and
 * desktop Outlook's separate From:/Sent: header block. Never throws — a body
 * that matches nothing returns null so the caller stores an unmatched draft
 * rather than dropping the forward.
 */
export function parseForwardedEmail(bodyText: string): ParsedForward | null {
  if (FORWARDED_MESSAGE_HEADER_RE.test(bodyText)) {
    const fromMatch = OUTLOOK_FROM_RE.exec(bodyText);
    if (fromMatch) {
      const dateMatch = FORWARDED_DATE_RE.exec(bodyText);
      return {
        senderName: fromMatch[1]?.trim() ?? null,
        senderEmail: fromMatch[2]?.trim() ?? null,
        originalDate: dateMatch?.[1]?.trim() ?? null,
      };
    }
  }

  const onWroteMatch = ON_WROTE_RE.exec(collapseHardWraps(bodyText));
  if (onWroteMatch) {
    const dateAndName = onWroteMatch[1];
    const email = onWroteMatch[2];

    // Parse dateAndName to extract date and optional name.
    // The name (if present) typically follows a time pattern like "3:15 PM".
    // Look for a time pattern at the end of the date, then anything after that is the name.
    const timeMatch = /^(.+?\d{1,2}:\d{2}\s+(?:AM|PM)),?\s+(.+)$/i.exec(
      dateAndName
    );
    let date: string | null;
    let name: string | null;

    if (timeMatch) {
      date = timeMatch[1].trim();
      name = timeMatch[2].trim().replace(/^,\s*/, "");
    } else {
      // No time-based split found, try to find name at the end (capital words)
      const nameMatch = /^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/.exec(
        dateAndName
      );
      if (nameMatch && !nameMatch[2].match(/\d/)) {
        date = nameMatch[1].trim();
        name = nameMatch[2].trim();
      } else {
        date = dateAndName.trim();
        name = null;
      }
    }

    return {
      originalDate: date,
      senderName: name,
      senderEmail: email.trim(),
    };
  }

  const fromMatch = OUTLOOK_FROM_RE.exec(bodyText);
  if (fromMatch) {
    const sentMatch = OUTLOOK_SENT_RE.exec(bodyText);
    return {
      senderName: fromMatch[1]?.trim() ?? null,
      senderEmail: fromMatch[2]?.trim() ?? null,
      originalDate: sentMatch?.[1]?.trim() ?? null,
    };
  }

  return null;
}

// Global variants of the quote-marker patterns above, used only to locate
// every boundary in a multi-message thread (parseForwardedThread below) —
// the single-shot parseForwardedEmail keeps using the non-global originals.
const ON_WROTE_RE_G = /(?:On|El)\s+(.+)\s<([^<>\s]+@[^<>\s]+)>\s+(?:wrote|escribió):/gi;
const FORWARDED_MESSAGE_HEADER_RE_G = /-{2,}\s*Forwarded message\s*-{2,}/gi;

export interface ForwardedThreadSegment {
  parsed: ParsedForward | null;
  segmentText: string;
}

/**
 * Splits a forwarded body into one segment per quoted message when a player
 * bulk-forwards an entire thread rather than just the latest message — e.g.
 * nested "On ... wrote:" blocks, each quoting everything below it (Gmail/
 * Outlook's usual "newest on top, oldest quoted last" nesting).
 *
 * Boundaries are found FIRST (every quote-marker occurrence in the raw
 * body), then each resulting slice is parsed independently via the regular
 * single-shot parseForwardedEmail — never the whole un-sliced body — so a
 * later message's From:/Date: line can never bleed into an earlier
 * segment's parse (see Task 1's OUTLOOK_FROM_RE/FORWARDED_DATE_RE scoping
 * caveat).
 *
 * Segment 0 absorbs any leading un-quoted intro text (the forwarder's own
 * note) together with the first quoted message — exactly what
 * parseForwardedEmail already returns for a single-message forward — so
 * with 0 or 1 markers this returns exactly one segment whose `parsed` and
 * `segmentText` match today's whole-body single-message behavior byte for
 * byte.
 */
export function parseForwardedThread(bodyText: string): ForwardedThreadSegment[] {
  // Hard-wrap collapsing is length-preserving (newline -> single space), so
  // indices found on the collapsed copy still address the same offsets in
  // the original bodyText used for slicing below.
  const collapsed = collapseHardWraps(bodyText);
  const markerIndices = [
    ...Array.from(collapsed.matchAll(ON_WROTE_RE_G), (m) => m.index),
    ...Array.from(collapsed.matchAll(FORWARDED_MESSAGE_HEADER_RE_G), (m) => m.index),
  ].sort((a, b) => a - b);

  if (markerIndices.length <= 1) {
    return [{ parsed: parseForwardedEmail(bodyText), segmentText: bodyText }];
  }

  // Segment 0 runs from the start through the SECOND marker (absorbing the
  // intro plus the first quoted message, same as today's whole-body parse);
  // each later segment starts at its own marker and runs to the next one.
  const boundaries = [0, ...markerIndices.slice(1), bodyText.length];
  const segments: ForwardedThreadSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const segmentText = bodyText.slice(boundaries[i], boundaries[i + 1]);
    segments.push({ parsed: parseForwardedEmail(segmentText), segmentText });
  }
  return segments;
}
