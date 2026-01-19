export default defineNuxtRouteMiddleware(async (to, from) => {
  const userStore = useUserStore();

  // Initialize user store if not already done
  if (!userStore.user && !userStore.loading && process.client) {
    await userStore.initializeUser();
  }

  // For now, allow all access (no auth guards yet)
  // This will be updated later to protect routes
});
