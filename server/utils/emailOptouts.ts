import { useSupabaseAdmin } from "~/server/utils/supabase";
import { normalizeEmail } from "~/server/utils/unsubscribeToken";

/**
 * Suppression-list access for recurring emails.
 *
 * `email_optouts` is created by migration 20260603000000. Until `types/database.ts`
 * is regenerated against it the table is absent from the generated schema, so the
 * client is narrowed here to just the columns this module uses. Once types are
 * regenerated (`npx supabase gen types ...`), this cast can be dropped.
 */
interface OptoutClient {
  from(table: "email_optouts"): {
    select(columns: "email"): {
      eq(
        column: "email",
        value: string,
      ): {
        maybeSingle(): Promise<{
          data: { email: string } | null;
          error: unknown;
        }>;
      };
    };
    upsert(
      values: { email: string },
      options: { onConflict: "email" },
    ): Promise<{ error: unknown }>;
  };
}

const optoutDb = (): OptoutClient =>
  useSupabaseAdmin() as unknown as OptoutClient;

export async function isOptedOut(email: string): Promise<boolean> {
  const { data } = await optoutDb()
    .from("email_optouts")
    .select("email")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  return data != null;
}

export async function recordOptOut(email: string): Promise<{ error: unknown }> {
  return optoutDb()
    .from("email_optouts")
    .upsert({ email: normalizeEmail(email) }, { onConflict: "email" });
}
