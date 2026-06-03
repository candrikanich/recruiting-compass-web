import { useSupabaseAdmin } from "~/server/utils/supabase";
import { normalizeEmail } from "~/server/utils/unsubscribeToken";

/**
 * Suppression-list access for recurring emails. Backed by the `email_optouts`
 * table (migration 20260603000000); presence of a row means the address is
 * suppressed. Service-role only — never queried from the client.
 */
export async function isOptedOut(email: string): Promise<boolean> {
  const { data } = await useSupabaseAdmin()
    .from("email_optouts")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  return data != null;
}

export async function recordOptOut(
  email: string,
): Promise<{ error: unknown }> {
  const { error } = await useSupabaseAdmin()
    .from("email_optouts")
    .upsert({ email: normalizeEmail(email) }, { onConflict: "email" });
  return { error };
}
