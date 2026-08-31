import { useSupabase } from "./useSupabase";
import { createClientLogger } from "~/utils/logger";
import {
  resolveVariables,
  renderTemplate,
  applyOptionalSegments,
  findUnresolved,
  formatUsPhone,
  renderEventSchedule,
  nextEvent,
  type RegistryVar,
  type ResolverContext,
  type Row,
  type MetricRow,
  type EventLite,
} from "~/utils/templateResolver";
import {
  pickHsCoach,
  derivePositions,
} from "~/utils/templateResolver/athleteDerived";
import { useTemplateRegistryStore } from "~/stores/templateRegistry";
import { buildPrepBaseballUrl } from "~/utils/recruitingLinks";
import type { CommunicationTemplate } from "~/types/models";

const logger = createClientLogger("useTemplateResolver");

/** Public base for athlete profile links shared with coaches; absolute so the URL is
 *  clickable in the sent email/SMS (parity with iOS publicProfileBase). */
const PUBLIC_PROFILE_BASE = "https://myrecruitingcompass.com";

export interface ResolveResult {
  subject: string;
  body: string;
  /** Variables still unfilled after render — the send-blocking check. */
  unresolved: string[];
  /** The resolved {{key}} -> value map used for this render (drives the variables panel). */
  values: Record<string, string>;
}

export const useTemplateResolver = () => {
  const supabase = useSupabase();
  const registryStore = useTemplateRegistryStore();

  /** Delegates to the registry store (session-cached global reference data). */
  const loadRegistry = (force = false): Promise<RegistryVar[]> =>
    registryStore.load(force);

  // --- buildAthleteContext steps ---------------------------------------------
  // Each fetches + shapes one slice of the athlete context. The orchestrator
  // below wraps them in a single fail-open try/catch, so a failure in any step
  // returns whatever partial context was assembled (matches the loadTemplates
  // ethos). Kept as inner closures over `supabase` to stay query-local.

  /** users row, player + location prefs (phone formatted), performance metrics. */
  const fetchCoreTables = async (
    athleteUserId: string,
  ): Promise<{
    users: Row | null;
    prefs: Record<string, unknown>;
    locationPrefs: Record<string, unknown>;
    metrics: MetricRow[];
  }> => {
    const { data: userRow } = (await supabase
      .from("users")
      .select("*")
      .eq("id", athleteUserId)
      .maybeSingle()) as { data: Row | null };

    const { data: prefRow } = (await supabase
      .from("user_preferences")
      .select("data")
      .eq("user_id", athleteUserId)
      .eq("category", "player")
      .maybeSingle()) as {
      data: { data: Record<string, unknown> | null } | null;
    };
    const prefs = prefRow?.data ?? {};
    if (typeof prefs.phone === "string") {
      const formatted = formatUsPhone(prefs.phone);
      if (formatted) prefs.phone = formatted;
    }

    const { data: locationRow } = (await supabase
      .from("user_preferences")
      .select("data")
      .eq("user_id", athleteUserId)
      .eq("category", "location")
      .maybeSingle()) as {
      data: { data: Record<string, unknown> | null } | null;
    };

    const { data: metricRows } = (await supabase
      .from("performance_metrics")
      .select("*")
      .eq("user_id", athleteUserId)) as { data: MetricRow[] | null };

    return {
      users: userRow,
      prefs,
      locationPrefs: locationRow?.data ?? {},
      metrics: metricRows ?? [],
    };
  };

  /** Sport name from the users.primary_sport_id FK, falling back to the entered
   *  prefs.primary_sport string (real accounts populate the jsonb, not the FK). */
  const deriveSport = async (
    userRow: Row | null,
    prefs: Record<string, unknown>,
  ): Promise<string | undefined> => {
    const sportId = userRow?.primary_sport_id as string | null | undefined;
    if (sportId) {
      const { data: sportRow } = (await supabase
        .from("sports")
        .select("name")
        .eq("id", sportId)
        .maybeSingle()) as { data: { name: string } | null };
      if (sportRow?.name) return sportRow.name;
    }
    if (typeof prefs.primary_sport === "string" && prefs.primary_sport.trim()) {
      return prefs.primary_sport.trim();
    }
    return undefined;
  };

  /** Public/profile links: player profile, Prep Baseball Report, transcript, film. */
  const deriveLinks = async (
    athleteUserId: string,
    prefs: Record<string, unknown>,
  ): Promise<Record<string, string>> => {
    const derived: Record<string, string> = {};

    const { data: profileRow } = (await supabase
      .from("player_profiles")
      .select("vanity_slug, hash_slug")
      .eq("user_id", athleteUserId)
      .maybeSingle()) as {
      data: { vanity_slug: string | null; hash_slug: string | null } | null;
    };
    const slug = profileRow?.vanity_slug || profileRow?.hash_slug;
    // Absolute so the link is clickable in the email/SMS sent to a coach
    // (parity with iOS TemplateContextBuilder.publicProfileBase).
    if (slug) derived.profileLink = `${PUBLIC_PROFILE_BASE}/p/${slug}`;

    // Prep Baseball Report profile URL, built from the athlete's stored state +
    // name-slug; omitted when either is missing so it renders as nothing.
    const prepBaseballLink = buildPrepBaseballUrl(
      prefs.prep_baseball_state as string | undefined,
      prefs.prep_baseball_id as string | undefined,
    );
    if (prepBaseballLink) derived.prepBaseballLink = prepBaseballLink;

    const { data: transcriptRow } = (await supabase
      .from("documents")
      .select("file_url")
      .eq("user_id", athleteUserId)
      .eq("type", "transcript")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { file_url: string | null } | null };
    if (transcriptRow?.file_url)
      derived.transcriptLink = transcriptRow.file_url;

    // Primary film link from the canonical video_links table (prefer a healthy
    // link, else the first), mirroring iOS.
    const { data: videoRows } = (await supabase
      .from("video_links")
      .select("url, health_status, created_at")
      .eq("user_id", athleteUserId)
      .order("created_at", { ascending: true })) as {
      data: { url: string; health_status: string | null }[] | null;
    };
    if (videoRows?.length) {
      const primary =
        videoRows.find((v) => v.health_status === "healthy") ?? videoRows[0];
      if (primary?.url) derived.videoLink = primary.url;
    }

    return derived;
  };

  /** Multi-row schedule + next-event vars from the athlete's own events. */
  const deriveSchedule = async (
    athleteUserId: string,
  ): Promise<Record<string, string>> => {
    const derived: Record<string, string> = {};
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
    return derived;
  };

  const buildAthleteContext = async (
    athleteUserId: string,
  ): Promise<ResolverContext> => {
    const ctx: ResolverContext = {
      tables: {},
      prefs: {},
      metrics: [],
      derived: {},
    };
    const derived: Record<string, string> = {};

    try {
      const core = await fetchCoreTables(athleteUserId);
      if (core.users) ctx.tables!.users = core.users;
      ctx.prefs = core.prefs;
      ctx.locationPrefs = core.locationPrefs;
      ctx.metrics = core.metrics;

      const sport = await deriveSport(core.users, core.prefs);
      if (sport) derived.sport = sport;

      Object.assign(derived, derivePositions(sport, core.prefs));

      const hsCoach = pickHsCoach(
        core.prefs,
        core.users?.graduation_year as number | null | undefined,
      );
      if (hsCoach) derived.hsCoachName = hsCoach;

      Object.assign(derived, await deriveLinks(athleteUserId, core.prefs));
      Object.assign(derived, await deriveSchedule(athleteUserId));
    } catch (err) {
      // Fail-open: return whatever partial context was assembled.
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
      locationPrefs: athleteCtx.locationPrefs,
      metrics: athleteCtx.metrics,
      derived: athleteCtx.derived,
      authored,
    };
    const values = resolveVariables(registry, ctx);
    // Resolve `[[gate|text]]` optional spans BEFORE token substitution, else the
    // bracket wrappers leak into the editable Subject/Message fields. Authored
    // `{{key}}` placeholders survive (applyOptionalSegments keeps inner tokens;
    // renderTemplate leaves unmatched keys intact for the athlete to fill).
    const subject = renderTemplate(
      applyOptionalSegments(template.subject ?? "", values),
      values,
    );
    const body = renderTemplate(
      applyOptionalSegments(template.body ?? "", values),
      values,
    );
    return {
      subject,
      body,
      unresolved: findUnresolved(`${subject}\n${body}`),
      values,
    };
  };

  return { loadRegistry, buildAthleteContext, resolveTemplate };
};
