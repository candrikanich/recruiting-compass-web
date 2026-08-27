import { createError, readBody, type H3Event } from "h3";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";
import { createServerSupabaseUserClient } from "~/server/utils/supabase";
import { requireAuth } from "~/server/utils/auth";
import { extractRequestToken } from "~/server/utils/requestToken";
import { requireUuidParam } from "~/server/utils/validation";
import { useLogger } from "~/server/utils/logger";

type TableName = keyof Database["public"]["Tables"];

export interface BlockerInfo {
  table: string;
  count: number;
  column: string;
}

/** A child relation that can reference the entity and block its deletion. */
export interface BlockerChild {
  table: TableName;
  column: string;
  /** Human label for the warn log if the count query fails; defaults to `table`. */
  label?: string;
}

export interface DeletionBlockersConfig {
  /** The entity's own table, e.g. `"coaches"`. */
  entityTable: TableName;
  /** Lowercase noun used in user-facing messages, e.g. `"coach"`. */
  entityNoun: string;
  /** Response key carrying the entity id, e.g. `"coachId"`. */
  idKey: string;
  /** Child relations to count; empty means nothing can block deletion. */
  children: BlockerChild[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Shared implementation for `GET /api/<entity>/[id]/deletion-blockers`.
 *
 * Verifies the entity is visible to the caller (RLS-scoped 404 otherwise),
 * counts each configured child relation, and returns the same
 * `{ <idKey>, canDelete, blockers, message }` shape every entity endpoint used
 * to build by hand.
 */
export async function checkDeletionBlockers(
  event: H3Event,
  cfg: DeletionBlockersConfig,
): Promise<{
  canDelete: boolean;
  blockers: BlockerInfo[];
  message: string;
  [key: string]: unknown;
}> {
  const logger = useLogger(event, `${cfg.entityTable}/deletion-blockers`);

  await requireAuth(event);
  const id = requireUuidParam(event, "id");
  const token = extractRequestToken(event);
  // Table and column names are resolved from config at runtime, so the
  // strongly-typed client would narrow query args to `never`. Use an untyped
  // view for these dynamic-relation queries.
  const client = createServerSupabaseUserClient(token) as SupabaseClient;

  // Verify the entity exists and is visible to this user (RLS-scoped). A null
  // row means missing or not owned — return 404 rather than leaking a
  // canDelete verdict for a resource the caller cannot see.
  const { data: row, error: existenceError } = await client
    .from(cfg.entityTable)
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existenceError) {
    logger.error(`Failed to verify ${cfg.entityNoun} existence`, existenceError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to check deletion blockers",
    });
  }
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: `${capitalize(cfg.entityNoun)} not found`,
    });
  }

  const blockers: BlockerInfo[] = [];
  for (const child of cfg.children) {
    const { count, error } = await client
      .from(child.table)
      .select("*", { count: "exact", head: true })
      .eq(child.column, id);
    if (error) {
      logger.warn(
        `Failed to count ${cfg.entityNoun} ${child.label ?? child.table}`,
        error,
      );
    }
    if (count && count > 0) {
      blockers.push({ table: child.table, count, column: child.column });
    }
  }

  const canDelete = blockers.length === 0;
  let message = `${capitalize(cfg.entityNoun)} can be deleted successfully.`;
  if (!canDelete) {
    const blockerList = blockers.map((b) => `${b.count} ${b.table}`).join(", ");
    message = `Cannot delete this ${cfg.entityNoun}. It has: ${blockerList}. Remove these records first.`;
  }

  return { [cfg.idKey]: id, canDelete, blockers, message };
}

const cascadeDeleteSchema = z.object({ confirmDelete: z.boolean().optional() });

/**
 * Parses and enforces the `{ confirmDelete: true }` gate shared by every
 * `POST /api/<entity>/[id]/cascade-delete` endpoint. Throws 400 on an invalid
 * body or when the caller has not confirmed.
 */
export async function requireConfirmDelete(event: H3Event): Promise<void> {
  let body: z.infer<typeof cascadeDeleteSchema>;
  try {
    body = cascadeDeleteSchema.parse(await readBody(event).catch(() => ({})));
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }
  if (!body.confirmDelete) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Must set "confirmDelete": true in request body to proceed',
    });
  }
}
