/**
 * Coach-facing boilerplate for sharing a recruiting profile. Mirrors the iOS
 * `SendProfileCopy` semantics so both platforms produce the same subject/body.
 */

export type SendProfileChannelOption = "email" | "text" | "both" | "none";

function namePrefix(
  playerName: string,
  graduationYear?: number | null,
): string {
  return graduationYear ? `${graduationYear} ${playerName}` : playerName;
}

export function sendProfileSubject(
  playerName: string,
  graduationYear: number | null | undefined,
  positions: string,
): string {
  let subject = `${namePrefix(playerName, graduationYear)} Recruiting Profile`;
  const trimmed = positions.trim();
  if (trimmed) subject += ` (${trimmed})`;
  return subject;
}

export function sendProfileEmailBody(
  playerName: string,
  coachLastName: string,
  url: string,
): string {
  const lastName = coachLastName.trim();
  const greeting = lastName ? `Hi Coach ${lastName},` : "Hi Coach,";
  return [
    greeting,
    "",
    `I'd like to share ${playerName}'s recruiting profile with you:`,
    url,
    "",
    "Thank you for your time.",
  ].join("\n");
}

export function sendProfileTextBody(
  playerName: string,
  graduationYear: number | null | undefined,
  url: string,
): string {
  return `${namePrefix(playerName, graduationYear)} — recruiting profile: ${url}`;
}

export function sendProfileChannel(
  email: string | null | undefined,
  phone: string | null | undefined,
): SendProfileChannelOption {
  const hasEmail = Boolean(email?.trim());
  const hasPhone = Boolean(phone?.trim());
  if (hasEmail && hasPhone) return "both";
  if (hasEmail) return "email";
  if (hasPhone) return "text";
  return "none";
}
