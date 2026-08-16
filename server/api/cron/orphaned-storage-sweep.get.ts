/**
 * GET /api/cron/orphaned-storage-sweep
 * Weekly sweep that deletes storage objects with no owning DB row. Account
 * deletion (process-account-deletions) removes DB rows but NOT storage, so a
 * deleted user's documents/photos/attachments linger forever — this reclaims
 * them, plus expired one-off export archives.
 *
 * SAFETY — deletes only the unambiguous garbage:
 *   1. Owner-scoped buckets (documents, interaction-attachments,
 *      profile-photos) key every object under a leading `${userId}/` prefix.
 *      An object is deleted only when that user_id no longer exists in `users`.
 *      A live user's objects are never touched, even if a single DB row is
 *      missing — we intentionally do NOT do fragile URL-substring row matching.
 *   2. `exports` bucket holds ephemeral `export_${userId}_${ts}.zip` archives
 *      behind 7-day signed URLs with no DB row — delete anything older than 7d.
 *
 * Run manually with `?dryRun=1` first to see what WOULD be deleted without
 * removing anything.
 *
 * Security: CRON_SECRET via withCronRun (Bearer or x-cron-secret).
 */

import { defineEventHandler, getQuery } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { createLogger } from "~/server/utils/logger";
import { withCronRun } from "~/server/utils/cronRunner";
import { mapWithConcurrency } from "~/server/utils/promisePool";
import type { Database } from "~/types/database";

const logger = createLogger("cron/orphaned-storage-sweep");

const OWNER_SCOPED_BUCKETS = [
  "documents",
  "interaction-attachments",
  "profile-photos",
] as const;

const EXPORTS_BUCKET = "exports";
const EXPORT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const LIST_PAGE_SIZE = 1000;
const REMOVE_BATCH_SIZE = 100;
const USER_LOOKUP_CHUNK = 200;
const REMOVE_CONCURRENCY = 5;

type AdminClient = SupabaseClient<Database>;

interface StorageEntry {
  name: string;
  id: string | null;
  created_at?: string | null;
}

/** List every immediate entry under `prefix`, paging past the size limit. */
async function listPage(
  supabase: AdminClient,
  bucket: string,
  prefix: string,
): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset });
    if (error) {
      logger.error(`Failed to list ${bucket}/${prefix}`, error);
      break;
    }
    if (!data || data.length === 0) break;
    entries.push(...(data as StorageEntry[]));
    if (data.length < LIST_PAGE_SIZE) break;
  }
  return entries;
}

/**
 * Recursively collect every file path under `prefix`. Supabase returns folders
 * as entries with `id === null`; files carry a non-null id.
 */
async function collectFilePaths(
  supabase: AdminClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const entries = await listPage(supabase, bucket, prefix);
  const paths: string[] = [];
  for (const entry of entries) {
    const childPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      paths.push(...(await collectFilePaths(supabase, bucket, childPath)));
    } else {
      paths.push(childPath);
    }
  }
  return paths;
}

/** Which of these user_ids still exist in `users` (chunked to keep .in() small). */
async function findLiveUserIds(
  supabase: AdminClient,
  userIds: string[],
): Promise<Set<string>> {
  const live = new Set<string>();
  for (let i = 0; i < userIds.length; i += USER_LOOKUP_CHUNK) {
    const chunk = userIds.slice(i, i + USER_LOOKUP_CHUNK);
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .in("id", chunk);
    if (error) {
      // Fail SAFE: on a lookup error treat the whole chunk as live so we never
      // delete a live user's objects on a transient DB hiccup.
      logger.error(
        "User existence lookup failed — treating chunk as live",
        error,
      );
      chunk.forEach((id) => live.add(id));
      continue;
    }
    (data ?? []).forEach((row: { id: string }) => live.add(row.id));
  }
  return live;
}

async function removePaths(
  supabase: AdminClient,
  bucket: string,
  paths: string[],
  dryRun: boolean,
): Promise<number> {
  if (dryRun || paths.length === 0) return paths.length;
  const batches: string[][] = [];
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    batches.push(paths.slice(i, i + REMOVE_BATCH_SIZE));
  }
  let removed = 0;
  await mapWithConcurrency(batches, REMOVE_CONCURRENCY, async (batch) => {
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) {
      logger.error(
        `Failed to remove ${batch.length} objects from ${bucket}`,
        error,
      );
    } else {
      removed += batch.length;
    }
  });
  return removed;
}

/** UUID prefixes only — guards against sweeping a stray non-user folder. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sweepOwnerScopedBucket(
  supabase: AdminClient,
  bucket: string,
  dryRun: boolean,
): Promise<{ deadUsers: number; objects: number }> {
  const topLevel = await listPage(supabase, bucket, "");
  const userPrefixes = topLevel
    .filter((e) => e.id === null && UUID_RE.test(e.name))
    .map((e) => e.name);

  if (userPrefixes.length === 0) return { deadUsers: 0, objects: 0 };

  const live = await findLiveUserIds(supabase, userPrefixes);
  const deadPrefixes = userPrefixes.filter((id) => !live.has(id));

  let objects = 0;
  for (const prefix of deadPrefixes) {
    const paths = await collectFilePaths(supabase, bucket, prefix);
    objects += await removePaths(supabase, bucket, paths, dryRun);
  }
  return { deadUsers: deadPrefixes.length, objects };
}

async function sweepExports(
  supabase: AdminClient,
  dryRun: boolean,
): Promise<number> {
  const entries = await listPage(supabase, EXPORTS_BUCKET, "");
  const cutoff = Date.now() - EXPORT_MAX_AGE_MS;
  const expired = entries
    .filter((e) => e.id !== null && e.created_at)
    .filter((e) => new Date(e.created_at as string).getTime() < cutoff)
    .map((e) => e.name);
  return removePaths(supabase, EXPORTS_BUCKET, expired, dryRun);
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "orphaned-storage-sweep", async (ctx) => {
    const query = getQuery(event);
    const dryRun = query.dryRun === "1" || query.dryRun === "true";
    const supabase = useSupabaseAdmin();

    const perBucket: Record<string, { deadUsers: number; objects: number }> =
      {};
    let totalObjects = 0;

    for (const bucket of OWNER_SCOPED_BUCKETS) {
      const res = await sweepOwnerScopedBucket(supabase, bucket, dryRun);
      perBucket[bucket] = res;
      totalObjects += res.objects;
    }

    const expiredExports = await sweepExports(supabase, dryRun);
    totalObjects += expiredExports;

    ctx.setProcessed(totalObjects);
    const result = { dryRun, perBucket, expiredExports, totalObjects };
    logger.info("Orphaned storage sweep complete", result);
    return result;
  }),
);
