import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";
import {
  resolveVariables,
  renderTemplate,
  findUnresolved,
  renderEventSchedule,
  nextEvent,
  type RegistryVar,
  type ResolverContext,
  type Row,
  type MetricRow,
  type EventLite,
} from "~/utils/templateResolver";
import {
  formatPositionsShort,
  primaryAndSecondary,
  abbreviatePosition,
} from "~/utils/positions/canonical";
import type { CommunicationTemplate } from "~/types/models";

const logger = createClientLogger("useTemplateResolver");

/** PostgREST-ish error shape (avoids `any` while matching the house PGRST205 check). */
interface FetchError {
  code?: string;
  message?: string;
}

/** template_variables is global reference data — cache it once per page load. */
let registryCache: RegistryVar[] | null = null;

/** Test-only: clear the module-level registry cache between cases. */
export const __resetTemplateRegistryCache = (): void => {
  registryCache = null;
};

const GRADE_WORDS: Record<number, string> = { 12: "twelfth", 11: "eleventh", 10: "tenth", 9: "ninth" };

export interface ResolveResult {
  subject: string;
  body: string;
  /** Variables still unfilled after render — the send-blocking check. */
  unresolved: string[];
  /** The resolved {{key}} -> value map used for this render (drives the variables panel). */
  values: Record<string, string>;
}

/** Current HS grade (9–12) from graduation year, accounting for fall vs spring semester. */
const currentGrade = (gradYear: number | null | undefined, now = new Date()): number | null => {
  if (!gradYear) return null;
  const schoolYearEnd = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
  return 12 - (gradYear - schoolYearEnd);
};

/** Grade-appropriate HS coach from the player jsonb, else most-recent (12th→9th). */
const pickHsCoach = (prefs: Record<string, unknown>, gradYear: number | null | undefined): string | null => {
  const grade = currentGrade(gradYear);
  const clamped = grade != null ? Math.min(12, Math.max(9, grade)) : null;
  const fallback = [12, 11, 10, 9];
  const order = clamped != null ? [clamped, ...fallback.filter((g) => g !== clamped)] : fallback;
  for (const g of order) {
    const v = prefs[`${GRADE_WORDS[g]}_grade_coach`];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
};

export const useTemplateResolver = () => {
  const supabase = useSupabase();

  const loadRegistry = async (force = false): Promise<RegistryVar[]> => {
    if (registryCache && !force) return registryCache;
    try {
      const { data, error } = (await supabase
        .from("template_variables")
        .select("key, source_type, source_path, category")) as { data: RegistryVar[] | null; error: FetchError | null };

      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("template_variables")) {
          return registryCache ?? [];
        }
        throw error;
      }
      registryCache = data ?? [];
      return registryCache;
    } catch (err) {
      logger.error("Load registry error:", err);
      return registryCache ?? [];
    }
  };

  const buildAthleteContext = async (athleteUserId: string): Promise<ResolverContext> => {
    const ctx: ResolverContext = { tables: {}, prefs: {}, metrics: [], derived: {} };
    const derived: Record<string, string> = {};

    try {
      const { data: userRow } = (await supabase
        .from("users")
        .select("*")
        .eq("id", athleteUserId)
        .maybeSingle()) as { data: Row | null };
      if (userRow) ctx.tables!.users = userRow;

      const { data: prefRow } = (await supabase
        .from("user_preferences")
        .select("data")
        .eq("user_id", athleteUserId)
        .eq("category", "player")
        .maybeSingle()) as { data: { data: Record<string, unknown> | null } | null };
      ctx.prefs = prefRow?.data ?? {};

      const { data: metricRows } = (await supabase
        .from("performance_metrics")
        .select("*")
        .eq("user_id", athleteUserId)) as { data: MetricRow[] | null };
      ctx.metrics = metricRows ?? [];

      // --- derived (DB-join) values; each key omitted when its source is absent ---
      const sportId = userRow?.primary_sport_id as string | null | undefined;
      if (sportId) {
        const { data: sportRow } = (await supabase
          .from("sports")
          .select("name")
          .eq("id", sportId)
          .maybeSingle()) as { data: { name: string } | null };
        if (sportRow?.name) derived.sport = sportRow.name;
      }
      // Fallback to the entered prefs.primary_sport string — real accounts
      // populate the player-prefs jsonb, not the users.primary_sport_id FK, so
      // without this the FK store is usually empty and position abbreviation
      // (which is sport-scoped) silently degrades to full names.
      if (
        !derived.sport &&
        typeof ctx.prefs.primary_sport === "string" &&
        ctx.prefs.primary_sport.trim()
      ) {
        derived.sport = ctx.prefs.primary_sport.trim();
      }

      // Position for coach-facing output comes from the athlete's ENTERED,
      // ordered positions[] (positions[0] = primary, next distinct = secondary),
      // abbreviated to "3B/SS" — coaches recruit for specific positions. The
      // legacy primary_position string is only a last-resort fallback for
      // accounts that predate ordered positions.
      const positionList = Array.isArray(ctx.prefs.positions)
        ? (ctx.prefs.positions as unknown[]).filter(
            (p): p is string => typeof p === "string" && p.trim().length > 0,
          )
        : [];
      const primaryFallback =
        typeof ctx.prefs.primary_position === "string"
          ? ctx.prefs.primary_position
          : null;
      const combined = formatPositionsShort(
        derived.sport,
        positionList,
        primaryFallback,
      );
      if (combined) derived.position = combined;
      const { secondary } = primaryAndSecondary(positionList, primaryFallback);
      if (secondary) {
        derived.positionSecondary = abbreviatePosition(derived.sport, secondary);
      }

      const hsCoach = pickHsCoach(ctx.prefs, userRow?.graduation_year as number | null | undefined);
      if (hsCoach) derived.hsCoachName = hsCoach;

      const { data: profileRow } = (await supabase
        .from("player_profiles")
        .select("vanity_slug, hash_slug")
        .eq("user_id", athleteUserId)
        .maybeSingle()) as { data: { vanity_slug: string | null; hash_slug: string | null } | null };
      const slug = profileRow?.vanity_slug || profileRow?.hash_slug;
      if (slug) derived.profileLink = `/${slug}`;

      const { data: transcriptRow } = (await supabase
        .from("documents")
        .select("file_url")
        .eq("user_id", athleteUserId)
        .eq("type", "transcript")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { file_url: string | null } | null };
      if (transcriptRow?.file_url) derived.transcriptLink = transcriptRow.file_url;

      // Multi-row schedule + next-event vars from the athlete's own events.
      const { data: eventRows } = (await supabase
        .from("events")
        .select("name, start_date, end_date, location, city, state, url")
        .eq("user_id", athleteUserId)) as { data: EventLite[] | null };
      if (eventRows?.length) {
        const schedule = renderEventSchedule(eventRows);
        if (schedule) derived.eventSchedule = schedule;
        const next = nextEvent(eventRows);
        if (next?.name) derived.nextEventName = next.name;
        if (next?.dates) derived.nextEventDates = next.dates;
      }
    } catch (err) {
      // Fail-open: return whatever partial context was assembled (matches loadTemplates ethos).
      logger.error("Build athlete context error:", err);
    }

    ctx.derived = derived;
    return ctx;
  };

  const resolveTemplate = async (
    template: Pick<CommunicationTemplate, "subject" | "body">,
    entities: { school?: Row; coach?: Row; event?: Row },
    athleteCtx: ResolverContext,
    authored: Record<string, string> = {},
  ): Promise<ResolveResult> => {
    const registry = await loadRegistry();
    const ctx: ResolverContext = {
      tables: {
        users: athleteCtx.tables?.users,
        schools: entities.school,
        coaches: entities.coach,
        events: entities.event,
      },
      prefs: athleteCtx.prefs,
      metrics: athleteCtx.metrics,
      derived: athleteCtx.derived,
      authored,
    };
    const values = resolveVariables(registry, ctx);
    const subject = renderTemplate(template.subject ?? "", values);
    const body = renderTemplate(template.body ?? "", values);
    return { subject, body, unresolved: findUnresolved(`${subject}\n${body}`), values };
  };

  return { loadRegistry, buildAthleteContext, resolveTemplate };
};
