import { ref } from "vue";
import { useSupabase } from "./useSupabase";

/**
 * Composable for managing family invitations
 *
 * Handles sending parent invites via email and linking parents to players using family codes.
 * Includes email validation and family code management.
 *
 * @example
 * const { sendParentInvite, linkParentWithCode } = useFamilyInvite()
 * await sendParentInvite('parent@example.com')
 * const playerData = await linkParentWithCode('FAM-ABC123')
 */
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
        throw emailError;
      }

      // Track last invited email
      lastInvitedEmail.value = parentEmail;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send parent invite";
      error.value = message;
      console.error("Parent invite error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Link parent to player using family code
   * Parent must be authenticated
   * Returns the linked player's user data
   */
  const linkParentWithCode = async (
    familyCode: string,
  ): Promise<Record<string, unknown>> => {
    loading.value = true;
    error.value = null;

    try {
      // Verify parent is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }

      // Normalize family code (add FAM- prefix if missing)
      let normalizedCode = familyCode;
      if (!normalizedCode.startsWith("FAM-")) {
        normalizedCode = `FAM-${familyCode}`;
      }

      // Find user by family code
      const { data: playerUser, error: userError } = (await supabase
        .from("users")
        .select("*")
        .eq("family_code", normalizedCode.toUpperCase())
        .single()) as {
        data: Record<string, unknown> | null;
        error: unknown;
      };

      if (userError || !playerUser) {
        throw new Error("Family code not found");
      }

      // Create account link record to establish parent-player relationship
      const linkData = {
        initiator_user_id: playerUser.id as string,
        parent_user_id: session.user.id,
        invited_email: session.user.email,
        status: "confirmed",
        initiator_role: "player",
      };
      const { error: linkError } = (await (
        supabase.from("account_links") as unknown as {
          insert: (data: typeof linkData) => Promise<{ error: unknown }>;
        }
      ).insert(linkData)) as { error: unknown };

      if (linkError) {
        console.error("Link creation failed (non-blocking):", linkError);
        // Don't throw - link may already exist
      }

      return playerUser;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to link with family code";
      error.value = message;
      console.error("Family link error:", err);
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
    sendParentInvite,
    linkParentWithCode,
  };
};
