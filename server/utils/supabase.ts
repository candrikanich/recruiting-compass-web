/**
 * Server-side Supabase client creation utility
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

/**
 * Which Supabase project an admin request targets.
 * "prod" is whatever this deployment's native env vars point at (the usual case).
 * "qa" explicitly targets the QA/staging project via its _QA-suffixed vars, regardless
 * of which environment (Production/Preview) is currently running — lets the admin panel
 * reach QA data from the prod deployment. Only wired for admin user-management endpoints.
 */
export type AdminDbEnv = "prod" | "qa";

/**
 * Create a server-side Supabase ADMIN client
 * REQUIRES service role key for full admin privileges
 * Use this for all server-side operations
 *
 * @param env - "qa" reads NUXT_PUBLIC_SUPABASE_URL_QA / SUPABASE_SERVICE_ROLE_KEY_QA instead
 *   of the deployment's native vars. Defaults to "prod" (native vars) for every existing caller.
 */
export function createServerSupabaseClient(
  env: AdminDbEnv = "prod",
): SupabaseClient<Database> {
  const supabaseUrl =
    env === "qa"
      ? process.env.NUXT_PUBLIC_SUPABASE_URL_QA
      : process.env.NUXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    env === "qa"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY_QA
      : process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      env === "qa"
        ? "Missing NUXT_PUBLIC_SUPABASE_URL_QA environment variable"
        : "Missing NUXT_PUBLIC_SUPABASE_URL environment variable",
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      env === "qa"
        ? "Missing SUPABASE_SERVICE_ROLE_KEY_QA - required to reach the QA project from this deployment."
        : "Missing SUPABASE_SERVICE_ROLE_KEY - required for all server operations. " +
            "Set this environment variable in your deployment configuration.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Create a server-side Supabase client with user session
 * Use this for operations that should respect user RLS policies
 * @param userToken - JWT token from authenticated user
 */
export function createServerSupabaseUserClient(
  userToken: string,
): SupabaseClient<Database> {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration (URL or anon key)");
  }

  // Pass JWT via global headers — synchronous, ensures every query uses the user's auth context
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  });
}

/**
 * Alias for createServerSupabaseClient for convenient access
 * Returns an admin client with full privileges using service role key
 */
export function useSupabaseAdmin(
  env: AdminDbEnv = "prod",
): SupabaseClient<Database> {
  return createServerSupabaseClient(env);
}

/**
 * Wraps a promise with a timeout
 * Rejects if the promise doesn't resolve within the specified time
 * Performance optimization: Prevents long-running queries from blocking the application
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 5000,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms),
    ),
  ]);
}
