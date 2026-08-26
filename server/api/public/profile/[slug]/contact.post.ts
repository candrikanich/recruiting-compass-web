/**
 * POST /api/public/profile/[slug]/contact
 *
 * Unauthenticated "Contact Player" lead-capture on the public player profile.
 * A coach/visitor submits a lightweight form; this endpoint stores the lead in
 * `profile_contacts` (service-role write, no RLS INSERT policy) and notifies
 * the player in-app + by email. NEVER creates/mutates a coach or school row
 * from unauthenticated input — `matchCoachByEmail` only matches, `school_id`
 * is only set when a real school row is supplied, `school_name` free-texts
 * the rest. The response is always `{ ok: true }` — no player/coach PII ever
 * leaves this endpoint.
 */
import {
  defineEventHandler,
  getRouterParam,
  getRequestIP,
  getRequestHeader,
  readBody,
  createError,
} from "h3";
import { z } from "zod";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { rateLimitByIp, throwIfRateLimited } from "~/server/utils/rateLimit";
import { verifyTurnstile, isHoneypotTripped } from "~/server/utils/turnstile";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";
import { sendNotificationEmail } from "~/server/utils/emailService";
import type { Database } from "~/types/database";

const HASH_SLUG_RE = /^[a-z0-9]{6}$/;
const VANITY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const contactSchema = z.object({
  coachName: z.string().trim().min(1).max(120),
  coachEmail: z.string().trim().email().optional(),
  coachTitle: z.string().trim().max(80).optional(),
  schoolId: z.string().trim().uuid().optional(),
  schoolName: z.string().trim().max(120).optional(),
  note: z.string().trim().min(1).max(2000),
  turnstileToken: z.string().optional(),
  hp: z.string().optional(),
});

type ProfileContactInsert =
  Database["public"]["Tables"]["profile_contacts"]["Insert"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile/contact");

  try {
    const slug = getRouterParam(event, "slug")!;
    if (!HASH_SLUG_RE.test(slug) && !VANITY_SLUG_RE.test(slug)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? null;
    const rawUserAgent = getRequestHeader(event, "user-agent") ?? null;
    const userAgent = rawUserAgent ? rawUserAgent.slice(0, 512) : null;

    const body = await readBody(event);

    // Honeypot: silent success, no insert, no notify. Cheapest check first.
    if (isHoneypotTripped((body as { hp?: unknown })?.hp)) {
      logger.info("Honeypot tripped, silently discarding", { slug });
      return { ok: true };
    }

    const rateLimitResult = await rateLimitByIp(event, {
      requests: 5,
      window: "10 m",
    });
    // TODO(per-slug rate limit): rateLimit.ts only exports rateLimitByIp/
    // rateLimitByUser (keyed internally). A per-slug limiter (key
    // `contact:<slug>`) would blunt targeting a single athlete but needs a
    // small addition to rateLimit.ts (exported rateLimitByKey) — deferring;
    // per-IP is the must-have guard and is in place.
    throwIfRateLimited(rateLimitResult);

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }
    const data = parsed.data;

    const turnstileResult = await verifyTurnstile(data.turnstileToken, ip ?? undefined);
    if (turnstileResult.reason === "disabled") {
      logger.warn(
        "Turnstile verification disabled (no secret key configured) — relying on honeypot + rate limit only",
      );
    }
    if (!turnstileResult.ok) {
      throw createError({
        statusCode: 403,
        statusMessage: "Verification failed",
      });
    }

    const admin = useSupabaseAdmin();

    // Resolve by hash_slug first, then vanity_slug — mirrors [slug].get.ts.
    let profileResult = await admin
      .from("player_profiles")
      .select("id, family_unit_id, user_id, is_published")
      .eq("hash_slug", slug)
      .maybeSingle();
    if (profileResult.error) {
      logger.error(
        "Failed to query player_profiles by hash_slug",
        profileResult.error,
      );
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to submit contact",
      });
    }
    if (!profileResult.data) {
      profileResult = await admin
        .from("player_profiles")
        .select("id, family_unit_id, user_id, is_published")
        .eq("vanity_slug", slug)
        .maybeSingle();
      if (profileResult.error) {
        logger.error(
          "Failed to query player_profiles by vanity_slug",
          profileResult.error,
        );
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to submit contact",
        });
      }
    }
    const profile = profileResult.data;

    if (!profile || !profile.is_published) {
      // Never distinguish "not found" from "unpublished" — both look like a
      // 404 to an unauthenticated caller.
      logger.warn("Contact submitted for unknown/unpublished slug", { slug });
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    const { coachId: matchedCoachId } = await matchCoachByEmail(admin, {
      familyUnitId: profile.family_unit_id,
      email: data.coachEmail,
    });

    // Defensive re-verification: a well-formed schoolId that doesn't exist
    // or belongs to another family must never reach the insert — the FK
    // would 500 the submission (nonexistent) or link an attacker-supplied
    // schoolId to someone else's school (cross-family leak). Falls back to
    // null; school_name still free-texts the lead.
    let verifiedSchoolId: string | null = null;
    if (data.schoolId && UUID_RE.test(data.schoolId)) {
      const { data: schoolRow, error: schoolError } = await admin
        .from("schools")
        .select("id")
        .eq("id", data.schoolId)
        .eq("family_unit_id", profile.family_unit_id)
        .maybeSingle();
      if (schoolError) {
        logger.warn("Failed to verify supplied schoolId", schoolError);
      } else if (schoolRow) {
        verifiedSchoolId = schoolRow.id;
      }
    }

    const insertRow: ProfileContactInsert = {
      family_unit_id: profile.family_unit_id,
      player_user_id: profile.user_id,
      type: "contact",
      coach_name: data.coachName,
      coach_email: data.coachEmail ?? null,
      coach_title: data.coachTitle ?? null,
      matched_coach_id: matchedCoachId,
      school_id: verifiedSchoolId,
      school_name: data.schoolName ?? null,
      note: data.note,
      ip,
      user_agent: userAgent,
    };

    const { data: inserted, error: insertError } = await admin
      .from("profile_contacts")
      .insert(insertRow)
      .select("id")
      .single();

    if (insertError || !inserted) {
      logger.error("Failed to insert profile_contacts row", insertError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to submit contact",
      });
    }

    // Notify the player — fire-and-forget-safe: a failure here must never
    // fail the response, since the lead is already durably stored.
    try {
      const { data: user } = await admin
        .from("users")
        .select("email, full_name")
        .eq("id", profile.user_id)
        .maybeSingle();

      const coachLabel = data.coachName;
      const schoolLabel = data.schoolName ? ` from ${data.schoolName}` : "";
      const title = "New contact from a coach";
      const message = `${coachLabel}${schoolLabel} reached out through your public profile.`;

      const notificationRow: NotificationInsert = {
        user_id: profile.user_id,
        type: "inbound_interaction",
        title,
        message,
        related_entity_type: "profile_contact",
        related_entity_id: inserted.id,
        scheduled_for: new Date().toISOString(),
      };
      const { error: notifyError } = await admin
        .from("notifications")
        .insert(notificationRow);
      if (notifyError) {
        logger.warn("Failed to insert notification row", notifyError);
      }

      if (user?.email) {
        await sendNotificationEmail({
          to: user.email,
          subject: title,
          title,
          message,
          priority: "normal",
        });
      }
    } catch (notifyErr) {
      logger.warn("Failed to notify player of inbound contact", notifyErr);
    }

    logger.info("Public contact submitted", {
      slug,
      ip,
      matched: !!matchedCoachId,
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to submit public contact", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to submit contact",
    });
  }
});
