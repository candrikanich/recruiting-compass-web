export default defineNuxtPlugin(async () => {
  // Initialize user store on app startup
  if (process.client) {
    const userStore = useUserStore();
    const { restoreSession } = useAuth();

    try {
      // First restore any existing auth session
      const session = await restoreSession();

      // Then initialize the user store with that session data
      if (session?.user && !userStore.user) {
        await userStore.initializeUser();
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
    }
  }
});
