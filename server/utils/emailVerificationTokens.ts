import { randomUUID } from "crypto";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueVerificationToken(
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const supabase = useSupabaseAdmin();

  // Invalidate any outstanding unconsumed token first — resend must kill
  // the old link, not leave two valid ones. invalidated_at is distinct from
  // consumed_at: a superseded token was never actually used to verify, so
  // consumeVerificationToken must not treat it as a successful verify.
  await supabase
    .from("email_verification_tokens")
    .update({ invalidated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("consumed_at", null)
    .is("invalidated_at", null);

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabase.from("email_verification_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`Failed to issue verification token: ${error.message}`);
  }

  return { token, expiresAt };
}

export async function consumeVerificationToken(token: string): Promise<{
  status: "verified" | "already_verified" | "expired" | "invalidated" | "not_found";
  userId?: string;
}> {
  const supabase = useSupabaseAdmin();

  // Token consumption and profile verification happen atomically in
  // consume_email_verification_token() — a zero-row profile update raises
  // and rolls back the whole call (including the token's consumed_at write)
  // instead of silently reporting success. It also carries develop's
  // invalidated_at guard (a resend must not let the stale link verify).
  // See migration 20260928000003_consume_email_verification_token_rpc.sql.
  const { data, error } = await supabase
    .rpc("consume_email_verification_token", { p_token: token })
    .single();

  if (error) {
    throw new Error(`Failed to consume verification token: ${error.message}`);
  }

  return {
    status: data.status as
      | "verified"
      | "already_verified"
      | "expired"
      | "invalidated"
      | "not_found",
    userId: data.user_id ?? undefined,
  };
}
