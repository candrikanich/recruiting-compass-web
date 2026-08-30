/**
 * Public-profile read path: authoritative publish check + two-tier cache
 * of the assembled payload.
 *
 * Hot path for a published profile:
 *   1. Indexed player_profiles lookup (is_published is never served stale)
 *   2. L1 Redis / L2 cache_snapshots of the assembled JSON
 *   3. Origin fan-out (users, prefs, schools, film, metrics) on miss
 *
 * Unpublish is always 410 on the next request because step 1 is uncached.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicProfileData, VideoLink } from "~/types/models";
import { createServerSupabaseClient } from "~/server/utils/supabase";
import { redis } from "~/server/utils/redis";
import { createLogger } from "~/server/utils/logger";
import {
  assemblePublicProfile,
  type AssemblePublicProfileInput,
} from "~/server/utils/publicProfileAssemble";
import {
  resolveSections,
  isSectionVisible,
} from "~/utils/profile/sectionConfig";
import {
  computeEtag,
  fillCache,
  invalidateCache,
  l1Get,
  l2Get,
  singleflight,
  type CacheEnvelope,
  type CacheSource,
  type KvCache,
  type SnapshotStore,
} from "~/server/utils/readThroughCache";

export const PUBLIC_PROFILE_CACHE = {
  namespace: "public_profile",
  l1TtlSeconds: 60,
  l2TtlSeconds: 300,
} as const;

export function publicProfileCacheKey(userId: string): string {
  return `pubprof:v1:${userId}`;
}

export type PublicProfileRead =
  | {
      kind: "ok";
      data: PublicProfileData;
      etag: string;
      source: CacheSource;
    }
  | { kind: "not_found" }
  | { kind: "gone" };

export interface PublicProfileReadDeps {
  supabase: SupabaseClient;
  redis: KvCache | null;
  snapshot: SnapshotStore<PublicProfileData> | null;
}

const logger = createLogger("publicProfileRead");

function createPostgresSnapshot(
  supabase: SupabaseClient,
): SnapshotStore<PublicProfileData> {
  const untyped = supabase as unknown as SupabaseClient;
  return {
    async get(key) {
      const { data, error } = await untyped
        .from("cache_snapshots")
        .select("payload, etag, expires_at")
        .eq("cache_key", key)
        .maybeSingle();
      if (error || !data) return null;
      const row = data as {
        payload: PublicProfileData;
        etag: string;
        expires_at: string;
      };
      return row;
    },
    async put(key, namespace, payload, etag, ttlSeconds) {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      const { error } = await untyped.from("cache_snapshots").upsert(
        {
          cache_key: key,
          namespace,
          payload,
          etag,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );
      if (error) throw error;
    },
    async del(keys) {
      const { error } = await untyped
        .from("cache_snapshots")
        .delete()
        .in("cache_key", keys);
      if (error) throw error;
    },
  };
}

function defaultDeps(): PublicProfileReadDeps {
  const supabase = createServerSupabaseClient();
  return {
    supabase,
    redis: redis as KvCache | null,
    snapshot: createPostgresSnapshot(supabase),
  };
}

async function resolveProfileRow(
  supabase: SupabaseClient,
  slug: string,
): Promise<Record<string, unknown> | null> {
  let result = await supabase
    .from("player_profiles")
    .select("*")
    .eq("hash_slug", slug)
    .maybeSingle();
  if (result.error) {
    logger.error("Failed to query player_profiles by hash_slug", result.error);
    throw result.error;
  }
  if (!result.data) {
    result = await supabase
      .from("player_profiles")
      .select("*")
      .eq("vanity_slug", slug)
      .maybeSingle();
    if (result.error) {
      logger.error(
        "Failed to query player_profiles by vanity_slug",
        result.error,
      );
      throw result.error;
    }
  }
  return result.data as Record<string, unknown> | null;
}

export async function loadPublicProfileOrigin(
  supabase: SupabaseClient,
  profile: Record<string, unknown>,
): Promise<PublicProfileData> {
  const userId = profile.user_id as string;
  const familyUnitId = profile.family_unit_id as string;
  const typedProfile =
    profile as unknown as AssemblePublicProfileInput["profile"];
  const sections = resolveSections(typedProfile);

  const { data: user } = await supabase
    .from("users")
    .select("full_name, profile_photo_url")
    .eq("id", userId)
    .maybeSingle();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("data")
    .eq("user_id", userId)
    .eq("category", "player")
    .maybeSingle();
  const details: Record<string, unknown> | null =
    (prefs?.data as Record<string, unknown>) ?? null;

  let schools: Array<{ id: string; name: string }> | null = null;
  if (profile.show_schools) {
    const { data } = await supabase
      .from("schools")
      .select("id, name")
      .eq("family_unit_id", familyUnitId);
    schools = data ?? null;
  }

  let videoLinks: VideoLink[] | null = null;
  if (isSectionVisible(sections, "film")) {
    const { data } = await supabase
      .from("video_links")
      .select("platform, url, title")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    videoLinks = (data ?? []).map((row) => ({
      platform: row.platform,
      url: row.url,
      title: row.title ?? undefined,
    })) as VideoLink[];
  }

  let metricsRows: AssemblePublicProfileInput["metricsRows"] = [];
  if (isSectionVisible(sections, "metrics")) {
    const { data } = await supabase
      .from("performance_metrics")
      .select(
        "metric_type, display_value, value, unit, verified, is_primary, created_at",
      )
      .eq("user_id", userId);
    metricsRows = data ?? [];
  }

  let committedSchoolName: string | null = null;
  if (profile.committed_school_id) {
    const { data } = await supabase
      .from("schools")
      .select("name")
      .eq("id", profile.committed_school_id as string)
      .maybeSingle();
    committedSchoolName = data?.name ?? null;
  }

  return assemblePublicProfile({
    profile: typedProfile,
    user,
    details,
    metricsRows,
    videoLinks,
    schools,
    committedSchoolName,
  });
}

async function lookupCachedPayload(
  key: string,
  deps: PublicProfileReadDeps,
): Promise<{
  envelope: CacheEnvelope<PublicProfileData>;
  source: CacheSource;
} | null> {
  const l1 = await l1Get<PublicProfileData>(deps.redis, key);
  if (l1) return { envelope: l1, source: "l1" };

  const l2 = await l2Get(deps.snapshot, key);
  if (l2) {
    await fillCache({
      keys: [key],
      namespace: PUBLIC_PROFILE_CACHE.namespace,
      envelope: l2,
      l1TtlSeconds: PUBLIC_PROFILE_CACHE.l1TtlSeconds,
      l2TtlSeconds: PUBLIC_PROFILE_CACHE.l2TtlSeconds,
      redis: deps.redis,
      snapshot: null,
    });
    return { envelope: l2, source: "l2" };
  }
  return null;
}

export async function getPublicProfile(
  slug: string,
  deps: PublicProfileReadDeps = defaultDeps(),
): Promise<PublicProfileRead> {
  const profile = await resolveProfileRow(deps.supabase, slug);
  if (!profile) return { kind: "not_found" };

  const userId = profile.user_id as string;
  const key = publicProfileCacheKey(userId);

  if (!profile.is_published) {
    await invalidateCache({
      keys: [key],
      redis: deps.redis,
      snapshot: deps.snapshot,
    });
    return { kind: "gone" };
  }

  const hit = await lookupCachedPayload(key, deps);
  if (hit) {
    return {
      kind: "ok",
      data: hit.envelope.data,
      etag: hit.envelope.etag,
      source: hit.source,
    };
  }

  return singleflight(key, async () => {
    const raced = await lookupCachedPayload(key, deps);
    if (raced) {
      return {
        kind: "ok" as const,
        data: raced.envelope.data,
        etag: raced.envelope.etag,
        source: raced.source,
      };
    }

    const data = await loadPublicProfileOrigin(deps.supabase, profile);
    const envelope: CacheEnvelope<PublicProfileData> = {
      data,
      etag: computeEtag(data),
    };
    await fillCache({
      keys: [key],
      namespace: PUBLIC_PROFILE_CACHE.namespace,
      envelope,
      l1TtlSeconds: PUBLIC_PROFILE_CACHE.l1TtlSeconds,
      l2TtlSeconds: PUBLIC_PROFILE_CACHE.l2TtlSeconds,
      redis: deps.redis,
      snapshot: deps.snapshot,
    });
    return { kind: "ok" as const, data, etag: envelope.etag, source: "origin" };
  });
}

export async function invalidatePublicProfileForUser(
  userId: string,
  deps?: Pick<PublicProfileReadDeps, "redis" | "snapshot" | "supabase">,
): Promise<void> {
  const resolved = deps ?? defaultDeps();
  await invalidateCache({
    keys: [publicProfileCacheKey(userId)],
    redis: resolved.redis,
    snapshot: resolved.snapshot,
  });
}
