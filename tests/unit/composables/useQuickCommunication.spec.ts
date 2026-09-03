import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, ref, h, nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import {
  useQuickCommunication,
  tokenOf,
  PROFILE_EDIT_ROUTE,
  type CommChannel,
} from "~/composables/useQuickCommunication";
import type { CommunicationTemplate } from "~/types/models";

// --- top-level mock fns (shared across all tests) ---------------------------
const updateSchool = vi.fn();
const writeField = vi.fn();
const checkSend = vi.fn();
const logSend = vi.fn();
const buildAthleteContext = vi.fn(async () => ({
  tables: { users: { full_name: "Jordan", graduation_year: 2027 } },
  prefs: {},
  metrics: [],
  derived: { sport: "Baseball" },
}));
const resolveTemplate = vi.fn(
  async (t: CommunicationTemplate, _ctx: unknown, _actx: unknown, authored: Record<string, string> = {}) => ({
    subject: t.subject ?? "",
    body: (t.body ?? "").replace(
      /\{\{(\w+)\}\}/g,
      (_m: string, k: string) => authored[k] ?? mockValues[k] ?? `{{${k}}}`,
    ),
    values: { ...mockValues, ...authored },
  }),
);
const loadTemplates = vi.fn();
const loadRegistry = vi.fn(async () => [
  {
    key: "coachName",
    source_type: "column",
    source_path: "column:coaches.last_name",
    category: "contacts",
    label: "Coach name",
    is_required_default: true,
  },
  {
    key: "programNote",
    source_type: "authored",
    source_path: null,
    category: "program",
    label: "Why this program?",
    is_required_default: false,
  },
  {
    key: "gpa",
    source_type: "column",
    source_path: "column:users.gpa",
    category: "academics",
    label: "GPA",
    is_required_default: false,
  },
  {
    key: "fitReason",
    source_type: "authored",
    source_path: null,
    category: "program",
    label: "Why you fit",
    is_required_default: false,
  },
  {
    key: "questionnaireNote",
    source_type: "computed",
    source_path: null,
    category: "system",
    label: "Questionnaire note",
    is_required_default: false,
  },
]);

// Values that resolveTemplate returns as already-resolved.
let mockValues: Record<string, string> = {};

// --- templates ---------------------------------------------------------------
const emailTemplate = {
  id: "t-email",
  name: "Intro Email",
  slug: "intro-standard",
  type: "email",
  subject: "Hello from {{playerName}}",
  body: "Dear {{coachName}}, I'm interested in {{schoolName}}. {{programNote}}",
} as unknown as CommunicationTemplate;

const textTemplate = {
  id: "t-text",
  name: "Quick Text",
  slug: "quick-text",
  type: "message",
  subject: "",
  body: "Hi {{coachName}}, wanted to reach out about {{schoolName}}.",
} as unknown as CommunicationTemplate;

const questionnaireTemplate = {
  id: "t-q",
  name: "Questionnaire",
  slug: "questionnaire-tpl",
  type: "email",
  subject: "Hi",
  body: "Dear {{coachName}}, {{questionnaireNote}} {{programNote}}",
} as unknown as CommunicationTemplate;

const resolvedOnlyTemplate = {
  id: "t-resolved",
  name: "Resolved Only",
  slug: "resolved-only",
  type: "email",
  subject: "Hi",
  body: "Dear {{coachName}}",
} as unknown as CommunicationTemplate;

const editableTemplate = {
  id: "t-editable",
  name: "Editable",
  slug: "editable",
  type: "email",
  subject: "Hi",
  body: "GPA: {{gpa}}",
} as unknown as CommunicationTemplate;

// --- module mocks -----------------------------------------------------------
vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    getTemplatesByType: (type: string) => {
      if (type === "email")
        return [emailTemplate, questionnaireTemplate, resolvedOnlyTemplate, editableTemplate];
      return [textTemplate];
    },
    loadTemplates,
  }),
}));
vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => ({ activeAthleteId: ref("athlete1") }),
}));
vi.mock("~/composables/useTemplateResolver", () => ({
  useTemplateResolver: () => ({
    buildAthleteContext,
    resolveTemplate,
    loadRegistry,
  }),
}));
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({ updateSchool }),
}));
vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    loadAllPreferences: vi.fn(),
    setPlayerDetails: vi.fn(),
    getPlayerDetails: vi.fn(() => ({})),
  }),
}));
vi.mock("~/composables/useProfileFieldWrite", () => ({
  useProfileFieldWrite: () => ({ writeField }),
}));
vi.mock("~/composables/useAthleteMessages", () => ({
  useAthleteMessages: () => ({ checkSend, logSend }),
}));
vi.mock("~/composables/useContactWindow", () => ({
  useContactWindow: () => ({
    evaluate: vi.fn(async () => ({ state: "open" })),
    filterTemplatesByWindow: (list: unknown[]) => list,
  }),
}));

let mockIsAthlete = true;
let mockUserId = "athlete1";
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({
    get isAthlete() { return mockIsAthlete; },
    get user() { return { id: mockUserId }; },
  }),
}));

// useContactWindow is auto-imported in the source (no path).
(globalThis as Record<string, unknown>).useContactWindow = () => ({
  evaluate: vi.fn(async () => ({ state: "open" })),
  filterTemplatesByWindow: (list: unknown[]) => list,
});

// --- helper ------------------------------------------------------------------
function mountWith(school?: Record<string, unknown>) {
  const api: { qc?: ReturnType<typeof useQuickCommunication> } = {};
  const emitSpy = vi.fn();
  const Comp = defineComponent({
    setup() {
      const qc = useQuickCommunication({
        coach: () =>
          ({
            id: "c1",
            first_name: "Dana",
            last_name: "Reed",
            email: "dana@ohio.edu",
            phone: "5551234567",
          }) as never,
        school: () => school as never,
        schoolName: () => school?.name as string ?? "Ohio State",
        emit: emitSpy,
      });
      qc.init();
      api.qc = qc;
      return () => h("div");
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, api, emitSpy };
}

async function mountAndSelectTemplate(
  templateId: string,
  school?: Record<string, unknown>,
) {
  const result = mountWith(school);
  await flushPromises();
  result.api.qc!.email.selectedTemplateId.value = templateId;
  await flushPromises();
  await nextTick();
  return result;
}

// --- tests -------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockValues = { coachName: "Coach Reed", schoolName: "Ohio State" };
  mockIsAthlete = true;
  mockUserId = "athlete1";
  // Stub window.location.href for send tests.
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
    configurable: true,
  });
});

describe("tokenOf (exported pure)", () => {
  it("wraps a key in double braces", () => {
    expect(tokenOf("coachName")).toBe("{{coachName}}");
  });

  it("handles empty string", () => {
    expect(tokenOf("")).toBe("{{}}");
  });
});

describe("PROFILE_EDIT_ROUTE", () => {
  it("equals /settings/player-details", () => {
    expect(PROFILE_EDIT_ROUTE).toBe("/settings/player-details");
  });
});

describe("useQuickCommunication — channel factory", () => {
  it("creates email and text channel controllers", async () => {
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    const qc = api.qc!;
    expect(qc.email.channel).toBe("email");
    expect(qc.text.channel).toBe("text");
  });

  it("templates computed returns the correct type per channel", async () => {
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    const emailTemplates = api.qc!.email.templates.value;
    const textTemplates = api.qc!.text.templates.value;
    expect(emailTemplates.length).toBeGreaterThan(0);
    expect(textTemplates.length).toBeGreaterThan(0);
    expect(emailTemplates.some((t) => t.type === "email")).toBe(true);
    expect(textTemplates.some((t) => t.type === "message")).toBe(true);
  });
});

describe("useQuickCommunication — canEditProfile", () => {
  it("is true when user is the athlete themselves", async () => {
    mockIsAthlete = true;
    mockUserId = "athlete1";
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    expect(api.qc!.canEditProfile.value).toBe(true);
  });

  it("is false when user is a parent", async () => {
    mockIsAthlete = false;
    mockUserId = "parent1";
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    expect(api.qc!.canEditProfile.value).toBe(false);
  });

  it("is false when athlete IDs don't match", async () => {
    mockIsAthlete = true;
    mockUserId = "other-athlete";
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    expect(api.qc!.canEditProfile.value).toBe(false);
  });
});

describe("useQuickCommunication — shouldLogInteraction", () => {
  it("defaults to true", async () => {
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    expect(api.qc!.shouldLogInteraction.value).toBe(true);
  });

  it("is togglable", async () => {
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    api.qc!.shouldLogInteraction.value = false;
    expect(api.qc!.shouldLogInteraction.value).toBe(false);
  });
});

describe("useQuickCommunication — template selection", () => {
  it("resolves composer subject+body when template selected", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    expect(api.qc!.email.composer.value.subject).toBeTruthy();
    expect(api.qc!.email.composer.value.body).toContain("Coach Reed");
  });

  it("populates resolvedValues on selection", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    expect(api.qc!.email.resolvedValues.value.coachName).toBe("Coach Reed");
  });

  it("resets state when clearing the template", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    api.qc!.email.selectedTemplateId.value = "";
    await flushPromises();
    expect(api.qc!.email.selectedTemplateObj.value).toBeNull();
    expect(api.qc!.email.resolvedValues.value).toEqual({});
  });

  it("clears authored inputs on new template selection", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    api.qc!.email.authored.value = { programNote: "I love Ohio" };
    // Select a different template
    api.qc!.email.selectedTemplateId.value = "t-resolved";
    await flushPromises();
    expect(api.qc!.email.authored.value).toEqual({});
  });

  it("clears sendWarning on new template selection", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    api.qc!.email.sendWarning.value = "some warning";
    api.qc!.email.selectedTemplateId.value = "t-resolved";
    await flushPromises();
    expect(api.qc!.email.sendWarning.value).toBe("");
  });
});

describe("useQuickCommunication — previewSegments (toSegments)", () => {
  it("contains resolved text segments for a fully-resolved template", async () => {
    const { api } = await mountAndSelectTemplate("t-resolved", { id: "s1" });
    const segments = api.qc!.email.previewSegments.value;
    const resolvedParts = segments.filter((s) => !s.unresolved);
    expect(resolvedParts.length).toBeGreaterThan(0);
    // coachName was resolved → body text includes it
    expect(resolvedParts.some((s) => s.text.includes("Coach Reed"))).toBe(true);
  });

  it("strips optional unresolved tokens from preview (renderClean)", async () => {
    // programNote is optional (not required) → renderClean removes it
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    const segments = api.qc!.email.previewSegments.value;
    const unresolvedParts = segments.filter((s) => s.unresolved);
    expect(unresolvedParts.some((s) => s.text === "{{programNote}}")).toBe(false);
  });

  it("keeps required unresolved tokens as unresolved segments", async () => {
    // coachName IS required; remove it from mockValues to leave it unresolved
    mockValues = { schoolName: "Ohio State" };
    const { api } = await mountAndSelectTemplate("t-resolved", { id: "s1" });
    const segments = api.qc!.email.previewSegments.value;
    const unresolvedParts = segments.filter((s) => s.unresolved);
    expect(unresolvedParts.some((s) => s.text === "{{coachName}}")).toBe(true);
  });
});

describe("useQuickCommunication — variableRows (toRows)", () => {
  it("creates a row per template variable", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    const rows = api.qc!.email.variableRows.value;
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("coachName");
    expect(keys).toContain("programNote");
    expect(keys).toContain("schoolName");
  });

  it("marks authored rows correctly", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    const rows = api.qc!.email.variableRows.value;
    const programRow = rows.find((r) => r.key === "programNote");
    expect(programRow?.authored).toBe(true);
    expect(programRow?.editable).toBe(false);
  });

  it("marks editable rows for athlete user with editable source_path", async () => {
    mockIsAthlete = true;
    mockUserId = "athlete1";
    const { api } = await mountAndSelectTemplate("t-editable", { id: "s1" });
    const rows = api.qc!.email.variableRows.value;
    const gpaRow = rows.find((r) => r.key === "gpa");
    expect(gpaRow?.editable).toBe(true);
    expect(gpaRow?.sourcePath).toBe("column:users.gpa");
  });

  it("sets linkToProfile for non-editable profile-category vars", async () => {
    mockIsAthlete = false; // parent can't edit inline
    mockUserId = "parent1";
    const { api } = await mountAndSelectTemplate("t-editable", { id: "s1" });
    const rows = api.qc!.email.variableRows.value;
    const gpaRow = rows.find((r) => r.key === "gpa");
    // For a parent: not editable, but category=academics → linkToProfile=true
    expect(gpaRow?.editable).toBe(false);
    expect(gpaRow?.linkToProfile).toBe(true);
  });
});

describe("useQuickCommunication — unresolved computed", () => {
  it("lists required unresolved keys (optional ones cleaned away)", async () => {
    // coachName is required; leave it unresolved
    mockValues = { schoolName: "Ohio State" };
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    const unresolved = api.qc!.email.unresolved.value;
    expect(unresolved).toContain("coachName");
    // programNote is optional → cleaned away by renderClean
    expect(unresolved).not.toContain("programNote");
  });

  it("is empty for a fully resolved template", async () => {
    const { api } = await mountAndSelectTemplate("t-resolved", { id: "s1" });
    expect(api.qc!.email.unresolved.value).toHaveLength(0);
  });
});

describe("useQuickCommunication — questionnaire state", () => {
  it("questionnaireCompleted reflects school prop", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: true });
    await flushPromises();
    // Access via showQuestionnairePrompt — it should be false when completed
    expect(api.qc!.showQuestionnairePrompt.value).toBe(false);
  });

  it("showQuestionnairePrompt is true when template uses it and not completed", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    // Select a template with {{questionnaireNote}}
    api.qc!.email.selectedTemplateId.value = "t-q";
    await flushPromises();
    await nextTick();
    expect(api.qc!.showQuestionnairePrompt.value).toBe(true);
  });

  it("showQuestionnairePrompt is false when no template uses questionnaireNote", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t-resolved";
    await flushPromises();
    await nextTick();
    expect(api.qc!.showQuestionnairePrompt.value).toBe(false);
  });

  it("answerQuestionnaire persists to school and hides prompt", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t-q";
    await flushPromises();

    await api.qc!.answerQuestionnaire(true);

    expect(updateSchool).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ questionnaire_completed: true }),
    );
    expect(api.qc!.showQuestionnairePrompt.value).toBe(false);
  });

  it("answerQuestionnaire(false) skips the prompt without persisting", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t-q";
    await flushPromises();

    await api.qc!.answerQuestionnaire(false);

    expect(updateSchool).not.toHaveBeenCalled();
    expect(api.qc!.showQuestionnairePrompt.value).toBe(false);
  });
});

describe("useQuickCommunication — athleteName", () => {
  it("returns the athlete full_name from context", async () => {
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    // Trigger a context build by selecting a template
    api.qc!.email.selectedTemplateId.value = "t-resolved";
    await flushPromises();
    expect(api.qc!.athleteName.value).toBe("Jordan");
  });

  it("falls back to 'your athlete' when no context loaded", async () => {
    buildAthleteContext.mockResolvedValueOnce({
      tables: { users: {} },
      prefs: {},
      metrics: [],
      derived: {},
    });
    const { api } = mountWith({ id: "s1" });
    await flushPromises();
    expect(api.qc!.athleteName.value).toBe("your athlete");
  });
});

describe("useQuickCommunication — onClose", () => {
  it("clears authored values", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    api.qc!.email.authored.value = { programNote: "test" };
    api.qc!.email.onClose();
    expect(api.qc!.email.authored.value).toEqual({});
  });
});

describe("useQuickCommunication — saveField", () => {
  it("calls writeField and re-resolves on success", async () => {
    mockIsAthlete = true;
    mockUserId = "athlete1";
    const { api } = await mountAndSelectTemplate("t-editable", { id: "s1" });
    const gpaRow = api.qc!.email.variableRows.value.find(
      (r) => r.key === "gpa",
    );
    expect(gpaRow?.editable).toBe(true);

    api.qc!.email.inputs.value.gpa = "3.8";
    writeField.mockResolvedValueOnce(undefined);
    await api.qc!.email.saveField(gpaRow!);

    expect(writeField).toHaveBeenCalledWith("athlete1", "column:users.gpa", "3.8");
    expect(api.qc!.email.savingKey.value).toBeNull();
  });

  it("sets a save error on failure", async () => {
    mockIsAthlete = true;
    mockUserId = "athlete1";
    const { api } = await mountAndSelectTemplate("t-editable", { id: "s1" });
    const gpaRow = api.qc!.email.variableRows.value.find(
      (r) => r.key === "gpa",
    );

    api.qc!.email.inputs.value.gpa = "3.8";
    writeField.mockRejectedValueOnce(new Error("db error"));
    await api.qc!.email.saveField(gpaRow!);

    expect(api.qc!.email.saveErrors.value.gpa).toBe(
      "Couldn't save — try again",
    );
    expect(api.qc!.email.savingKey.value).toBeNull();
  });

  it("skips non-editable rows", async () => {
    const { api } = await mountAndSelectTemplate("t-email", { id: "s1" });
    const coachRow = api.qc!.email.variableRows.value.find(
      (r) => r.key === "coachName",
    );
    await api.qc!.email.saveField(coachRow!);
    expect(writeField).not.toHaveBeenCalled();
  });

  it("sends null for empty input (field clear)", async () => {
    mockIsAthlete = true;
    mockUserId = "athlete1";
    const { api } = await mountAndSelectTemplate("t-editable", { id: "s1" });
    const gpaRow = api.qc!.email.variableRows.value.find(
      (r) => r.key === "gpa",
    );

    api.qc!.email.inputs.value.gpa = "   ";
    writeField.mockResolvedValueOnce(undefined);
    await api.qc!.email.saveField(gpaRow!);

    expect(writeField).toHaveBeenCalledWith("athlete1", "column:users.gpa", null);
  });
});

describe("useQuickCommunication — send", () => {
  it("blocks send when there are unresolved required vars", async () => {
    // coachName is required + unresolved → blocks send
    mockValues = { schoolName: "Ohio State" };
    const { api } = await mountAndSelectTemplate("t-email", {
      id: "s1",
    });
    const sent = await api.qc!.email.send();
    expect(sent).toBe(false);
    expect(api.qc!.email.sendWarning.value).toContain("Fill these variables");
  });

  it("proceeds when all vars resolved and guardrails pass", async () => {
    mockValues = {
      coachName: "Coach Reed",
      schoolName: "Ohio State",
      programNote: "love it",
    };
    checkSend.mockResolvedValueOnce({
      programNoteReused: false,
      recentContact: false,
      messageCountToSchool: 0,
    });
    logSend.mockResolvedValueOnce(undefined);

    const { api, emitSpy } = await mountAndSelectTemplate("t-resolved", {
      id: "s1",
    });
    const sent = await api.qc!.email.send();
    expect(sent).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith("interaction-logged", expect.objectContaining({
      type: "email",
      direction: "outbound",
    }));
  });

  it("blocks on programNote reuse", async () => {
    mockValues = {
      coachName: "Coach Reed",
      schoolName: "Ohio State",
      programNote: "test",
    };
    checkSend.mockResolvedValueOnce({
      programNoteReused: true,
      recentContact: false,
      messageCountToSchool: 0,
    });

    const { api } = await mountAndSelectTemplate("t-resolved", {
      id: "s1",
    });
    const sent = await api.qc!.email.send();
    expect(sent).toBe(false);
    expect(api.qc!.email.sendWarning.value).toContain("reused messages");
  });

  it("warns on recent contact, then confirms on second send", async () => {
    mockValues = {
      coachName: "Coach Reed",
      schoolName: "Ohio State",
      programNote: "test",
    };
    checkSend.mockResolvedValue({
      programNoteReused: false,
      recentContact: true,
      messageCountToSchool: 0,
      daysSinceLastContact: 2,
    });
    logSend.mockResolvedValue(undefined);

    const { api } = await mountAndSelectTemplate("t-resolved", {
      id: "s1",
    });
    // First send: soft block with warning
    const first = await api.qc!.email.send();
    expect(first).toBe(false);
    expect(api.qc!.email.sendWarning.value).toContain("day(s) ago");

    // Second send: proceeds
    const second = await api.qc!.email.send();
    expect(second).toBe(true);
  });

  it("skips interaction log when shouldLogInteraction is false", async () => {
    mockValues = { coachName: "Coach Reed" };
    checkSend.mockResolvedValueOnce({
      programNoteReused: false,
      recentContact: false,
      messageCountToSchool: 0,
    });
    logSend.mockResolvedValueOnce(undefined);

    const { api, emitSpy } = await mountAndSelectTemplate("t-resolved", {
      id: "s1",
    });
    api.qc!.shouldLogInteraction.value = false;
    await api.qc!.email.send();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("guardrail fetch failure does not block the send", async () => {
    mockValues = { coachName: "Coach Reed" };
    checkSend.mockRejectedValueOnce(new Error("network"));
    logSend.mockResolvedValueOnce(undefined);

    const { api } = await mountAndSelectTemplate("t-resolved", {
      id: "s1",
    });
    const sent = await api.qc!.email.send();
    expect(sent).toBe(true);
  });
});

describe("useQuickCommunication — init", () => {
  it("calls loadTemplates and loadRegistry on mount", async () => {
    mountWith({ id: "s1" });
    await flushPromises();
    expect(loadTemplates).toHaveBeenCalled();
    expect(loadRegistry).toHaveBeenCalled();
  });
});
