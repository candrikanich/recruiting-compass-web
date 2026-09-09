import { describe, it, expect } from "vitest";
import {
  groupTemplatesByStage,
  STAGE_LABELS,
  STAGE_ORDER,
} from "~/utils/communication/templateStages";
import type { CommunicationTemplate } from "~/types/models";

const tpl = (
  overrides: Partial<CommunicationTemplate> & { name: string; stage?: string | null },
): CommunicationTemplate => ({
  id: overrides.name,
  user_id: null,
  name: overrides.name,
  type: "email",
  body: "",
  is_favorite: false,
  use_count: 0,
  ...overrides,
});

describe("groupTemplatesByStage", () => {
  it("groups templates under their stage in STAGE_ORDER order, not input order", () => {
    const templates = [
      tpl({ name: "Asking for time on an offer", stage: "decision" }),
      tpl({ name: "First contact", stage: "intro" }),
      tpl({ name: "Quick update", stage: "update" }),
    ];

    const groups = groupTemplatesByStage(templates);

    expect(groups.map((g) => g.stage)).toEqual(["intro", "update", "decision"]);
  });

  it("sorts templates within a group alphabetically by name", () => {
    const templates = [
      tpl({ name: "Reconnecting after a long gap", stage: "intro" }),
      tpl({ name: "First contact", stage: "intro" }),
    ];

    const groups = groupTemplatesByStage(templates);

    expect(groups[0].templates.map((t) => t.name)).toEqual([
      "First contact",
      "Reconnecting after a long gap",
    ]);
  });

  it("buckets templates with no stage, or an unrecognized stage, into a trailing Other group", () => {
    const templates = [
      tpl({ name: "First contact", stage: "intro" }),
      tpl({ name: "Custom template", stage: null }),
      tpl({ name: "Legacy template", stage: "not_a_real_stage" }),
    ];

    const groups = groupTemplatesByStage(templates);

    expect(groups.at(-1)?.stage).toBeNull();
    expect(groups.at(-1)?.label).toBe("Other");
    expect(groups.at(-1)?.templates.map((t) => t.name)).toEqual([
      "Custom template",
      "Legacy template",
    ]);
  });

  it("omits empty groups entirely", () => {
    const templates = [tpl({ name: "First contact", stage: "intro" })];

    const groups = groupTemplatesByStage(templates);

    expect(groups).toHaveLength(1);
  });

  it("returns an empty array for no templates", () => {
    expect(groupTemplatesByStage([])).toEqual([]);
  });

  it("has a label for every stage the DB CHECK constraint allows", () => {
    const dbStages = [
      "intro",
      "update",
      "event",
      "post_event",
      "thanks",
      "nudge",
      "reply",
      "visit",
      "status",
      "decision",
      "social",
    ];
    for (const stage of dbStages) {
      expect(STAGE_LABELS[stage]).toBeTruthy();
      expect(STAGE_ORDER).toContain(stage);
    }
  });
});
