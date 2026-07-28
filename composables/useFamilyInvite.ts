import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useAuthFetch } from "./useAuthFetch";
import { createClientLogger } from "~/utils/logger";

/**
 * Composable for managing family invitations
 *
 * Handles sending parent invites via email. Email validation included.
 *
 * The real family-code join flow lives in useFamilyCode + the
 * /api/family/code/join endpoint (family_units/family_members tables). A
 * prior linkParentWithCode() here queried a nonexistent users.family_code
 * column (family_code only exists on family_units) and was deleted as dead
 * ghost-schema code — see planning/audit-2026-07-27-findings.md.
 *
 * @example
 * const { sendParentInvite } = useFamilyInvite()
 * await sendParentInvite('parent@example.com')
 */
const logger = createClientLogger("useFamilyInvite");

export const useFamilyInvite = () => {
  const supabase = useSupabase();

  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastInvitedEmail = ref<string | null>(null);

  /**
   * Validate email format using regex
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Send parent invitation email
   * Player must be authenticated
   */
  const sendParentInvite = async (parentEmail: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      // Validate email format
      if (!isValidEmail(parentEmail)) {
        throw new Error("Invalid email");
      }

      // Verify player is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Fetch current user data
      const { data: userData, error: userError } = (await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()) as {
        data: Record<string, unknown> | null;
        error: unknown;
      };

      if (userError || !userData) {
        throw userError || new Error("User data not found");
      }

      // Send email via Supabase function with player info
      const { error: emailError } = (await supabase.functions.invoke(
        "send-parent-invite-email",
        {
          body: {
            parent_email: parentEmail,
            player_name: userData.full_name || "Player",
            player_id: session.user.id,
          },
        },
      )) as { data: unknown; error: unknown };

      if (emailError) {
        throw new Error(
          emailError instanceof Error ? emailError.message : String(emailError),
        );
      }

      // Track last invited email
      lastInvitedEmail.value = parentEmail;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send parent invite";
      error.value = message;
      logger.error("Parent invite error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Send an email invitation via the new /api/family/invite endpoint.
   * Works for both player and parent roles.
   */
  const sendInvite = async ({
    email,
    role,
  }: {
    email: string;
    role: "player" | "parent";
  }): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth("/api/family/invite", {
        method: "POST",
        body: { email, role },
      });
      lastInvitedEmail.value = email;
      const { $posthog } = useNuxtApp();
      $posthog?.capture("family_invite_sent", { method: "email" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send invite";
      error.value = message;
      logger.error("Invite error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    loading,
    error,
    lastInvitedEmail,

    // Actions
    sendInvite,
    sendParentInvite,
  };
};
