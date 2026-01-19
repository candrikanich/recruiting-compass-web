import { createClient } from '@supabase/supabase-js';

function createServerSupabaseClient() {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    throw new Error("Missing NUXT_PUBLIC_SUPABASE_URL environment variable");
  }
  if (!supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY - required for all server operations. Set this environment variable in your deployment configuration."
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export { createServerSupabaseClient as c };
//# sourceMappingURL=supabase.mjs.map
