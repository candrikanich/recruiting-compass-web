import {
  createClient,
  type RealtimeClientOptions,
  type Session,
} from "@supabase/supabase-js";
import ws from "ws";

/**
 * Mint Supabase auth sessions server-side and write them as Playwright
 * `storageState` files — without driving a browser login.
 *
 * Why this exists: the previous gate captured storageState by automating the
 * real /login UI per account. That click races Vue hydration and piles auth
 * pressure on GoTrue under back-to-back runs; one transient bounce-back to
 * /login aborted the entire suite (no retry). Minting tokens directly via the
 * password grant is deterministic, ~10x faster, and applies no UI timing.
 *
 * The app stores its session in localStorage under `sb-<ref>-auth-token` as a
 * plain-JSON Supabase `Session` object (verified against a real capture), so we
 * reproduce that exact shape.
 */

const realtimeOptions: RealtimeClientOptions = {
  // supabase-js builds a RealtimeClient inside createClient; on Node it needs a
  // WebSocket transport even though we never open a channel.
  transport: ws as unknown as RealtimeClientOptions["transport"],
};

export interface StorageStateFile {
  cookies: never[];
  origins: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[];
}

const getEnv = () => {
  const url =
    process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error(
      "NUXT_PUBLIC_SUPABASE_URL (or TEST_SUPABASE_URL) required to mint auth sessions",
    );
  }
  if (!anonKey) {
    throw new Error(
      "NUXT_PUBLIC_SUPABASE_ANON_KEY required to mint auth sessions",
    );
  }
  return { url, anonKey };
};

/** Derive the Supabase project ref (storageState key segment) from the URL. */
export const getProjectRef = (url: string): string => {
  const host = new URL(url).hostname; // e.g. xpxzhqghxecsjhvklsqg.supabase.co
  const ref = host.split(".")[0];
  if (!ref) throw new Error(`Cannot derive Supabase ref from URL: ${url}`);
  return ref;
};

/**
 * Sign in via the password grant (anon client) and return the raw Session.
 * This is a single fast server-side call — no browser, no navigation.
 */
export const mintSession = async (
  email: string,
  password: string,
): Promise<Session> => {
  const { url, anonKey } = getEnv();
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: realtimeOptions,
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(
      `mintSession failed for ${email}: ${error?.message ?? "no session returned"}`,
    );
  }
  return data.session;
};

/**
 * Build a Playwright storageState object that restores `session` for the app
 * on `baseUrl`. Mirrors the real localStorage entry the Supabase client reads
 * on load (`sb-<ref>-auth-token`).
 */
export const buildStorageState = (
  baseUrl: string,
  ref: string,
  session: Session,
): StorageStateFile => ({
  cookies: [],
  origins: [
    {
      origin: baseUrl,
      localStorage: [
        {
          name: `sb-${ref}-auth-token`,
          value: JSON.stringify(session),
        },
      ],
    },
  ],
});

/**
 * Mint a session for `email`/`password` and return the storageState object
 * ready to write to disk. Throws (caller decides retry/abort) on failure.
 */
export const mintStorageState = async (
  baseUrl: string,
  email: string,
  password: string,
): Promise<StorageStateFile> => {
  const { url } = getEnv();
  const ref = getProjectRef(url);
  const session = await mintSession(email, password);
  return buildStorageState(baseUrl, ref, session);
};
