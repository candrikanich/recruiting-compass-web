import { createClient } from "@supabase/supabase-js";
import { useRuntimeConfig } from "#app";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const useSupabase = () => {
  if (!supabaseClient) {
    // Use Nuxt runtime config
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.supabaseUrl || "";
    const supabaseAnonKey = config.public.supabaseAnonKey || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase config missing:", {
        supabaseUrl: supabaseUrl ? "SET" : "MISSING",
        supabaseAnonKey: supabaseAnonKey ? "SET" : "MISSING",
      });
      throw new Error("Supabase configuration is missing");
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient as ReturnType<typeof createClient>;
};
