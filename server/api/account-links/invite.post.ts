/**
 * POST /api/account-links/invite
 * Send email invitation for account linking
 *
 * Body:
 *   - invitedEmail: string (email of invited user)
 *   - linkId: string (ID of the account link record)
 *
 * CSRF protection disabled: endpoint requires authentication via requireAuth()
 */

import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { sendEmail } from "~/server/utils/emailService";
import type { Database } from "~/types/database";

interface InviteRequest {
  invitedEmail: string;
  linkId: string;
}

type AccountLinkWithUser =
  Database["public"]["Tables"]["account_links"]["Row"] & {
    users: {
      full_name: string | null;
      email: string;
    } | null;
  };

export default defineEventHandler(async (event) => {
  try {
    await requireAuth(event);

    const body = await readBody<InviteRequest>(event);
    const { invitedEmail, linkId } = body;

    if (!invitedEmail || !linkId) {
      throw createError({
        statusCode: 400,
        message: "Missing required fields: invitedEmail, linkId",
      });
    }

    // Get link details with initiator user info
    const supabase = createServerSupabaseClient();
    const { data: link, error: fetchError } = await supabase
      .from("account_links")
      .select("*, users!account_links_initiator_user_id_fkey(full_name, email)")
      .eq("id", linkId)
      .single();

    if (fetchError || !link) {
      throw createError({
        statusCode: 404,
        message: "Invitation not found",
      });
    }

    // Get initiator name and invitation token
    const linkData = link as AccountLinkWithUser & {
      invitation_token: string | null;
    };
    const initiatorName = linkData.users?.full_name || "A family member";
    const initiatorEmail = linkData.users?.email || "unknown@example.com";

    // Generate invitation URL with token (for acceptance step)
    const appUrl = process.env.NUXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationUrl = `${appUrl}/accept-invitation?token=${linkData.invitation_token}`;

    // Send email invitation
    const emailResult = await sendEmail({
      to: invitedEmail,
      subject: `${initiatorName} invited you to link accounts on College Baseball Recruiting Compass`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <h2 style="margin: 0 0 16px 0; color: #111827;">You've been invited to link accounts</h2>

          <p style="margin: 16px 0; color: #4b5563; font-size: 16px;">
            <strong>${initiatorName}</strong> (${initiatorEmail}) has invited you to link your College Baseball Recruiting Compass accounts.
          </p>

          <h3 style="margin: 24px 0 12px 0; color: #1f2937; font-size: 16px;">What does this mean?</h3>
          <ul style="margin: 12px 0 24px 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
            <li>You'll be able to view and edit schools and coaches together</li>
            <li>You can both track interactions and events</li>
            <li>Private notes remain separate for each person</li>
          </ul>

          <p style="margin: 16px 0; color: #6b7280; font-size: 14px;">
            <strong>This invitation expires in 7 days.</strong>
          </p>

          <div style="margin: 32px 0;">
            <a href="${invitationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Accept Invitation</a>
          </div>

          <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            If you don't want to link accounts, you can ignore this email. The invitation will expire after 7 days.
          </p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.warn("Failed to send invitation email:", emailResult.error);
      // Don't fail the entire invitation if email fails - the link was already created
    }

    return {
      success: true,
      message: "Invitation sent successfully",
    };
  } catch (err) {
    console.error("Error in POST /api/account-links/invite:", err);

    // If it's already a properly formatted error, re-throw it
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to send invitation",
    });
  }
});
