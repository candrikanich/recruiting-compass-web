/**
 * US phone helpers.
 *
 * Storage is E.164 (`+14405550134`) so iOS `tel:` / `sms:` / Messages
 * recipients parse the number without stripping punctuation. The input
 * mask and display stay national: `(440) 555-0134`.
 */

const E164_US = /^\+1\d{10}$/;

/** Digits only, with a leading US country code stripped when present. */
export function nationalDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** As-you-type national mask. Caps at 10 NANP digits. */
export function formatPhoneNational(input: string): string {
  const digits = nationalDigits(input).slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** E.164 `+1XXXXXXXXXX`, or null if the input is not a complete US number. */
export function toE164US(input: string): string | null {
  const digits = nationalDigits(input);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

/**
 * Persist a phone value. Complete US numbers become E.164; empty becomes
 * null; incomplete typed values are kept so mid-edit autosave does not wipe.
 */
export function toStoredPhone(
  input: string | null | undefined,
): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return toE164US(trimmed) ?? trimmed;
}

/** National mask for a complete number; otherwise the original string. */
export function formatPhoneDisplay(input: string): string {
  if (E164_US.test(input) || toE164US(input)) {
    return formatPhoneNational(input);
  }
  return input;
}

export function toTelHref(phone: string): string {
  return `tel:${toE164US(phone) ?? phone}`;
}

export function toSmsHref(phone: string, body?: string): string {
  const dest = toE164US(phone) ?? phone.replace(/\D/g, "");
  if (!dest) return "";
  if (body) return `sms:${dest}?body=${encodeURIComponent(body)}`;
  return `sms:${dest}`;
}
