import { createServerSupabaseClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event);
    const body = await readBody<{ token: string }>(event);

    if (!body.token) {
      throw createError({
        statusCode: 400,
        statusMessage: "Token is required",
      });
    }

    const supabase = createServerSupabaseClient();

    // Find link by invitation token
    const { data: link, error: fetchError } = await supabase
      .from("account_links")
      .select("*")
      .eq("invitation_token", body.token)
      .single();

    if (fetchError || !link) {
      throw createError({
        statusCode: 404,
        statusMessage: "Invitation not found",
      });
    }

    // Verify email matches
    if (link.invited_email?.toLowerCase() !== user.email?.toLowerCase()) {
      throw createError({
        statusCode: 403,
        statusMessage: "This invitation was sent to a different email",
      });
    }

    // Determine which field to update based on role
    const userRole = user.user_metadata?.role || "student";
    const updateData: { status: string; accepted_at: string; parent_user_id?: string; player_user_id?: string } = {
      status: "pending_confirmation",
      accepted_at: new Date().toISOString(),
    };

    if (userRole === "parent") {
      updateData.parent_user_id = user.id;
    } else {
      updateData.player_user_id = user.id;
    }

    // Update the link
    const { error: updateError } = await supabase
      .from("account_links")
      .update(updateData)
      .eq("id", link.id);

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update link: ${updateError.message}`,
      });
    }

    return {
      success: true,
      message: "Invitation accepted successfully",
    };
  } catch (err) {
    console.error("Error in accept-by-token:", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to accept invitation",
    });
  }
});
