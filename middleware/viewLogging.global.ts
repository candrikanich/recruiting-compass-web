/**
 * Global middleware for automatic parent view logging
 *
 * Automatically logs when parents navigate to pages containing athlete data.
 *
 * Flow:
 * 1. Check if user is a parent
 * 2. Get linked athlete ID
 * 3. Determine item type from route
 * 4. Extract item ID from route params
 * 5. Log the view
 *
 * Failures are silent to avoid breaking navigation
 */
export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Only run on client
  if (process.server) return;

  try {
    // Try to get the stores safely
    let userStore, linkedAccounts;
    try {
      userStore = useUserStore();
      const { linkedAccounts: la } = useAccountLinks();
      linkedAccounts = la;
    } catch {
      // Store not ready yet, skip logging
      return;
    }

    // Only log for parents
    if (userStore.user?.role !== "parent") return;

    const { logParentView } = useViewLogging();

    // Only log for parents
    if (userStore.user?.role !== "parent") return;

    // Get linked athlete
    const linkedAthlete = linkedAccounts.value.find(
      (acc) => acc.relationship === "student",
    );
    if (!linkedAthlete) return;

    // Determine item type from route
    const itemType = determineItemType(to.path);
    if (!itemType) return;

    // Extract item ID from route params
    const itemId = to.params.id as string | undefined;

    // Log the view (errors handled silently)
    await logParentView(itemType, linkedAthlete.user_id, itemId);
  } catch (error) {
    // Silently fail - don't break navigation if view logging fails
    console.debug(
      "[viewLogging middleware]",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

/**
 * Determine the type of item being viewed from the route path
 *
 * Maps routes to item types that are logged
 */
function determineItemType(path: string): string | null {
  if (path.startsWith("/schools")) return "school";
  if (path.startsWith("/coaches")) return "coach";
  if (path.startsWith("/interactions")) return "interaction";
  if (path.startsWith("/events")) return "event";
  if (path.startsWith("/timeline")) return "timeline";
  if (path.startsWith("/performance")) return "performance";
  if (path === "/dashboard") return "dashboard";
  return null;
}
