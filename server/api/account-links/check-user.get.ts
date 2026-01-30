import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const email = getQuery(event).email as string;

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Email is required",
    });
  }

  const supabase = useSupabaseAdmin();

  // Query the auth.users table directly with the admin client
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Failed to list auth users:", authError);
    return {
      exists: false,
      user: null,
    };
  }

  // Find user by email
  const authUser = authUsers?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!authUser) {
    return {
      exists: false,
      user: null,
    };
  }

  // Get the user's profile data from the public.users table
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, email_confirmed_at")
    .eq("id", authUser.id)
    .single();

  return {
    exists: true,
    user: userProfile,
  };
});
