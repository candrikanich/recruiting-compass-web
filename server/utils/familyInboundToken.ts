import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

const TOKEN_RE = /^[a-z0-9]{8}$/;
const INBOUND_LOCAL_PART_RE = /^family-([a-z0-9]{8})$/;

const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a random 8-character lowercase-alphanumeric token.
 */
const randomToken = (): string => {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++)
      bytes[i] = Math.floor(Math.random() * 256);
  }
  let result = "";
  for (let i = 0; i < bytes.length; i++)
    result += chars[bytes[i] % chars.length];
  return result;
};

/**
 * Generates a unique 8-char lowercase-alphanumeric inbound token, retrying
 * on collision. Mirrors generateFamilyCode's retry shape.
 */
export const generateInboundToken = async (
  admin: SupabaseClient<Database>,
): Promise<string> => {
  const maxRetries = 5;

  for (let i = 0; i < maxRetries; i++) {
    const token = randomToken();
    const { data } = await admin
      .from("family_units")
      .select("id")
      .eq("inbound_token", token)
      .maybeSingle();

    if (!data) return token;
  }

  throw new Error("Failed to generate unique inbound token after 5 retries");
};

/**
 * Resolves a family_unit_id from its inbound_token, or null if unknown.
 */
export const resolveFamilyByInboundToken = async (
  admin: SupabaseClient<Database>,
  token: string,
): Promise<string | null> => {
  if (!TOKEN_RE.test(token)) return null;
  const { data } = await admin
    .from("family_units")
    .select("id")
    .eq("inbound_token", token)
    .maybeSingle();
  return data?.id ?? null;
};

/**
 * Extracts the inbound token from the "To" address's local-part
 * (family-<token>@inbound.*). Returns null on any other shape — an
 * unrecognized address must never be treated as a valid token.
 */
export const parseInboundToken = (toAddress: string): string | null => {
  const localPart = toAddress.split("@")[0]?.trim().toLowerCase();
  if (!localPart) return null;
  const match = INBOUND_LOCAL_PART_RE.exec(localPart);
  return match ? match[1] : null;
};
