import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

export interface MatchCoachByEmailParams {
  familyUnitId: string;
  email?: string | null;
}

export interface MatchCoachByEmailResult {
  coachId: string | null;
  schoolId: string | null;
}

// ILIKE treats % and _ as wildcards; escape them so a case-insensitive exact
// match never behaves as a pattern match against an attacker-controlled email.
function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Family-scoped, email-only coach lookup for the unauthenticated public
 * Contact-Player flow. Never creates a coach — an unmatched email logs the
 * interaction with coach_id=NULL, and the player links/creates the coach later.
 */
export async function matchCoachByEmail(
  admin: SupabaseClient<Database>,
  params: MatchCoachByEmailParams,
): Promise<MatchCoachByEmailResult> {
  const email = params.email?.trim();
  if (!email) return { coachId: null, schoolId: null };

  const { data } = await admin
    .from("coaches")
    .select("id, school_id")
    .eq("family_unit_id", params.familyUnitId)
    .ilike("email", escapeIlike(email))
    .maybeSingle();

  return { coachId: data?.id ?? null, schoolId: data?.school_id ?? null };
}

/**
 * Extracts a bare, lowercase hostname from a school's `website` value, which
 * may be a full URL with a path (`https://www.osu.edu/athletics`) or a bare
 * domain (`osu.edu`). Returns null for anything that doesn't parse to a
 * hostname — missing value, empty string, garbage input.
 */
export function extractDomain(website: string | null | undefined): string | null {
  const trimmed = website?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const hostname = new URL(withProtocol).hostname.toLowerCase();
    return hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// Common personal-email-provider domains — a coach mailing from one of these
// matches zero schools by design. Without this denylist a family that also
// happens to use gmail.com would false-match every gmail-sending coach
// against whichever of their own tracked schools' domain math coincided.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "live.com",
  "msn.com",
  "protonmail.com",
]);

/**
 * Best-effort first/last name split for an auto-created coach. Never returns
 * an empty string for either field — `coaches.last_name` is NOT NULL.
 */
function splitSenderName(
  senderName: string | null,
  senderEmail: string,
): { firstName: string; lastName: string } {
  const trimmed = senderName?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
    }
    // A single-token name ("Coach") still needs a non-empty last_name.
    return { firstName: parts[0], lastName: "Coach" };
  }
  // No sender name recovered at all — placeholder first name + the email's
  // local-part as a stand-in surname, so the record is still correctable.
  const localPart = senderEmail.split("@")[0] || "Coach";
  return { firstName: "Coach", lastName: localPart };
}

export interface AutoCreateCoachByEmailDomainParams {
  familyUnitId: string;
  senderEmail?: string | null;
  senderName?: string | null;
}

/**
 * Inbound-webhook-only counterpart to `matchCoachByEmail`: call it after that
 * function returns no coach match. When the sender's email domain uniquely
 * matches the domain of one school the family already tracks, auto-creates a
 * `coaches` row for them (`source: "inbound_email_auto"`, `role: "recruiting"`)
 * so the draft can carry a `matched_coach_id` without the player having to
 * create the coach by hand first.
 *
 * Deliberately conservative and read-mostly like its sibling — never runs for
 * the public, unauthenticated Contact-Player flow (that's `matchCoachByEmail`
 * alone), and never auto-creates on a personal-email-provider domain or a
 * domain that matches more than one tracked school. Zero or ambiguous matches
 * both fall through to `matched_coach_id: null` for a human to resolve —
 * better a false negative than misattributing a coach to the wrong school.
 */
export async function autoCreateCoachByEmailDomain(
  admin: SupabaseClient<Database>,
  params: AutoCreateCoachByEmailDomainParams,
): Promise<MatchCoachByEmailResult> {
  const NO_MATCH: MatchCoachByEmailResult = { coachId: null, schoolId: null };

  const senderEmail = params.senderEmail?.trim();
  if (!senderEmail) return NO_MATCH;

  const atIndex = senderEmail.lastIndexOf("@");
  if (atIndex < 0) return NO_MATCH;
  const senderDomain = senderEmail.slice(atIndex + 1).toLowerCase();
  if (!senderDomain || PERSONAL_EMAIL_DOMAINS.has(senderDomain)) return NO_MATCH;

  const { data: schools } = await admin
    .from("schools")
    .select("id, user_id, website")
    .eq("family_unit_id", params.familyUnitId);
  if (!schools || schools.length === 0) return NO_MATCH;

  const matches = schools.filter((school) => extractDomain(school.website) === senderDomain);
  if (matches.length !== 1) return NO_MATCH; // zero or ambiguous — leave it for a human

  const school = matches[0];
  const { firstName, lastName } = splitSenderName(params.senderName ?? null, senderEmail);

  const { data: newCoach } = await admin
    .from("coaches")
    .insert({
      family_unit_id: params.familyUnitId,
      school_id: school.id,
      user_id: school.user_id,
      first_name: firstName,
      last_name: lastName,
      email: senderEmail,
      role: "recruiting",
      source: "inbound_email_auto",
    })
    .select("id")
    .single();
  if (!newCoach) return NO_MATCH;

  return { coachId: newCoach.id, schoolId: school.id };
}
