import { createClient } from "@supabase/supabase-js";
import { useRuntimeConfig } from "#app";
import { createClientLogger } from "~/utils/logger";

let supabaseClient: ReturnType<typeof createClient> | null = null;

const logger = createClientLogger("useSupabase");

export const useSupabase = () => {
  if (!supabaseClient) {
    // Use Nuxt runtime config
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.supabaseUrl || "";
    const supabaseAnonKey = config.public.supabaseAnonKey || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error("Supabase config missing:", {
        supabaseUrl: supabaseUrl ? "SET" : "MISSING",
        supabaseAnonKey: supabaseAnonKey ? "SET" : "MISSING",
      });
      throw new Error("Supabase configuration is missing");
    }

    // Get service status management functions
    const { markServiceUnavailable, markServiceAvailable } = useServiceStatus();

    // Create custom fetch wrapper to detect service errors
    const customFetch: typeof fetch = async (...args) => {
      try {
        const response = await fetch(...args);

        // Check for server errors (500+)
        if (response.status >= 500) {
          markServiceUnavailable({
            service: 'supabase',
            statusCode: response.status,
            message: response.statusText || 'Server error',
            timestamp: new Date(),
            retryCount: 0,
          });
        } else if (response.ok) {
          // Successful response - mark service as available
          markServiceAvailable();
        }

        return response;
      } catch (err) {
        // Network error - service is unreachable
        markServiceUnavailable({
          service: 'supabase',
          statusCode: 0,
          message: err instanceof Error ? err.message : 'Network error',
          timestamp: new Date(),
          retryCount: 0,
        });
        throw err;
      }
    };

    // Create client with session persistence and custom fetch
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
      global: {
        fetch: customFetch,
      },
    });

    // Handle auth state changes and clear invalid sessions
    if (typeof window !== "undefined") {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        // Clear invalid session tokens to prevent refresh errors
        if (event === "TOKEN_REFRESHED" && !session) {
          logger.warn("Token refresh failed, clearing session");
          void supabaseClient?.auth.signOut();
        }
      });
    }
  }

  return supabaseClient as ReturnType<typeof createClient>;
};
