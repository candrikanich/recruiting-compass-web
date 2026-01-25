import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useToast } from "./useToast";
import type { AccountLink, LinkedAccount } from "~/types/models";
import type { Database } from "~/types/database";

// Types from database
type AccountLinkInsert =
  Database["public"]["Tables"]["account_links"]["Insert"];
type DatabaseUser = Database["public"]["Tables"]["users"]["Row"];

interface AccountLinksUpdate {
  status?: string;
  accepted_at?: string;
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
  const pendingInvitations = ref<AccountLink[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all account links for current user
  const fetchAccountLinks = async () => {
    if (!getUserStore().user) return;

    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .or(
          `parent_user_id.eq.${getUserStore().user?.id},player_user_id.eq.${getUserStore().user?.id}`,
        );

      if (fetchError) {
        error.value = fetchError.message;
        return;
      }

      links.value = data || [];

      // Separate accepted vs pending
      const accepted = links.value.filter((link) => link.status === "accepted");
      pendingInvitations.value = links.value.filter(
        (link) => link.status === "pending",
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

    const linkedUserIds = acceptedLinks.map((link) => {
      return link.parent_user_id === getUserStore().user?.id
        ? link.player_user_id
        : link.parent_user_id;
    });

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

      // Look for existing user with this email
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, role, email_confirmed_at")
        .eq("email", inviteeEmail)
        .single();

      // If user exists, verify they have correct role and email verified
      if (existingUser) {
        const user = existingUser as {
          id: string;
          role: string;
          email_confirmed_at: string | null;
        }; // Type assertion to access database fields
        if (!user.email_confirmed_at) {
          error.value = "That user has not verified their email yet";
          return false;
        }

        const currentUserRole = getUserStore().user?.role || "parent";
        const expectedInviteeRole =
          currentUserRole === "parent" ? "student" : "parent";

        if (user.role !== expectedInviteeRole) {
          error.value = `That user is a ${user.role}, not a ${expectedInviteeRole}`;
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

      // Create invitation
      const { data: createdLink, error: createError } = await supabase
        .from("account_links")
        .insert([
          {
            parent_user_id:
              getUserStore().user?.role === "parent"
                ? getUserStore().user?.id
                : (existingUser as unknown as DatabaseUser)?.id || null,
            player_user_id:
              getUserStore().user?.role === "student"
                ? getUserStore().user?.id
                : (existingUser as unknown as DatabaseUser)?.id || null,
            invited_email: inviteeEmail,
            initiator_user_id: getUserStore().user?.id || "",
            initiator_role: getUserStore().user?.role || "parent",
            status: "pending",
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
          await $fetch("/api/account-links/invite", {
            method: "POST",
            body: {
              inviteeEmail,
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

  // Accept invitation
  const acceptInvitation = async (linkId: string): Promise<boolean> => {
    if (!getUserStore().user) return false;

    loading.value = true;
    error.value = null;

    try {
      // Get the link to check expiry
      const { data: link, error: fetchError } = await supabase
        .from("account_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (fetchError || !link) {
        error.value = "Invitation not found";
        return false;
      }

      // Check if invitation has expired
      const linkData = link as AccountLink;
      if (new Date(linkData.expires_at || "") < new Date()) {
        error.value = "This invitation has expired";
        return false;
      }

      // Update link status
      const { error: updateError } = await supabase
        .from("account_links")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        } as AccountLinksUpdate)
        .eq("id", linkId);

      if (updateError) {
        error.value = updateError.message;
        return false;
      }

      // Call snapshot function to record data ownership
      try {
        const parentId =
          linkData.parent_user_id ||
          (getUserStore().user?.role === "parent"
            ? getUserStore().user?.id
            : null);
        const playerId =
          linkData.player_user_id ||
          (getUserStore().user?.role === "student"
            ? getUserStore().user?.id
            : null);

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

      showToast("Invitation accepted! Your data is now shared.", "success");
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
    pendingInvitations,
    loading,
    error,
    fetchAccountLinks,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    unlinkAccount,
  };
};
