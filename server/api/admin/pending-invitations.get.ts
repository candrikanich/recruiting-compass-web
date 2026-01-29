/**
 * GET /api/admin/pending-invitations
 * Fetches all pending account link invitations across the system
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: PendingInvitation[]
 */

import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import type { PendingInvitation } from "~/types/admin";

const logger = createLogger("admin/pending-invitations");

export default defineEventHandler(
  async (event): Promise<PendingInvitation[]> => {
    try {
      // Verify user is authenticated
      const user = await requireAuth(event);

      // Create admin client with service role
      const supabaseAdmin = useSupabaseAdmin();

      // Check admin status
      const { data: adminCheck } = await supabaseAdmin
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!adminCheck?.is_admin) {
        logger.warn(`Non-admin user ${user.id} attempted to fetch pending invitations`);
        throw createError({
          statusCode: 403,
          statusMessage: "Only administrators can view pending invitations",
        });
      }

      // First, let's see what statuses actually exist
      const { data: allLinks } = await supabaseAdmin
        .from("account_links")
        .select("id, status, invited_email");

      const statuses = allLinks ? Array.from(new Set(allLinks.map((l) => l.status))) : [];
      console.log(`[API DEBUG] Total account_links in DB: ${allLinks?.length || 0}`);
      console.log(`[API DEBUG] Unique statuses found: ${statuses.join(", ")}`);

      // Fetch all pending invitations with initiator details
      // "Pending" means invitations that haven't been fully linked yet (parent_user_id or player_user_id is null)
      const { data: invitations, error: fetchError } = await supabaseAdmin
        .from("account_links")
        .select("*, users!account_links_initiator_user_id_fkey(email, full_name)")
        .or("parent_user_id.is.null,player_user_id.is.null")
        .order("created_at", { ascending: false });

      console.log(`[API DEBUG] Fetch error:`, fetchError?.message || "none");
      console.log(`[API DEBUG] Invitations type:`, typeof invitations, "is array:", Array.isArray(invitations), "length:", invitations?.length);

      if (fetchError) {
        logger.error("Failed to fetch pending invitations", fetchError);
        console.error("[API] Supabase error:", JSON.stringify(fetchError, null, 2));

        // Return debug info in error response
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to fetch pending invitations. Available statuses: ${statuses.join(", ")}`,
        });
      }

      logger.info(`Found ${invitations?.length || 0} pending invitations`);
      console.log(`[API] Raw invitations:`, JSON.stringify(invitations, null, 2));

      // Transform the response to match PendingInvitation type
      interface RawInvitation {
        id: string;
        invited_email: string;
        initiator_role: string;
        invitation_token: string | null;
        expires_at: string;
        created_at: string;
        invited_at: string;
        users: {
          email: string;
          full_name: string | null;
        } | null;
      }

      const transformedInvitations: PendingInvitation[] = (invitations as RawInvitation[] || []).map(
        (inv) => ({
          id: inv.id,
          invited_email: inv.invited_email,
          initiator_email: inv.users?.email || "Unknown",
          initiator_name: inv.users?.full_name || null,
          initiator_role: inv.initiator_role,
          invitation_token: inv.invitation_token,
          expires_at: inv.expires_at,
          created_at: inv.created_at,
          invited_at: inv.invited_at,
        }),
      );

      logger.info(
        `Admin ${user.id} fetched ${transformedInvitations.length} pending invitations`,
      );

      // Return raw data first to see what Supabase is returning
      console.log("[API] About to return:", {
        rawInvitationsCount: invitations?.length,
        transformedCount: transformedInvitations.length,
        statusesInDB: statuses,
        firstRawInvitation: invitations?.[0],
      });

      return transformedInvitations;
    } catch (error) {
      logger.error("Get pending invitations endpoint failed", error);

      if (error instanceof Error && "statusCode" in error) {
        throw error;
      }

      throw createError({
        statusCode: 500,
        statusMessage:
          error instanceof Error ? error.message : "Failed to fetch pending invitations",
      });
    }
  },
);
