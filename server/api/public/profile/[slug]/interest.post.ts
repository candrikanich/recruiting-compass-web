/**
 * POST /api/public/profile/[slug]/interest
 *
 * Unauthenticated "Express Interest" lead-capture on the public player
 * profile — a lighter one-tap sibling of Contact Player. Stores the lead in
 * `profile_contacts` (service-role write, no RLS INSERT policy) as
 * `type: 'interest'` and notifies the player in-app + by email. NEVER
 * creates/mutates a coach row from unauthenticated input —
 * `matchCoachByEmail` only matches. The response is always `{ ok: true }` —
 * no player/coach PII ever leaves this endpoint.
 */
import {
  defineEventHandler,
  getRouterParam,
  getRequestIP,
  getRequestHeader,
  getHeader,
  readBody,
  createError,
} from "h3";
import { z } from "zod";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import {
  rateLimitByIp,
  rateLimitByKey,
  throwIfRateLimited,
} from "~/server/utils/rateLimit";
import { verifyTurnstile, isHoneypotTripped } from "~/server/utils/turnstile";
import { matchCoachByEmail } from "~/server/utils/matchCoachByEmail";
import {
  buildInboundInteractionRow,
  insertInboundInteraction,
} from "~/server/utils/inboundInteraction";
import { sendNotificationEmail } from "~/server/utils/emailService";
import type { Database } from "~/types/database";

const HASH_SLUG_RE = /^[a-z0-9]{6}$/;
const VANITY_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

// Loose-but-sufficient IPv4/IPv6 validators for the `profile_contacts.ip`
// `inet` column — a malformed header value must degrade to `null`, never
// fail the insert (a dropped lead is worse than a missing IP).
const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_RE = /^[0-9a-fA-F:]{2,}$/;

function toValidInetOrNull(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (IPV4_RE.test(trimmed)) return trimmed;
  if (trimmed.includes(":") && IPV6_RE.test(trimmed)) return trimmed;
  return null;
}

const interestSchema = z.object({
  program: z.string().trim().min(1).max(80),
  note: z.string().trim().min(1).max(1000).optional(),
  coachName: z.string().trim().min(1).max(120).optional(),
  coachEmail: z.string().trim().email().optional(),
  turnstileToken: z.string().optional(),
  hp: z.string().optional(),
});

type ProfileContactInsert =
  Database["public"]["Tables"]["profile_contacts"]["Insert"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "public/profile/interest");

  try {
    const slug = getRouterParam(event, "slug")!;
    if (!HASH_SLUG_RE.test(slug) && !VANITY_SLUG_RE.test(slug)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }
    // The trusted client IP — Vercel's `x-vercel-forwarded-for` is
    // platform-set and cannot be spoofed by the client, unlike the leftmost
    // value of `X-Forwarded-For`, which h3's `xForwardedFor: true` reads and
    // an attacker can rotate to evade per-IP rate limiting. Falls back to
    // `x-real-ip`, then h3's resolution, for local/non-Vercel environments.
    const clientIp =
      getHeader(event, "x-vercel-forwarded-for") ||
      getHeader(event, "x-real-ip") ||
      getRequestIP(event, { xForwardedFor: true }) ||
      undefined;
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
      ip: clientIp,
    });
    throwIfRateLimited(rateLimitResult);

    throwIfRateLimited(
      await rateLimitByKey(event, `interest:${slug}`, {
        requests: 20,
        window: "1 h",
      }),
    );

    const parsed = interestSchema.safeParse(body);
    if (!parsed.success) {
      throw createError({
        statusCode: 422,
        statusMessage: parsed.error.issues[0]?.message ?? "Invalid request",
      });
    }
    const data = parsed.data;

    const turnstileResult = await verifyTurnstile(data.turnstileToken, {
      ip: clientIp,
      expectedAction: "interest",
    });
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
        statusMessage: "Failed to submit interest",
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
          statusMessage: "Failed to submit interest",
        });
      }
    }
    const profile = profileResult.data;

    if (!profile || !profile.is_published) {
      // Never distinguish "not found" from "unpublished" — both look like a
      // 404 to an unauthenticated caller.
      logger.warn("Interest submitted for unknown/unpublished slug", {
        slug,
      });
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }

    const { coachId: matchedCoachId, schoolId: matchedSchoolId } =
      await matchCoachByEmail(admin, {
        familyUnitId: profile.family_unit_id,
        email: data.coachEmail,
      });

    // `coach_name` is NOT NULL — anonymous interest gets a placeholder.
    const coachLabel = data.coachName ?? "A coach";

    const insertRow: ProfileContactInsert = {
      family_unit_id: profile.family_unit_id,
      player_user_id: profile.user_id,
      type: "interest",
      coach_name: coachLabel,
      coach_email: data.coachEmail ?? null,
      matched_coach_id: matchedCoachId,
      program: data.program,
      note: data.note ?? null,
      ip: toValidInetOrNull(clientIp),
      user_agent: userAgent,
      status: matchedCoachId ? "resolved" : "pending",
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
        statusMessage: "Failed to submit interest",
      });
    }

    // Mint an inbound interaction when the coach matched — a failure here
    // must never fail the response, since the lead is already durably
    // stored.
    let interactionId: string | null = null;
    if (matchedCoachId && matchedSchoolId && profile.user_id) {
      try {
        const created = await insertInboundInteraction(
          admin,
          buildInboundInteractionRow({
            kind: "interest",
            coachId: matchedCoachId,
            schoolId: matchedSchoolId,
            familyUnitId: profile.family_unit_id,
            loggedBy: profile.user_id,
            note: null,
            program: data.program,
            occurredAt: new Date().toISOString(),
          }),
        );
        interactionId = created?.id ?? null;
        if (interactionId) {
          await admin
            .from("profile_contacts")
            .update({ interaction_id: interactionId })
            .eq("id", inserted.id);
        }
      } catch (interErr) {
        logger.warn(
          "Failed to create inbound interaction from matched lead",
          interErr,
        );
      }
    }

    // Notify the player — fire-and-forget-safe: a failure here must never
    // fail the response, since the lead is already durably stored.
    try {
      const { data: user } = await admin
        .from("users")
        .select("email, full_name")
        .eq("id", profile.user_id)
        .maybeSingle();

      const title = "New interest from a coach";
      const message = `${coachLabel} expressed interest in your ${data.program} profile.`;

      const notificationRow: NotificationInsert = {
        user_id: profile.user_id,
        type: "inbound_interaction",
        title,
        message,
        related_entity_type: interactionId ? "interaction" : "profile_contact",
        related_entity_id: interactionId ?? inserted.id,
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
      logger.warn("Failed to notify player of inbound interest", notifyErr);
    }

    logger.info("Public interest submitted", {
      slug,
      ip: clientIp,
      matched: !!matchedCoachId,
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to submit public interest", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to submit interest",
    });
  }
});
