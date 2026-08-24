import { ref, computed, watch, onMounted, type Ref, type ComputedRef } from "vue";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useTemplateResolver } from "~/composables/useTemplateResolver";
import { useProfileFieldWrite } from "~/composables/useProfileFieldWrite";
import { useAthleteMessages } from "~/composables/useAthleteMessages";
import { useSchools } from "~/composables/useSchools";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { useUserStore } from "~/stores/user";
import { toSmsHref } from "~/utils/phone";
import { findUnresolved, renderClean } from "~/utils/templateResolver";
import { editableColumnFor } from "~/utils/editableProfileFields";
import {
  deriveMissingInfoFields,
  type MissingInfoField,
} from "~/utils/communication/missingInfo";
import type { ResolverContext, Row } from "~/utils/templateResolver";
import type { Coach, School, CommunicationTemplate } from "~/types/models";

/** The two outreach channels this panel drives. Mirrors iOS `GuardrailChannel`. */
export type CommChannel = "email" | "text";

export interface PreviewSegment {
  text: string;
  unresolved: boolean;
}

export interface VariableRow {
  key: string;
  value: string | null;
  editable: boolean;
  sourcePath: string | null;
  /** Athlete writes this per message (source_type=authored) — message-only input. */
  authored: boolean;
  /** Show an "Edit in profile" link (athlete-owned data that isn't inline-editable). */
  linkToProfile: boolean;
}

/** Per-channel compose state + derivations. Both channels share the same shape;
 *  the composer component renders either one from a `channel` prop. Mirrors the
 *  single iOS `QuickCommunicationViewModel` that handles email + text via a param. */
export interface ChannelController {
  channel: CommChannel;
  selectedTemplateId: Ref<string>;
  selectedTemplateObj: Ref<CommunicationTemplate | null>;
  /** `subject` is unused for text (no email subject line). */
  composer: Ref<{ subject: string; body: string }>;
  resolvedValues: Ref<Record<string, string>>;
  inputs: Ref<Record<string, string>>;
  authored: Ref<Record<string, string>>;
  sendWarning: Ref<string>;
  /** Row key currently being saved (disables its input); null when idle. */
  savingKey: Ref<string | null>;
  /** Per-row inline save error, keyed by variable key. */
  saveErrors: Ref<Record<string, string>>;
  templates: ComputedRef<CommunicationTemplate[]>;
  variableRows: ComputedRef<VariableRow[]>;
  previewSegments: ComputedRef<PreviewSegment[]>;
  unresolved: ComputedRef<string[]>;
  /** Ordered, missing-only fields the selected template still needs (unified step). */
  missingInfoFields: ComputedRef<MissingInfoField[]>;
  /** True when the info step has anything to collect; false auto-skips to preview. */
  hasMissingInfo: ComputedRef<boolean>;
  /** Info-step yes/skip toggle for the questionnaire row. */
  questionnaireDraft: Ref<boolean>;
  /** Info-step input for the intended-major row. */
  intendedMajorDraft: Ref<string>;
  /** Persist the info-step answers (questionnaire flag + intended major), re-resolve. */
  commitMissingInfo: () => Promise<void>;
  /** Persist an inline profile-field edit, then re-resolve open templates. */
  saveField: (row: VariableRow) => Promise<void>;
  /** Re-author input for authored (message-only) rows. */
  reresolve: () => Promise<void>;
  /** Runs guardrails + logging + opens the mail/sms client. Returns true when the
   *  drawer should close (a real send happened). */
  send: () => Promise<boolean>;
  /** Clear per-message authored inputs when the drawer closes. */
  onClose: () => void;
}

export interface QuickCommunicationParams {
  coach: () => Coach;
  school: () => Partial<School> | undefined;
  schoolName: () => string | undefined;
  emit: (
    event: "interaction-logged",
    payload: { type: string; direction: string; content: string },
  ) => void;
}

/** Athlete-owned categories whose non-inline-editable vars link to the profile
 *  editor. program/event/system/authored come from elsewhere (no profile link). */
const PROFILE_CATEGORIES = new Set(["player", "academics", "metrics", "contacts"]);
export const PROFILE_EDIT_ROUTE = "/settings/player-details";

/** Render a bare key as its literal {{key}} token (avoids brace nesting in markup). */
export const tokenOf = (key: string): string => `{{${key}}}`;

export function useQuickCommunication(params: QuickCommunicationParams) {
  const { getTemplatesByType, loadTemplates } = useCommunicationTemplates();
  const { activeAthleteId } = useFamilyCtx();
  const { buildAthleteContext, resolveTemplate, loadRegistry } =
    useTemplateResolver();
  const { updateSchool } = useSchools();
  const { loadAllPreferences, setPlayerDetails } = usePreferenceManager();
  const { writeField } = useProfileFieldWrite();
  const { checkSend, logSend } = useAthleteMessages();
  const { evaluate: evaluateContactWindow, filterTemplatesByWindow } =
    useContactWindow();
  const userStore = useUserStore();

  // key -> source_path / category / source_type / label, from the DB registry.
  const varSourcePaths = ref<Map<string, string>>(new Map());
  const varCategories = ref<Map<string, string>>(new Map());
  const varSourceTypes = ref<Map<string, string>>(new Map());
  const varLabels = ref<Map<string, string>>(new Map());
  // Keys marked required — the ONLY ones that block send when unresolved.
  const varRequired = ref<Set<string>>(new Set());

  // Shared across channels: log toggle + no-stat nudge.
  const shouldLogInteraction = ref(true);

  // Only the athlete editing their OWN profile can write inline (parents read-only).
  const canEditProfile = computed(
    () =>
      userStore.isAthlete &&
      !!activeAthleteId.value &&
      activeAthleteId.value === userStore.user?.id,
  );

  // Lazy-loaded, cached per athlete id. The composable OWNS this cache so no
  // component reaches in to invalidate it (fixes the prior leak).
  const athleteCtx = ref<ResolverContext | null>(null);
  const athleteCtxId = ref<string | null>(null);

  const ensureAthleteContext = async (): Promise<ResolverContext> => {
    const id = activeAthleteId.value;
    if (!id) return {};
    if (athleteCtx.value && athleteCtxId.value === id) return athleteCtx.value;
    athleteCtx.value = await buildAthleteContext(id);
    athleteCtxId.value = id;
    return athleteCtx.value;
  };

  const invalidateAthleteContext = (): void => {
    athleteCtxId.value = null;
  };

  const showAddMetricCta = computed(
    () => (athleteCtx.value?.metrics?.length ?? 0) === 0,
  );

  // --- questionnaire completion prompt (ask once, skippable) ----------------
  const questionnaireOverride = ref<boolean | null>(null);
  const questionnairePromptSkipped = ref(false);

  // --- per-sport/division NCAA contact window -------------------------------
  const contactWindowState = ref<"pre" | "open">("open");

  const refreshContactWindow = async (): Promise<void> => {
    const ctx = await ensureAthleteContext();
    const gradYear = ctx.tables?.users?.graduation_year as
      | number
      | null
      | undefined;
    const { state } = await evaluateContactWindow({
      sport: ctx.derived?.sport ?? null,
      division: params.school()?.division ?? null,
      gradYear: gradYear ?? null,
    });
    contactWindowState.value = state;
  };

  const composeFromTemplate = async (
    template: CommunicationTemplate,
    authored: Record<string, string> = {},
  ): Promise<{ subject: string; body: string; values: Record<string, string> }> => {
    const ctx = await ensureAthleteContext();
    const schoolProp = params.school();
    const schoolName = params.schoolName();
    const baseSchool = schoolProp ?? (schoolName ? { name: schoolName } : undefined);
    // Reflect an in-session questionnaire answer immediately (before the parent
    // refetches the school row) so the preview updates on Yes/Skip.
    const school =
      baseSchool && questionnaireOverride.value !== null
        ? { ...baseSchool, questionnaire_completed: questionnaireOverride.value }
        : baseSchool;
    const { subject, body, values } = await resolveTemplate(
      template,
      { coach: params.coach() as unknown as Row, school: school as Row | undefined },
      ctx,
      authored,
    );
    return { subject, body, values };
  };

  /** Variables that appear in a template's raw subject+body, first-seen order. */
  const templateVarKeys = (tpl: CommunicationTemplate | null): string[] =>
    tpl ? [...new Set(findUnresolved(`${tpl.subject ?? ""}\n${tpl.body ?? ""}`))] : [];

  const seedInputs = (
    tpl: CommunicationTemplate | null,
    values: Record<string, string>,
  ): Record<string, string> =>
    Object.fromEntries(templateVarKeys(tpl).map((k) => [k, values[k] ?? ""]));

  const toRows = (
    tpl: CommunicationTemplate | null,
    values: Record<string, string>,
  ): VariableRow[] =>
    templateVarKeys(tpl).map((key) => {
      const sourcePath = varSourcePaths.value.get(key) ?? null;
      const editable = canEditProfile.value && !!editableColumnFor(sourcePath);
      const authored = !editable && varSourceTypes.value.get(key) === "authored";
      const linkToProfile =
        !editable &&
        !authored &&
        PROFILE_CATEGORIES.has(varCategories.value.get(key) ?? "");
      return { key, value: values[key] ?? null, editable, sourcePath, authored, linkToProfile };
    });

  /** Split rendered body into ordered text/{{unresolved}} segments (no v-html). */
  const toSegments = (body: string): PreviewSegment[] => {
    const segments: PreviewSegment[] = [];
    const re = /\{\{\w+\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      if (m.index > last)
        segments.push({ text: body.slice(last, m.index), unresolved: false });
      segments.push({ text: m[0], unresolved: true });
      last = m.index + m[0].length;
    }
    if (last < body.length)
      segments.push({ text: body.slice(last), unresolved: false });
    return segments;
  };

  // --- Phase 4 send guardrails: dedupe (block) + timing (confirm) -----------
  const sendConfirmed: Record<CommChannel, Ref<boolean>> = {
    email: ref(false),
    text: ref(false),
  };

  /** Returns false when the send should stop (blocked, or awaiting confirm). */
  const passesSendGuardrails = async (
    ch: ChannelController,
  ): Promise<boolean> => {
    const athleteUserId = activeAthleteId.value;
    if (!athleteUserId) return true; // can't check without an athlete; don't block
    const confirmedRef = sendConfirmed[ch.channel];
    try {
      const check = await checkSend({
        athleteUserId,
        schoolId: params.school()?.id ?? null,
        programNote: ch.authored.value["programNote"] ?? null,
      });
      if (check.programNoteReused) {
        ch.sendWarning.value =
          "Your reason for reaching out was already sent to another program. Coaches notice reused messages — make it specific to this program before sending.";
        return false; // hard block
      }
      if (
        !confirmedRef.value &&
        (check.recentContact || check.messageCountToSchool >= 2)
      ) {
        ch.sendWarning.value = check.recentContact
          ? `You last messaged this program ${check.daysSinceLastContact ?? "a few"} day(s) ago. Click Send again to send anyway.`
          : `You've already sent ${check.messageCountToSchool} messages here — consider adding more programs. Click Send again to send anyway.`;
        confirmedRef.value = true; // arm; next click proceeds
        return false;
      }
    } catch {
      // A guardrail lookup failure must never block a legitimate send.
    }
    ch.sendWarning.value = "";
    return true;
  };

  const logSentMessage = async (
    ch: ChannelController,
    cleanBody: string,
  ): Promise<void> => {
    const athleteUserId = activeAthleteId.value;
    if (!athleteUserId) return;
    const authored = ch.authored.value;
    try {
      await logSend({
        athleteUserId,
        schoolId: params.school()?.id ?? null,
        coachId: params.coach().id ?? null,
        templateSlug: ch.selectedTemplateObj.value?.slug ?? null,
        channel: ch.channel,
        programNote: authored["programNote"] ?? null,
        updateHook: authored["updateHook"] ?? null,
        subject: ch.channel === "email" ? ch.composer.value.subject : null,
        body: cleanBody,
      });
    } catch {
      // Logging failure must not block the send.
    }
    await persistOutreachAnswers(authored);
  };

  /** Persist the athlete's why-program / why-fit answers back to the school so
   *  they prefill next time and show on school detail. Best-effort. */
  const persistOutreachAnswers = async (
    authored: Record<string, string>,
  ): Promise<void> => {
    const school = params.school();
    const schoolId = school?.id;
    if (!schoolId) return;
    const patch: Partial<School> = {};
    const wp = authored["programNote"]?.trim();
    const fr = authored["fitReason"]?.trim();
    if (wp && wp !== (school?.why_program ?? "")) patch.why_program = wp;
    if (fr && fr !== (school?.fit_reason ?? "")) patch.fit_reason = fr;
    if (Object.keys(patch).length === 0) return;
    try {
      await updateSchool(schoolId, patch);
    } catch {
      // Best-effort — a save failure must not affect the sent message.
    }
  };

  // --- channel controller factory -------------------------------------------
  const buildChannel = (channel: CommChannel): ChannelController => {
    const selectedTemplateId = ref("");
    const selectedTemplateObj = ref<CommunicationTemplate | null>(null);
    const composer = ref({ subject: "", body: "" });
    const resolvedValues = ref<Record<string, string>>({});
    const inputs = ref<Record<string, string>>({});
    const authored = ref<Record<string, string>>({});
    const sendWarning = ref("");
    const savingKey = ref<string | null>(null);
    const saveErrors = ref<Record<string, string>>({});

    const templates = computed(() =>
      filterTemplatesByWindow(
        getTemplatesByType(channel === "email" ? "email" : "message"),
        contactWindowState.value,
      ),
    );

    const variableRows = computed(() =>
      toRows(selectedTemplateObj.value, resolvedValues.value),
    );
    // Cleaned body drives preview, the send gate, and the sent/logged message:
    // optional-empty tokens/lines removed; required unresolved tokens remain.
    const cleanBody = computed(() =>
      renderClean(composer.value.body, {}, varRequired.value),
    );
    const previewSegments = computed(() => toSegments(cleanBody.value));
    const unresolved = computed(() => [...new Set(findUnresolved(cleanBody.value))]);

    // --- unified missing-info step (per channel) -----------------------------
    const questionnaireDraft = ref(false);
    const intendedMajorDraft = ref("");

    const missingInfoFields = computed(() =>
      deriveMissingInfoFields({
        referencedKeys: templateVarKeys(selectedTemplateObj.value),
        values: resolvedValues.value,
        authoredKeys: new Set(
          [...varSourceTypes.value.entries()]
            .filter(([, t]) => t === "authored")
            .map(([k]) => k),
        ),
        labels: Object.fromEntries(varLabels.value),
        body: selectedTemplateObj.value?.body ?? "",
        questionnaireComplete: questionnaireCompleted.value,
        hasMetric: (athleteCtx.value?.metrics?.length ?? 0) > 0,
        canEditProfile: canEditProfile.value,
      }),
    );
    const hasMissingInfo = computed(() => missingInfoFields.value.length > 0);

    const commitMissingInfo = async (): Promise<void> => {
      if (
        missingInfoFields.value.some((f) => f.id === "questionnaireNote") &&
        questionnaireDraft.value
      ) {
        await answerQuestionnaire(true);
      }
      const major = intendedMajorDraft.value.trim();
      if (major) {
        try {
          // Load current prefs into the store FIRST so setPlayerDetails merges
          // against the full object — otherwise it would replace prefs with just
          // { intended_major } and wipe the athlete's other player details.
          await loadAllPreferences();
          await setPlayerDetails({ intended_major: major });
          invalidateAthleteContext();
        } catch {
          // Best-effort — a persist failure must never block the send.
        }
      }
      await reresolveSelected();
    };

    const controller: ChannelController = {
      channel,
      selectedTemplateId,
      selectedTemplateObj,
      composer,
      resolvedValues,
      inputs,
      authored,
      sendWarning,
      savingKey,
      saveErrors,
      templates,
      variableRows,
      previewSegments,
      unresolved,
      missingInfoFields,
      hasMissingInfo,
      questionnaireDraft,
      intendedMajorDraft,
      commitMissingInfo,
      saveField: async (row) => saveField(controller, row),
      reresolve: () => reresolveSelected(),
      send: async () => sendMessage(controller),
      onClose: () => {
        authored.value = {};
      },
    };

    // Resolve from live athlete/coach/school data on template selection. Authored
    // variables stay as {{key}} placeholders for the athlete to fill at compose time.
    watch(selectedTemplateId, async (templateId) => {
      if (!templateId) {
        selectedTemplateObj.value = null;
        resolvedValues.value = {};
        return;
      }
      const template = templates.value.find((t) => t.id === templateId);
      if (!template) return;
      const { subject, body, values } = await composeFromTemplate(template);
      composer.value = { subject, body };
      resolvedValues.value = values;
      selectedTemplateObj.value = template;
      inputs.value = seedInputs(template, values);
      authored.value = {};
      sendWarning.value = "";
      sendConfirmed[channel].value = false;
      questionnaireDraft.value = false;
      intendedMajorDraft.value = "";
    });

    return controller;
  };

  const email = buildChannel("email");
  const text = buildChannel("text");
  const channels = [email, text];

  // Re-run compose for whichever templates are open (after an inline profile save).
  const reresolveSelected = async (): Promise<void> => {
    for (const ch of channels) {
      if (!ch.selectedTemplateObj.value) continue;
      const r = await composeFromTemplate(ch.selectedTemplateObj.value, ch.authored.value);
      ch.composer.value = { subject: r.subject, body: r.body };
      ch.resolvedValues.value = r.values;
    }
  };

  const saveField = async (
    ch: ChannelController,
    row: VariableRow,
  ): Promise<void> => {
    if (!row.editable || !row.sourcePath || !activeAthleteId.value) return;
    const raw = (ch.inputs.value[row.key] ?? "").trim();
    ch.savingKey.value = row.key;
    ch.saveErrors.value = { ...ch.saveErrors.value, [row.key]: "" };
    try {
      await writeField(activeAthleteId.value, row.sourcePath, raw === "" ? null : raw);
      invalidateAthleteContext(); // refetch on next ensureAthleteContext
      await reresolveSelected();
    } catch {
      ch.saveErrors.value = {
        ...ch.saveErrors.value,
        [row.key]: "Couldn't save — try again",
      };
    } finally {
      ch.savingKey.value = null;
    }
  };

  const sendMessage = async (ch: ChannelController): Promise<boolean> => {
    if (ch.unresolved.value.length > 0) {
      ch.sendWarning.value = `Fill these variables before sending: ${ch.unresolved.value.join(", ")}`;
      return false;
    }
    ch.sendWarning.value = "";
    if (!(await passesSendGuardrails(ch))) return false;

    const cleanBody = renderClean(ch.composer.value.body, {}, varRequired.value);
    await logSentMessage(ch, cleanBody);

    const coach = params.coach();
    if (ch.channel === "email") {
      window.location.href = `mailto:${coach.email}?subject=${encodeURIComponent(ch.composer.value.subject)}&body=${encodeURIComponent(cleanBody)}`;
    } else {
      window.location.href = toSmsHref(coach.phone ?? "", cleanBody);
    }

    if (shouldLogInteraction.value) {
      params.emit("interaction-logged", {
        type: ch.channel,
        direction: "outbound",
        content: cleanBody,
      });
    }
    sendConfirmed[ch.channel].value = false;
    return true;
  };

  // --- questionnaire state ---------------------------------------------------
  const questionnaireCompleted = computed(() =>
    questionnaireOverride.value !== null
      ? questionnaireOverride.value
      : params.school()?.questionnaire_completed === true,
  );

  const activeTemplateUsesQuestionnaire = computed(() =>
    channels.some((ch) =>
      (ch.selectedTemplateObj.value?.body ?? "").includes("{{questionnaireNote}}"),
    ),
  );

  const showQuestionnairePrompt = computed(
    () =>
      activeTemplateUsesQuestionnaire.value &&
      !questionnaireCompleted.value &&
      !questionnairePromptSkipped.value,
  );

  const answerQuestionnaire = async (completed: boolean): Promise<void> => {
    questionnaireOverride.value = completed;
    questionnairePromptSkipped.value = true;
    const school = params.school();
    if (completed && school?.id) {
      try {
        await updateSchool(school.id, {
          questionnaire_completed: true,
          questionnaire_completed_at: new Date().toISOString(),
        });
      } catch {
        // Non-fatal: the override still renders the line for this session.
      }
    }
    await reresolveSelected();
  };

  // Seed programNote / fitReason from the school's saved answers (persist per-school
  // on send), without clobbering anything the athlete already typed this session.
  const seedOutreachAuthored = (): void => {
    const s = params.school();
    if (!s) return;
    for (const ch of channels) {
      if (!ch.authored.value.programNote && s.why_program)
        ch.authored.value.programNote = s.why_program;
      if (!ch.authored.value.fitReason && s.fit_reason)
        ch.authored.value.fitReason = s.fit_reason;
    }
  };

  const init = (): void => {
    onMounted(async () => {
      loadTemplates();
      const registry = await loadRegistry();
      varSourcePaths.value = new Map(registry.map((v) => [v.key, v.source_path ?? ""]));
      varCategories.value = new Map(registry.map((v) => [v.key, v.category ?? ""]));
      varSourceTypes.value = new Map(registry.map((v) => [v.key, v.source_type]));
      varLabels.value = new Map(registry.map((v) => [v.key, v.label ?? ""]));
      varRequired.value = new Set(
        registry.filter((v) => v.is_required_default).map((v) => v.key),
      );
      await refreshContactWindow();
      seedOutreachAuthored();
    });

    // Seed outreach answers once the school prop resolves (can load after mount).
    watch(() => params.school()?.id, seedOutreachAuthored);
    // Re-evaluate the window if the target school (division) or athlete changes.
    watch(
      () => [params.school()?.division, activeAthleteId.value],
      () => {
        refreshContactWindow();
      },
    );
  };

  return {
    email,
    text,
    shouldLogInteraction,
    showAddMetricCta,
    showQuestionnairePrompt,
    answerQuestionnaire,
    init,
  };
}
