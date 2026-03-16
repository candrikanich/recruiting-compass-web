export default defineNuxtPlugin(() => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      userStore.initializeUser();
    }
    if (event === "SIGNED_OUT") {
      userStore.logout();
    }
  });
});
