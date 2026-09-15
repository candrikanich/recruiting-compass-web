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

  const { data: row } = await supabase
    .from("email_verification_tokens")
    .select("user_id, expires_at, consumed_at, invalidated_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) {
    return { status: "not_found" };
  }

  if (row.invalidated_at) {
    // Superseded by a resend before it was ever used — the stale email's
    // link must not report success or touch email_verified_at.
    return { status: "invalidated", userId: row.user_id };
  }

  if (row.consumed_at) {
    // Idempotent — a double-click or stale tab replaying the same link is
    // a success, not an error (spec §4). Only reachable here when the token
    // was actually consumed by a successful verify, never for an invalidated
    // one (handled above), so it's safe to trust as a genuine prior verify.
    await supabase
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", row.user_id)
      .is("email_verified_at", null);

    return { status: "already_verified", userId: row.user_id };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { status: "expired" };
  }

  await supabase
    .from("email_verification_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("token", token);

  await supabase
    .from("users")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", row.user_id);

  return { status: "verified", userId: row.user_id };
}
