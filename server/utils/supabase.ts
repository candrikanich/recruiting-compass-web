/**
 * Server-side Supabase client creation utility
 */

import {
  createClient,
  type SupabaseClient,
  type RealtimeClientOptions,
} from "@supabase/supabase-js";
import ws from "ws";
import type { Database } from "~/types/database";

/**
 * supabase-js eagerly constructs a RealtimeClient inside createClient. On
 * Node < 22 (no native global WebSocket) that constructor throws unless a
 * transport is supplied. Server code never opens realtime subscriptions, but
 * we still must hand it a WebSocket implementation so the client can be built.
 */
const realtimeOptions: RealtimeClientOptions = {
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

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

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    realtime: realtimeOptions,
  });
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
    realtime: realtimeOptions,
  });
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
