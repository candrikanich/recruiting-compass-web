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
  const user = await supabase.auth.admin.getUserByEmail(email);

  if (user.error) {
    // User not found or error
    return {
      exists: false,
      user: null,
    };
  }

  // Get the user's profile data from the public.users table
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, role, email_confirmed_at")
    .eq("id", user.data.user.id)
    .single();

  return {
    exists: true,
    user: userProfile,
  };
});
