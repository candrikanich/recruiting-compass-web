import { e as getHeader, f as getCookie, a as createError, c as createLogger } from '../nitro/nitro.mjs';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger();
const roleCache = /* @__PURE__ */ new Map();
async function requireAuth(event) {
  const authHeader = getHeader(event, "authorization");
  let token = (authHeader == null ? void 0 : authHeader.startsWith("Bearer ")) ? authHeader.slice(7) : null;
  if (!token) {
    token = getCookie(event, "sb-access-token") || null;
  }
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized - no token found"
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
      error
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token"
      });
    }
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) {
      throw err;
    }
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication failed"
    });
  }
}
async function getUserRole(userId, supabase) {
  const cached = roleCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.role;
  }
  try {
    const { data, error } = await supabase.from("users").select("role").eq("id", userId).single();
    if (error || !data) {
      logger.error("Failed to fetch user role", error);
      return null;
    }
    const role = typeof data === "object" && data !== null && "role" in data ? data.role : null;
    const cacheEntry = {
      role,
      expiresAt: Date.now() + 5 * 60 * 1e3
    };
    roleCache.set(userId, cacheEntry);
    return role || null;
  } catch (err) {
    return null;
  }
}
async function assertNotParent(userId, supabase) {
  const role = await getUserRole(userId, supabase);
  if (role === "parent") {
    throw createError({
      statusCode: 403,
      statusMessage: "Parents cannot perform this action. This is a read-only view."
    });
  }
}

export { assertNotParent as a, requireAuth as r };
//# sourceMappingURL=auth.mjs.map
