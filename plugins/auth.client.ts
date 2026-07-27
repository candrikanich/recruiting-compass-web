import { resetAppState } from "~/composables/useAuthLifecycle";

export default defineNuxtPlugin(() => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      userStore.initializeUser();
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
