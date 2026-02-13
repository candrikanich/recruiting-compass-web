/**
 * Authentication and authorization utilities for server routes
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createError, getCookie, getHeader, type H3Event } from "h3";
import type { Database } from "~/types/database";
import { createLogger } from "./logger";

const logger = createLogger("auth");

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

/**
 * In-memory cache for user roles with TTL (5 minutes)
 * Reduces database queries for repeated role checks
 */
interface CachedRole {
  role: UserRole | null;
  expiresAt: number;
}

const roleCache = new Map<string, CachedRole>();

/**
 * User role type
 */
export type UserRole = "parent" | "player";

/**
 * Extracts and verifies user from request
 * Supports both Authorization header (Bearer token) and cookies
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const authHeader = getHeader(event, "authorization");
  let token: string | null = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    token = getCookie(event, "sb-access-token") || null;
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized - no token found",
    });
  }

  try {
    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token",
      });
    }

    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    logger.error("Authentication failed", err);
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication failed",
    });
  }
}

/**
 * Gets user's role from database with caching (5 minute TTL)
 */
export async function getUserRole(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<UserRole | null> {
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    logger.info(`Role cache hit for user ${userId}`);
    return cached.role;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      logger.error("Failed to fetch user role", {
        error,
        userId,
        errorMessage: error?.message,
        errorCode: error?.code,
      });
      return null;
    }

    // Type guard to safely access role property
    const role =
      typeof data === "object" && data !== null && "role" in data
        ? (data as { role: UserRole | null }).role
        : null;

    // Cache for 5 minutes
    const cacheEntry: CachedRole = {
      role,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    roleCache.set(userId, cacheEntry);

    return role || null;
  } catch (err) {
    logger.error("Error fetching user role", err);
    return null;
  }
}

/**
 * Checks if parent has permission to view/manage athlete data
 * Parents can only access their linked athletes' data
 */
export async function isParentViewingLinkedAthlete(
  parentUserId: string,
  athleteUserId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  try {
    // Check if there's a verified account link
    const { data, error } = await supabase
      .from("account_links")
      .select("id")
      .eq("parent_user_id", parentUserId)
      .eq("athlete_id", athleteUserId)
      .eq("status", "verified")
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch (err) {
    logger.error("Error checking parent-athlete link", err);
    return false;
  }
}

/**
 * Validates that user has appropriate role/permissions for mutation operation
 * - Athletes can perform mutations on their own data
 * - Parents can only view (read) linked athlete data, not mutate
 * - Returns true if operation is allowed
 */
export async function canMutateAthleteData(
  requestingUserId: string,
  targetAthleteUserId: string,
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  // Athletes can always mutate their own data
  if (requestingUserId === targetAthleteUserId) {
    return true;
  }

  // Parents cannot mutate any athlete data, only view
  const role = await getUserRole(requestingUserId, supabase);
  if (role === "parent") {
    return false;
  }

  // Other cases (cross-user mutations) are not allowed
  return false;
}

/**
 * Asserts that user is not a parent (parents cannot perform mutations)
 * Throws 403 error if user is a parent
 */
export async function assertNotParent(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const role = await getUserRole(userId, supabase);

  if (role === "parent") {
    throw createError({
      statusCode: 403,
      statusMessage:
        "Parents cannot perform this action. This is a read-only view.",
    });
  }
}
