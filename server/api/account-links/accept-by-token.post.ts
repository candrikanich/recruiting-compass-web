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

    // Find link by invitation token (bypasses RLS)
    const { data: link, error: fetchError } = await supabase
      .from("account_links")
      .select("*")
      .eq("invitation_token", body.token)
      .single();

    if (fetchError || !link) {
      throw createError({
        statusCode: 404,
        statusMessage: "Invitation not found or is invalid",
      });
    }

    // Check if invitation has expired
    if (new Date(link.expires_at || "") < new Date()) {
      throw createError({
        statusCode: 410,
        statusMessage: "This invitation has expired",
      });
    }

    // Verify logged-in user email matches invited_email
    if (link.invited_email?.toLowerCase() !== user.user.email?.toLowerCase()) {
      throw createError({
        statusCode: 403,
        statusMessage: "This invitation was sent to a different email address",
      });
    }

    // Update user ID in the link based on their role
    interface UpdateData {
      status: string;
      accepted_at: string;
      parent_user_id?: string;
      player_user_id?: string;
    }
    const updateData: UpdateData = {
      status: "pending_confirmation",
      accepted_at: new Date().toISOString(),
    };

    // Set the appropriate user ID field
    const userRole = user.user.user_metadata?.role || "student";
    if (userRole === "parent") {
      updateData.parent_user_id = user.user.id;
    } else {
      updateData.player_user_id = user.user.id;
    }

    // Update link status to pending_confirmation
    const { error: updateError } = await supabase
      .from("account_links")
      .update(updateData)
      .eq("id", link.id);

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: updateError.message,
      });
    }

    // Get initiator info for email
    const { data: initiatorUser } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", link.initiator_user_id)
      .single();

    const accepterName = user.user.user_metadata?.full_name || user.user.email;

    // Send email to initiator
    try {
      const appUrl = process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000";
      const confirmUrl = `${appUrl}/settings/account-linking`;

      await sendEmail({
        to: initiatorUser?.email || "",
        subject: `${accepterName} accepted your family account link invitation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #111827;">Invitation Accepted! ✅</h2>

            <p style="margin: 16px 0; color: #4b5563; font-size: 16px;">
              <strong>${accepterName}</strong> has accepted your family account link invitation!
            </p>

            <p style="margin: 16px 0; color: #4b5563; font-size: 16px;">
              To complete the link and activate data sharing, please confirm this is the person you invited.
            </p>

            <div style="margin: 32px 0; background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>Next Step:</strong> Click the button below to review and confirm the link.
              </p>
            </div>

            <div style="margin: 32px 0;">
              <a href="${confirmUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Confirm Link</a>
            </div>

            <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Once you confirm, you'll both be able to view and share recruiting data.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Failed to send confirmation email:", emailErr);
      // Continue despite email error
    }

    // Call API to send notification to initiator
    try {
      await $fetch("/api/notifications/create", {
        method: "POST",
        body: {
          user_id: link.initiator_user_id,
          type: "account_link_invitation_accepted",
          title: `${accepterName} accepted your invitation`,
          message: `${accepterName} has accepted your invitation. Please confirm this is the person you invited.`,
          priority: "high",
          action_url: "/settings/account-linking",
        },
      });
    } catch (notifyErr) {
      console.warn("Failed to send notification:", notifyErr);
      // Continue despite notification error
    }

    return {
      success: true,
      message: "Invitation accepted successfully",
    };
  } catch (err) {
    console.error("Error in POST /api/account-links/accept-by-token:", err);

    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to accept invitation",
    });
  }
});
