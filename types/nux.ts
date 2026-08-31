export const NUX_CHECKLIST_KEYS = [
  "sport",
  "first_school",
  "academics",
  "first_coach",
  "invite_family",
  "profile_80",
  "preview_template",
  "check_timeline",
] as const;

export type NuxChecklistKey = (typeof NUX_CHECKLIST_KEYS)[number];

export interface NuxChecklistItem {
  completed: boolean;
  completedAt: string | null;
}

export interface NuxProgress {
  version: number;
  checklist: {
    items: Partial<Record<NuxChecklistKey, NuxChecklistItem>>;
    dismissedAt: string | null;
  };
  firstVisits: Record<string, string>;
  dismissals: Record<string, string>;
}

export const EMPTY_NUX_PROGRESS: NuxProgress = {
  version: 1,
  checklist: { items: {}, dismissedAt: null },
  firstVisits: {},
  dismissals: {},
};

export function parseNuxProgress(raw: unknown): NuxProgress {
  if (!raw || typeof raw !== "object") return { ...EMPTY_NUX_PROGRESS };
  const obj = raw as Record<string, unknown>;
  const checklist = obj.checklist as Record<string, unknown> | undefined;
  return {
    version: typeof obj.version === "number" ? obj.version : 1,
    checklist: {
      items:
        (checklist?.items as NuxProgress["checklist"]["items"]) ?? {},
      dismissedAt: (checklist?.dismissedAt as string | null) ?? null,
    },
    firstVisits: (obj.firstVisits as Record<string, string>) ?? {},
    dismissals: (obj.dismissals as Record<string, string>) ?? {},
  };
}
