/**
 * GET /api/admin/users/:id
 * Read-only, family-scoped detail view of a single user for admin support
 * tooling. Aggregates account info + (if the user belongs to a family unit)
 * the family's recruiting data: members, pending invitations, athletes,
 * and recent schools/coaches/interactions/offers/events/messages.
 *
 * SELECT-only. No writes. Account fields are a hard allowlist — never
 * select('*') on `users`, never expose PII columns (gpa, date_of_birth,
 * sat_score, act_score, zip_code, hometown_*, guardian_consent_*, etc.).
 *
 * Requires: Authentication header with valid JWT and is_admin: true
 * RESTRICTED: Admins only
 *
 * Response: AdminUserDetail (see ~/types/adminUserDetail)
 */

import type { H3Event } from "h3";
import { defineEventHandler, createError } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "~/server/utils/auth";
import { requireUuidParam } from "~/server/utils/validation";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { logAdminAction } from "~/server/utils/adminAudit";
import { useLogger } from "~/server/utils/logger";
import type { AdminUserDetail } from "~/types/adminUserDetail";

const ACCOUNT_COLUMNS =
  "id, email, full_name, role, is_admin, created_at, graduation_year, current_phase, onboarding_completed, status_label, deletion_requested_at";
const RECENT_LIMIT = 10;

function emptyDetail(
  account: AdminUserDetail["account"],
  familyUnitId: string | null,
): AdminUserDetail {
  return {
    account,
    familyUnitId,
    family: { unit: null, members: [], pendingInvitations: [] },
    athletes: [],
    recruiting: {
      counts: {
        schools: 0,
        coaches: 0,
        interactions: 0,
        offers: 0,
        events: 0,
        messages: 0,
      },
      recentInteractions: [],
      recentOffers: [],
      recentEvents: [],
      recentMessages: [],
    },
  };
}

async function loadUserDetail(
  event: H3Event,
  id: string,
  logger: ReturnType<typeof useLogger>,
): Promise<AdminUserDetail> {
  const db = useSupabaseAdmin();

  const { data: account, error: accountError } = await db
    .from("users")
    .select(ACCOUNT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (accountError) {
    logger.error("Failed to load user for admin detail view", accountError);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load user",
    });
  }
  if (!account) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  const typedAccount = account as unknown as AdminUserDetail["account"];

  const { data: membership, error: membershipError } = await db
    .from("family_members")
    .select("family_unit_id")
    .eq("user_id", id)
    .maybeSingle();

  if (membershipError) {
    logger.error(
      "Failed to load family membership for admin detail view",
      membershipError,
    );
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load user",
    });
  }

  const familyUnitId =
    (membership as { family_unit_id?: string } | null)?.family_unit_id ?? null;

  if (!familyUnitId) {
    logAdminAction(event, {
      action: "view_as.start",
      targetUserId: id,
      meta: { family_unit_id: null },
    });
    return emptyDetail(typedAccount, null);
  }

  // Dynamic table-name lookups below span tables spread across the
  // generated Database schema; the untyped client keeps `.from(table)`
  // usable with a runtime `table: string` instead of a literal union.
  const untypedDb = db as unknown as SupabaseClient;

  const byFamily = (table: string, columns = "*") =>
    untypedDb.from(table).select(columns).eq("family_unit_id", familyUnitId);

  const recent = (table: string, columns = "*") =>
    byFamily(table, columns)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT);

  const countOf = async (table: string): Promise<number> => {
    const { count } = await untypedDb
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("family_unit_id", familyUnitId);
    return count ?? 0;
  };

  const [
    unitResult,
    membersResult,
    invitationsResult,
    athletesResult,
    recentInteractionsResult,
    recentOffersResult,
    recentEventsResult,
    recentMessagesResult,
    schoolsCount,
    coachesCount,
    interactionsCount,
    offersCount,
    eventsCount,
    messagesCount,
  ] = await Promise.all([
    db.from("family_units").select("*").eq("id", familyUnitId).maybeSingle(),
    byFamily("family_members"),
    byFamily("family_invitations"),
    byFamily("player_profiles"),
    recent("interactions"),
    recent("offers"),
    recent("events"),
    recent("athlete_messages"),
    countOf("schools"),
    countOf("coaches"),
    countOf("interactions"),
    countOf("offers"),
    countOf("events"),
    countOf("athlete_messages"),
  ]);

  logAdminAction(event, {
    action: "view_as.start",
    targetUserId: id,
    meta: { family_unit_id: familyUnitId },
  });

  const asRecords = (rows: unknown): Record<string, unknown>[] =>
    (rows as Record<string, unknown>[] | null) ?? [];
  const asRecord = (row: unknown): Record<string, unknown> | null =>
    (row as Record<string, unknown> | null) ?? null;

  const rawMembers = asRecords(membersResult.data) as {
    user_id: string;
    role: string | null;
    family_unit_id: string;
    added_at?: string;
    id?: string;
  }[];

  const memberUserIds = [
    ...new Set(rawMembers.map((m) => m.user_id).filter(Boolean)),
  ];

  let memberUsersById = new Map<
    string,
    { email: string | null; full_name: string | null }
  >();

  if (memberUserIds.length > 0) {
    const { data: memberUsers, error: memberUsersError } = await db
      .from("users")
      .select("id, email, full_name")
      .in("id", memberUserIds);

    if (memberUsersError) {
      logger.error(
        "Failed to load family member accounts for admin detail view",
        memberUsersError,
      );
    } else {
      memberUsersById = new Map(
        (memberUsers ?? []).map((u) => [
          (u as { id: string }).id,
          {
            email: (u as { email: string | null }).email,
            full_name: (u as { full_name: string | null }).full_name,
          },
        ]),
      );
    }
  }

  const members: AdminUserDetail["family"]["members"] = rawMembers.map((m) => {
    const matched = memberUsersById.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role ?? null,
      email: matched?.email ?? null,
      full_name: matched?.full_name ?? null,
    };
  });

  return {
    account: typedAccount,
    familyUnitId,
    family: {
      unit: asRecord(unitResult.data),
      members,
      pendingInvitations: asRecords(invitationsResult.data),
    },
    athletes: asRecords(athletesResult.data),
    recruiting: {
      counts: {
        schools: schoolsCount,
        coaches: coachesCount,
        interactions: interactionsCount,
        offers: offersCount,
        events: eventsCount,
        messages: messagesCount,
      },
      recentInteractions: asRecords(recentInteractionsResult.data),
      recentOffers: asRecords(recentOffersResult.data),
      recentEvents: asRecords(recentEventsResult.data),
      recentMessages: asRecords(recentMessagesResult.data),
    },
  };
}

export default defineEventHandler(async (event): Promise<AdminUserDetail> => {
  const logger = useLogger(event, "admin/users/[id]");

  await requireAdmin(event);
  const id = requireUuidParam(event, "id");

  try {
    return await loadUserDetail(event, id, logger);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) throw error;
    logger.error("Admin user detail endpoint failed", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load user",
    });
  }
});
