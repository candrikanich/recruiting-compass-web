import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, ref, h, nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import { useQuickCommunication } from "~/composables/useQuickCommunication";
import type { CommunicationTemplate } from "~/types/models";

const updateSchool = vi.fn();
const loadAllPreferences = vi.fn();
const setPlayerDetails = vi.fn();
// Non-null by default = prefs loaded successfully (the safe path).
const getPlayerDetails = vi.fn<() => Record<string, unknown> | null>(() => ({
  graduation_year: 2027,
}));

const emailTemplate = {
  id: "t1",
  name: "Intro",
  slug: "intro-standard",
  type: "email",
  subject: "Hi",
  body: "Hello {{coachName}} — {{programNote}}",
} as unknown as CommunicationTemplate;

const resolvedTemplate = {
  id: "t2",
  name: "Resolved",
  slug: "resolved",
  type: "email",
  subject: "Hi",
  body: "Hello {{coachName}}",
} as unknown as CommunicationTemplate;

// Registry: programNote is an authored var; coachName is a resolved column.
vi.mock("~/composables/useCommunicationTemplates", () => ({
  useCommunicationTemplates: () => ({
    getTemplatesByType: () => [emailTemplate, resolvedTemplate],
    loadTemplates: vi.fn(),
  }),
}));
vi.mock("~/composables/useFamilyCtx", () => ({
  useFamilyCtx: () => ({ activeAthleteId: ref("athlete1") }),
}));
vi.mock("~/composables/useTemplateResolver", () => ({
  useTemplateResolver: () => ({
    buildAthleteContext: vi.fn(async () => ({
      tables: { users: { full_name: "Jordan" } },
      prefs: {},
      metrics: [],
      derived: {},
    })),
    // coachName resolves; programNote stays unresolved (authored, fill at compose).
    resolveTemplate: vi.fn(async (t: CommunicationTemplate) => ({
      subject: t.subject ?? "",
      body: t.body ?? "",
      values: { coachName: "Coach Reed" },
    })),
    loadRegistry: vi.fn(async () => [
      { key: "coachName", source_type: "column", source_path: "column:coaches.last_name", label: "Coach name" },
      { key: "programNote", source_type: "authored", source_path: null, label: "Why this program?" },
    ]),
  }),
}));
vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({ updateSchool }),
}));
vi.mock("~/composables/usePreferenceManager", () => ({
  usePreferenceManager: () => ({
    loadAllPreferences,
    setPlayerDetails,
    getPlayerDetails,
  }),
}));
vi.mock("~/composables/useProfileFieldWrite", () => ({
  useProfileFieldWrite: () => ({ writeField: vi.fn() }),
}));
vi.mock("~/composables/useAthleteMessages", () => ({
  useAthleteMessages: () => ({ checkSend: vi.fn(), logSend: vi.fn() }),
}));
vi.mock("~/composables/useContactWindow", () => ({
  useContactWindow: () => ({
    evaluate: vi.fn(async () => ({ state: "open" })),
    filterTemplatesByWindow: (list: unknown[]) => list,
  }),
}));
vi.mock("~/stores/user", () => ({
  useUserStore: () => ({ isAthlete: true, user: { id: "athlete1" } }),
}));

// useContactWindow is auto-imported (no `~/composables` path in source); stub the
// global the composable calls.
(globalThis as Record<string, unknown>).useContactWindow = () => ({
  evaluate: vi.fn(async () => ({ state: "open" })),
  filterTemplatesByWindow: (list: unknown[]) => list,
});

function mountWith(school: Record<string, unknown> | undefined) {
  const api: { qc?: ReturnType<typeof useQuickCommunication> } = {};
  const Comp = defineComponent({
    setup() {
      const qc = useQuickCommunication({
        coach: () => ({ id: "c1", first_name: "Dana", last_name: "Reed" }) as never,
        school: () => school as never,
        schoolName: () => "Ohio State",
        emit: vi.fn(),
      });
      qc.init();
      api.qc = qc;
      return () => h("div");
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, api };
}

beforeEach(() => {
  updateSchool.mockClear();
  loadAllPreferences.mockClear();
  setPlayerDetails.mockClear();
  getPlayerDetails.mockReset();
  getPlayerDetails.mockReturnValue({ graduation_year: 2027 });
});

describe("useQuickCommunication — missing-info wiring", () => {
  it("flags hasMissingInfo with a programNote row for an unresolved authored var", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t1";
    await flushPromises();
    await nextTick();

    expect(api.qc!.email.hasMissingInfo.value).toBe(true);
    expect(api.qc!.email.missingInfoFields.value.map((f) => f.id)).toContain(
      "programNote",
    );
  });

  it("has no missing info for a fully-resolved template", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t2";
    await flushPromises();
    await nextTick();

    expect(api.qc!.email.hasMissingInfo.value).toBe(false);
    expect(api.qc!.email.missingInfoFields.value).toEqual([]);
  });

  it("commitMissingInfo persists the intended major via load-then-merge", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t1";
    await flushPromises();

    api.qc!.email.intendedMajorDraft.value = "Mechanical Engineering";
    await api.qc!.email.commitMissingInfo();

    expect(loadAllPreferences).toHaveBeenCalledOnce();
    expect(setPlayerDetails).toHaveBeenCalledWith({
      intended_major: "Mechanical Engineering",
    });
  });

  it("does NOT save the intended major when prefs failed to load (empty store)", async () => {
    // loadAllPreferences swallows fetch failures and leaves the store empty;
    // getPlayerDetails() then returns null. Saving here would replace ALL player
    // prefs with just { intended_major } — the guard must skip the save.
    getPlayerDetails.mockReturnValue(null);
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    api.qc!.email.selectedTemplateId.value = "t1";
    await flushPromises();

    api.qc!.email.intendedMajorDraft.value = "Mechanical Engineering";
    await api.qc!.email.commitMissingInfo();

    expect(loadAllPreferences).toHaveBeenCalledOnce();
    expect(setPlayerDetails).not.toHaveBeenCalled();
  });

  it("commitMissingInfo marks the questionnaire complete when the draft is yes", async () => {
    const { api } = mountWith({ id: "s1", questionnaire_completed: false });
    await flushPromises();
    // A template that references the questionnaire note so the row exists.
    api.qc!.email.selectedTemplateObj.value = {
      ...emailTemplate,
      body: "Hi {{questionnaireNote}}",
    } as CommunicationTemplate;
    await nextTick();

    api.qc!.email.questionnaireDraft.value = true;
    await api.qc!.email.commitMissingInfo();

    expect(updateSchool).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ questionnaire_completed: true }),
    );
  });
});
