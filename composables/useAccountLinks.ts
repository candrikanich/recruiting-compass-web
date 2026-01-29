import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useToast } from "./useToast";
import type { AccountLink, LinkedAccount } from "~/types/models";
import type { Database } from "~/types/database";

// Types from database
type AccountLinkInsert =
  Database["public"]["Tables"]["account_links"]["Insert"];

interface AccountLinksUpdate {
  status?: string;
  accepted_at?: string;
  confirmed_at?: string;
}

export const useAccountLinks = () => {
  const supabase = useSupabase();
  let userStore: ReturnType<typeof useUserStore> | undefined;
  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore();
    }
    return userStore;
  };
  const { showToast } = useToast();

  const links = ref<AccountLink[]>([]);
  const linkedAccounts = ref<LinkedAccount[]>([]);
  const sentInvitations = ref<AccountLink[]>([]); // I initiated, awaiting response
  const receivedInvitations = ref<AccountLink[]>([]); // Sent to me, I need to accept
  const pendingConfirmations = ref<AccountLink[]>([]); // Invitee accepted, I need to confirm
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Helper: determine relationship type based on roles
  const determineRelationshipType = (
    initiatorRole: string,
    inviteeExists: boolean,
    inviteeRole?: string,
  ): string | null => {
    if (initiatorRole === "parent") {
      return inviteeExists && inviteeRole === "parent" ? "parent-parent" : "parent-player";
    }
    return "player-parent";
  };

  // Fetch all account links for current user
  const fetchAccountLinks = async () => {
    if (!getUserStore().user) return;

    loading.value = true;
    error.value = null;

    try {
      const userId = getUserStore().user?.id;

      // Fetch all links where user is either initiator, parent, or player
      const { data, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .or(
          `initiator_user_id.eq.${userId},parent_user_id.eq.${userId},player_user_id.eq.${userId}`,
        );

      if (fetchError) {
        error.value = fetchError.message;
        return;
      }

      links.value = data || [];

      // Categorize by status and role
      const accepted = links.value.filter((link) => link.status === "accepted");

      // Sent invitations: I initiated AND status is pending_acceptance
      sentInvitations.value = links.value.filter(
        (link) => link.initiator_user_id === userId && link.status === "pending_acceptance",
      );

      // Received invitations: sent to my email AND status is pending_acceptance
      receivedInvitations.value = links.value.filter(
        (link) =>
          link.invited_email?.toLowerCase() === getUserStore().user?.email?.toLowerCase() &&
          link.status === "pending_acceptance",
      );

      // Pending confirmations: I initiated AND status is pending_confirmation
      pendingConfirmations.value = links.value.filter(
        (link) => link.initiator_user_id === userId && link.status === "pending_confirmation",
      );

      // Fetch user details for accepted links
      await fetchLinkedAccountDetails(accepted);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch account links";
    } finally {
      loading.value = false;
    }
  };

  // Fetch user details for linked accounts
  const fetchLinkedAccountDetails = async (acceptedLinks: AccountLink[]) => {
    if (acceptedLinks.length === 0) {
      linkedAccounts.value = [];
      return;
    }

    const linkedUserIds = acceptedLinks
      .map((link) => {
        return link.parent_user_id === getUserStore().user?.id
          ? link.player_user_id
          : link.parent_user_id;
      })
      .filter((id): id is string => id !== null && id !== undefined);

    // Guard against empty array after filtering
    if (linkedUserIds.length === 0) {
      linkedAccounts.value = [];
      return;
    }

    try {
      const { data } = await supabase
        .from("users")
        .select("id, email, full_name, role")
        .in("id", linkedUserIds);

      linkedAccounts.value = (data || []).map(
        (user: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
        }) => {
          const link = acceptedLinks.find(
            (l) => l.parent_user_id === user.id || l.player_user_id === user.id,
          );
          return {
            user_id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            relationship:
              link?.parent_user_id === user.id ? "parent" : "student",
          };
        },
      );
    } catch (err) {
      console.error("Failed to fetch linked account details:", err);
    }
  };

  // Send invitation
  const sendInvitation = async (inviteeEmail: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Validate email format
      if (!inviteeEmail || !inviteeEmail.includes("@")) {
        error.value = "Please enter a valid email address";
        return false;
      }

      // Check if invitee email is same as current user
      if (
        inviteeEmail.toLowerCase() === getUserStore().user?.email?.toLowerCase()
      ) {
        error.value = "You cannot invite yourself";
        return false;
      }

      // Check if user has reached the 5-user limit (accepted + pending)
      const { data: existingLinks, error: limitError } = await supabase
        .from("account_links")
        .select("id")
        .or(
          `parent_user_id.eq.${getUserStore().user?.id},player_user_id.eq.${getUserStore().user?.id}`,
        )
        .in("status", ["accepted", "pending"]);

      if (limitError) {
        error.value = limitError.message;
        return false;
      }

      if (existingLinks && existingLinks.length >= 5) {
        error.value =
          "You have reached the maximum of 5 linked accounts (including pending invitations)";
        return false;
      }

      // Look for existing user with this email via API endpoint
      const { exists, user: existingUser } = await $fetch<{
        exists: boolean;
        user: {
          id: string;
          role: string;
          email_confirmed_at: string | null;
        } | null;
      }>(`/api/account-links/check-user?email=${encodeURIComponent(inviteeEmail)}`);

      // If user exists, verify they have correct role and email is verified
      if (exists && existingUser) {
        const user = existingUser as {
          id: string;
          role: string;
          email_confirmed_at: string | null;
        }; // Type assertion to access database fields

        const currentUserRole = getUserStore().user?.role || "parent";
        const expectedInviteeRole =
          currentUserRole === "parent" ? "student" : "parent";

        if (user.role !== expectedInviteeRole) {
          error.value = `That user is a ${user.role}, not a ${expectedInviteeRole}`;
          return false;
        }

        // Check if user's email is verified
        if (!user.email_confirmed_at) {
          error.value = "That user has not verified their email address yet. They will need to verify their email before you can link accounts.";
          return false;
        }

        // Check if link already exists
        const { data: existingLink } = await supabase
          .from("account_links")
          .select("id")
          .or(
            `and(parent_user_id.eq.${getUserStore().user?.id},player_user_id.eq.${user.id}),and(parent_user_id.eq.${user.id},player_user_id.eq.${getUserStore().user?.id})`,
          )
          .single();

        if (existingLink) {
          error.value = "You already have a link with this user";
          return false;
        }
      }

      // Determine relationship type
      const relationshipType = determineRelationshipType(
        getUserStore().user?.role || "parent",
        exists,
        existingUser?.role,
      );

      // Create invitation with new status and relationship_type
      const { data: createdLink, error: createError } = await supabase
        .from("account_links")
        .insert([
          {
            parent_user_id:
              getUserStore().user?.role === "parent"
                ? getUserStore().user?.id
                : existingUser?.id || null,
            player_user_id:
              getUserStore().user?.role === "student"
                ? getUserStore().user?.id
                : existingUser?.id || null,
            invited_email: inviteeEmail,
            initiator_user_id: getUserStore().user?.id || "",
            initiator_role: getUserStore().user?.role || "parent",
            status: "pending_acceptance",
            relationship_type: relationshipType,
          } as AccountLinkInsert,
        ])
        .select()
        .single();

      if (createError) {
        error.value = createError.message;
        return false;
      }

      // Send email invitation
      if (createdLink) {
        try {
          // Get CSRF token and auth token for POST request
          const { token: csrfToken } = await $fetch<{ token: string }>(
            "/api/csrf-token",
          );

          // Get Supabase session for Authorization header
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const authToken = session?.access_token;

          await $fetch("/api/account-links/invite", {
            method: "POST",
            headers: {
              "x-csrf-token": csrfToken,
              ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
            body: {
              invitedEmail: inviteeEmail,
              linkId: createdLink.id,
            },
          });
        } catch (emailError) {
          console.warn("Failed to send invitation email:", emailError);
          // Don't fail the entire invitation if email fails - link was created successfully
        }
      }

      showToast(
        `Invitation sent to ${inviteeEmail}. They will see it when they accept.`,
        "success",
      );
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to send invitation";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Accept invitation (Step 2: Invitee accepts)
  // Updates status to pending_confirmation, awaiting initiator confirmation
  const acceptInvitationAsInvitee = async (token: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Find link by invitation token
      const { data: link, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .eq("invitation_token", token)
        .single();

      if (fetchError || !link) {
        error.value = "Invitation not found or is invalid";
        return false;
      }

      const linkData = link as AccountLink;

      // Check if invitation has expired
      if (new Date(linkData.expires_at || "") < new Date()) {
        error.value = "This invitation has expired";
        return false;
      }

      // Verify logged-in user email matches invited_email
      if (linkData.invited_email?.toLowerCase() !== getUserStore().user?.email?.toLowerCase()) {
        error.value = "This invitation was sent to a different email address";
        return false;
      }

      // Update user ID in the link based on their role
      const updateData: AccountLinksUpdate & { player_user_id?: string | null; parent_user_id?: string | null } = {
        status: "pending_confirmation",
        accepted_at: new Date().toISOString(),
      };

      // Set the appropriate user ID field
      if (getUserStore().user?.role === "parent") {
        updateData.parent_user_id = getUserStore().user?.id;
      } else {
        updateData.player_user_id = getUserStore().user?.id;
      }

      // Update link status to pending_confirmation
      const { error: updateError } = await supabase
        .from("account_links")
        .update(updateData)
        .eq("id", linkData.id);

      if (updateError) {
        error.value = updateError.message;
        return false;
      }

      // Call API to send notification to initiator
      try {
        const { token: csrfToken } = await $fetch<{ token: string }>(
          "/api/csrf-token"
        );

        await $fetch("/api/notifications/create", {
          method: "POST",
          headers: {
            "x-csrf-token": csrfToken,
          },
          body: {
            user_id: linkData.initiator_user_id,
            type: "account_link_invitation_accepted",
            title: `${getUserStore().user?.full_name} accepted your invitation`,
            message: `${getUserStore().user?.full_name} has accepted your invitation. Please confirm this is the person you invited.`,
            priority: "high",
            action_url: "/settings/account-linking",
          },
        });
      } catch (notifyErr) {
        console.warn("Failed to send notification:", notifyErr);
        // Continue despite notification error
      }

      showToast("Invitation accepted! Please wait for confirmation.", "success");
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to accept invitation";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Confirm link (Step 3: Initiator confirms)
  // Updates status from pending_confirmation to accepted and activates data sharing
  const confirmLinkAsInitiator = async (linkId: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Get the link details
      const { data: link, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (fetchError || !link) {
        error.value = "Link not found";
        return false;
      }

      const linkData = link as AccountLink;

      // Verify current user is the initiator
      if (linkData.initiator_user_id !== getUserStore().user?.id) {
        error.value = "You are not authorized to confirm this link";
        return false;
      }

      // Verify status is pending_confirmation
      if (linkData.status !== "pending_confirmation") {
        error.value = "This link is not awaiting confirmation";
        return false;
      }

      // Update status to accepted
      const { error: updateError } = await supabase
        .from("account_links")
        .update({
          status: "accepted",
          confirmed_at: new Date().toISOString(),
        } as AccountLinksUpdate)
        .eq("id", linkId);

      if (updateError) {
        error.value = updateError.message;
        return false;
      }

      // Call snapshot function to record data ownership
      try {
        const parentId = linkData.parent_user_id;
        const playerId = linkData.player_user_id;

        if (parentId && playerId) {
          await supabase.rpc("snapshot_data_ownership", {
            p_link_id: linkId,
            p_parent_id: parentId,
            p_player_id: playerId,
          });
        }
      } catch (snapshotErr) {
        console.warn("Failed to snapshot data ownership:", snapshotErr);
        // Continue despite snapshot error - link is still accepted
      }

      // Send notifications to both users
      try {
        // Get CSRF token for notification requests
        const { token: csrfToken } = await $fetch<{ token: string }>(
          "/api/csrf-token"
        );

        // Notify invitee
        const inviteeId = linkData.player_user_id || linkData.parent_user_id;
        if (inviteeId) {
          await $fetch("/api/notifications/create", {
            method: "POST",
            headers: {
              "x-csrf-token": csrfToken,
            },
            body: {
              user_id: inviteeId,
              type: "account_link_confirmed",
              title: "Account link confirmed",
              message: "Your account link has been confirmed. Data sharing is now active.",
              priority: "medium",
              action_url: "/settings/account-linking",
            },
          });
        }

        // Notify initiator
        await $fetch("/api/notifications/create", {
          method: "POST",
          headers: {
            "x-csrf-token": csrfToken,
          },
          body: {
            user_id: linkData.initiator_user_id,
            type: "account_link_confirmed",
            title: "Account link confirmed",
            message: "Account link confirmed. Data sharing is now active.",
            priority: "medium",
            action_url: "/settings/account-linking",
          },
        });
      } catch (notifyErr) {
        console.warn("Failed to send notifications:", notifyErr);
      }

      showToast("Link confirmed! Data sharing is now active.", "success");
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to confirm link";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Reject confirmation (Initiator rejects after invitee accepts)
  const rejectConfirmation = async (linkId: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Get the link
      const { data: link, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (fetchError || !link) {
        error.value = "Link not found";
        return false;
      }

      const linkData = link as AccountLink;

      // Verify current user is the initiator
      if (linkData.initiator_user_id !== getUserStore().user?.id) {
        error.value = "You are not authorized to reject this link";
        return false;
      }

      // Update status to rejected
      const { error: updateError } = await supabase
        .from("account_links")
        .update({ status: "rejected" } as AccountLinksUpdate)
        .eq("id", linkId);

      if (updateError) {
        error.value = updateError.message;
        return false;
      }

      // Notify invitee
      try {
        const { token: csrfToken } = await $fetch<{ token: string }>(
          "/api/csrf-token"
        );

        const inviteeId = linkData.player_user_id || linkData.parent_user_id;
        if (inviteeId) {
          await $fetch("/api/notifications/create", {
            method: "POST",
            headers: {
              "x-csrf-token": csrfToken,
            },
            body: {
              user_id: inviteeId,
              type: "account_link_rejected",
              title: "Account link rejected",
              message: "Your account link request was rejected.",
              priority: "medium",
              action_url: "/settings/account-linking",
            },
          });
        }
      } catch (notifyErr) {
        console.warn("Failed to send notification:", notifyErr);
      }

      showToast("Link rejected", "info");
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to reject confirmation";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Cancel sent invitation (Initiator cancels before invitee accepts)
  const cancelInvitation = async (linkId: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Get the link
      const { data: link, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (fetchError || !link) {
        error.value = "Link not found";
        return false;
      }

      const linkData = link as AccountLink;

      // Verify current user is the initiator
      if (linkData.initiator_user_id !== getUserStore().user?.id) {
        error.value = "You are not authorized to cancel this invitation";
        return false;
      }

      // Delete the link
      const { error: deleteError } = await supabase
        .from("account_links")
        .delete()
        .eq("id", linkId);

      if (deleteError) {
        error.value = deleteError.message;
        return false;
      }

      showToast("Invitation cancelled", "info");
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to cancel invitation";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Accept invitation (legacy method for backward compat, calls acceptInvitationAsInvitee)
  const acceptInvitation = acceptInvitationAsInvitee;

  // Reject invitation
  const rejectInvitation = async (linkId: string): Promise<boolean> => {
    loading.value = true;
    error.value = null;

    try {
      const { error: updateError } = await supabase
        .from("account_links")
        .update({ status: "rejected" } as AccountLinksUpdate)
        .eq("id", linkId);

      if (updateError) {
        error.value = updateError.message;
        return false;
      }

      showToast("Invitation rejected", "info");
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to reject invitation";
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Unlink account
  const unlinkAccount = async (linkId: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Get the link details
      const { data: link } = await supabase
        .from("account_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (!link) {
        error.value = "Link not found";
        return false;
      }

      // Duplicate data for both users
      try {
        const linkData = link as AccountLink; // Type assertion to access database fields
        const parentId = linkData.parent_user_id;
        const playerId = linkData.player_user_id;

        if (parentId) {
          await supabase.rpc("duplicate_data_on_unlink", {
            p_link_id: linkId,
            p_user_keeping_copy: parentId,
          });
        }

        if (playerId) {
          await supabase.rpc("duplicate_data_on_unlink", {
            p_link_id: linkId,
            p_user_keeping_copy: playerId,
          });
        }
      } catch (dupErr) {
        console.warn("Failed to duplicate data on unlink:", dupErr);
        // Continue despite duplication error
      }

      // Delete the link
      const { error: deleteError } = await supabase
        .from("account_links")
        .delete()
        .eq("id", linkId);

      if (deleteError) {
        error.value = deleteError.message;
        return false;
      }

      showToast(
        "Account unlinked successfully. Both users keep their data.",
        "success",
      );
      await fetchAccountLinks();
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to unlink account";
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    links,
    linkedAccounts,
    sentInvitations,
    receivedInvitations,
    pendingConfirmations,
    loading,
    error,
    fetchAccountLinks,
    sendInvitation,
    acceptInvitation,
    acceptInvitationAsInvitee,
    confirmLinkAsInitiator,
    rejectConfirmation,
    cancelInvitation,
    rejectInvitation,
    unlinkAccount,
  };
};
