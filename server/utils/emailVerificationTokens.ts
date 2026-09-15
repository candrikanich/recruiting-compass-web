import { randomUUID } from "crypto";
import { useSupabaseAdmin } from "~/server/utils/supabase";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueVerificationToken(
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const supabase = useSupabaseAdmin();

  // Invalidate any outstanding unconsumed token first — resend must kill
  // the old link, not leave two valid ones.
  await supabase
    .from("email_verification_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("consumed_at", null);

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
  status: "verified" | "already_verified" | "expired" | "not_found";
  userId?: string;
}> {
  const supabase = useSupabaseAdmin();

  const { data: row } = await supabase
    .from("email_verification_tokens")
    .select("user_id, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) {
    return { status: "not_found" };
  }

  if (row.consumed_at) {
    // Idempotent — a double-click or stale tab replaying the same link is
    // a success, not an error (spec §4). But consumed_at is also set when a
    // token is invalidated by a resend (issueVerificationToken above), which
    // is NOT the same as having verified — without this the old email's link
    // would report success while email_verified_at stayed null.
    const { error: backfillError } = await supabase
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", row.user_id)
      .is("email_verified_at", null);

    if (backfillError) {
      throw new Error(`Failed to mark email verified: ${backfillError.message}`);
    }

    return { status: "already_verified", userId: row.user_id };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { status: "expired" };
  }

  const { error: consumeError } = await supabase
    .from("email_verification_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("token", token);

  if (consumeError) {
    throw new Error(`Failed to consume verification token: ${consumeError.message}`);
  }

  const { error: verifyError } = await supabase
    .from("users")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", row.user_id);

  if (verifyError) {
    throw new Error(`Failed to mark email verified: ${verifyError.message}`);
  }

  return { status: "verified", userId: row.user_id };
}
