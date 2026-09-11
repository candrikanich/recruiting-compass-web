import { resetAppState } from "~/composables/useAuthLifecycle";
import { useAccountProvisioning } from "~/composables/useAccountProvisioning";

export default defineNuxtPlugin(() => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN") {
      userStore.initializeUser().then(() => {
        // Fires for every session-establishing event, not just an explicit
        // /login submit — including landing on "/" via Supabase's own
        // email-confirmation link, which used to skip this entirely.
        if (session?.user) {
          useAccountProvisioning().ensureAccountProvisioned(session.user);
        }
      });
    }
    if (event === "SIGNED_OUT") {
      // Backstop: any code path that calls supabase.auth.signOut() directly
      // (rather than through useAuthLifecycle().logoutEverywhere()) still
      // gets every domain store + family context reset. Idempotent with the
      // orchestrator's own reset.
      userStore.logout();
      resetAppState();
    }
  });
});
