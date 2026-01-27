/**
 * Server-side Supabase client creation utility
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

/**
 * Create a server-side Supabase ADMIN client
 * REQUIRES service role key for full admin privileges
 * Use this for all server-side operations
 */
export function createServerSupabaseClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NUXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY - required for all server operations. " +
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

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  // Set user session to enforce RLS policies
  void client.auth.setSession({ access_token: userToken, refresh_token: "" });
  return client;
}

/**
 * Alias for createServerSupabaseClient for convenient access
 * Returns an admin client with full privileges using service role key
 */
export function useSupabaseAdmin(): SupabaseClient<Database> {
  return createServerSupabaseClient();
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
