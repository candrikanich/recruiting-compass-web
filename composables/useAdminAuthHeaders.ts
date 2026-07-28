import { useSupabase } from "~/composables/useSupabase";

/**
 * Shared helper for admin composables that hit `/api/admin/*` endpoints
 * directly via `fetch` (rather than `$fetchAuth`) and need a bearer token.
 */
export function useAdminAuthHeaders() {
  const supabase = useSupabase();

  async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }

  return { getAuthHeaders };
}
