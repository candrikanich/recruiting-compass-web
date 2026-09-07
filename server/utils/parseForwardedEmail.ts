export interface ParsedForward {
  senderName: string | null;
  senderEmail: string | null;
  originalDate: string | null;
}

// Gmail: "On Mon, Sep 2, 2026 at 3:15 PM Coach Smith <smith@osu.edu> wrote:"
// Apple Mail: "On Sep 2, 2026, at 3:15 PM, Coach Smith <smith@osu.edu> wrote:"
// Captures everything between "On " and "<email> wrote:" then parses date/name.
const ON_WROTE_RE = /On\s+(.+)\s<([^<>\s]+@[^<>\s]+)>\s+wrote:/i;

// Outlook: separate "From:"/"Sent:" header lines rather than one "On ... wrote:" line.
const OUTLOOK_FROM_RE =
  /From:\s*(?:([^<>\n]+?)\s*)?<?([^<>\s\n]+@[^<>\s\n]+)>?/i;
const OUTLOOK_SENT_RE = /Sent:\s*(.+)/i;

/**
 * Best-effort extraction of the original sender from a forwarded email body.
 * Handles Gmail/Apple-Mail's single "On <date> <name> <email> wrote:" line
 * and Outlook's separate From:/Sent: header block. Never throws — a body
 * that matches nothing returns null so the caller stores an unmatched draft
 * rather than dropping the forward.
 */
export function parseForwardedEmail(bodyText: string): ParsedForward | null {
  const onWroteMatch = ON_WROTE_RE.exec(bodyText);
  if (onWroteMatch) {
    const dateAndName = onWroteMatch[1];
    const email = onWroteMatch[2];

    // Parse dateAndName to extract date and optional name.
    // The name (if present) typically follows a time pattern like "3:15 PM".
    // Look for a time pattern at the end of the date, then anything after that is the name.
    const timeMatch = /^(.+?\d{1,2}:\d{2}\s+(?:AM|PM)),?\s+(.+)$/i.exec(
      dateAndName,
    );
    let date: string | null;
    let name: string | null;

    if (timeMatch) {
      date = timeMatch[1].trim();
      name = timeMatch[2].trim().replace(/^,\s*/, "");
    } else {
      // No time-based split found, try to find name at the end (capital words)
      const nameMatch = /^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/.exec(
        dateAndName,
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
