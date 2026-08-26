/**
 * GET /api/player/profile/contacts
 *
 * Authed family inbox for inbound leads captured by the public profile's
 * Contact/Express Interest flows (`profile_contacts`). Family scope is
 * resolved server-side from the requesting user's `family_members` row —
 * never from a client-supplied id. Read-only; never exposes `ip`,
 * `user_agent`, or `family_unit_id`.
 */
import { defineEventHandler, createError } from "h3";
import { requireAuth } from "~/server/utils/auth";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";

const LEADS_LIMIT = 100;

type LeadType = "contact" | "interest";

interface ProfileContactLead {
  id: string;
  type: LeadType;
  coach_name: string;
  coach_email: string | null;
  coach_title: string | null;
  school_name: string | null;
  program: string | null;
  note: string | null;
  matched_coach_id: string | null;
  created_at: string;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "player/profile/contacts");
  try {
    const { id: userId } = await requireAuth(event);
    const supabase = useSupabaseAdmin();

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id")
      .eq("user_id", userId)
      .single();

    if (!membership) {
      throw createError({
        statusCode: 403,
        statusMessage: "Not a family member",
      });
    }
    const familyUnitId = membership.family_unit_id;

    const { data: leads, error: leadsError } = await supabase
      .from("profile_contacts")
      .select(
        "id, type, coach_name, coach_email, coach_title, school_name, program, note, matched_coach_id, created_at",
      )
      .eq("family_unit_id", familyUnitId)
      .order("created_at", { ascending: false })
      .limit(LEADS_LIMIT);

    if (leadsError) {
      logger.error("Failed to fetch profile_contacts leads", leadsError);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to load inbound leads",
      });
    }

    // UTC month boundary — local getFullYear() has bitten us before (see
    // MEMORY: web TZ bugs) and would silently shift the window near midnight.
    const now = new Date();
    const monthStartIso = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();

    // Explicit per-type count query rather than deriving from `leads` — stays
    // correct once inbound volume exceeds the fixed LEADS_LIMIT cap.
    const [{ count: interestThisMonth }, { count: contactThisMonth }] =
      await Promise.all([
        supabase
          .from("profile_contacts")
          .select("*", { count: "exact", head: true })
          .eq("family_unit_id", familyUnitId)
          .eq("type", "interest")
          .gte("created_at", monthStartIso),
        supabase
          .from("profile_contacts")
          .select("*", { count: "exact", head: true })
          .eq("family_unit_id", familyUnitId)
          .eq("type", "contact")
          .gte("created_at", monthStartIso),
      ]);

    return {
      leads: (leads ?? []) as ProfileContactLead[],
      counts: {
        interestThisMonth: interestThisMonth ?? 0,
        contactThisMonth: contactThisMonth ?? 0,
        totalThisMonth: (interestThisMonth ?? 0) + (contactThisMonth ?? 0),
      },
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("Failed to load inbound leads", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load inbound leads",
    });
  }
});
