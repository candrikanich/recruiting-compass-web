import type { CommunicationTemplate } from "~/types/models";

/** Human label for each `communication_templates.stage` value (DB CHECK constraint
 *  in migration 20260816000000). Order here is display order — a narrative arc
 *  through the outreach lifecycle, not alphabetical or DB insertion order. */
export const STAGE_LABELS: Record<string, string> = {
  intro: "First Contact",
  reply: "Replying to a Coach",
  update: "Sharing an Update",
  event: "Events & Schedule",
  post_event: "After an Event",
  visit: "Visits",
  thanks: "Thank You",
  status: "Where You Stand",
  decision: "Offers & Decisions",
  nudge: "Following Up",
  social: "Announcements",
};

export const STAGE_ORDER: readonly string[] = Object.keys(STAGE_LABELS);

/** Templates with no stage (user-authored, or a future predefined row that
 *  hasn't been categorized yet) land in this trailing group rather than
 *  disappearing from the picker. */
export const OTHER_STAGE_LABEL = "Other";

export interface TemplateStageGroup {
  stage: string | null;
  label: string;
  templates: CommunicationTemplate[];
}

/**
 * Groups templates by `stage` in a fixed narrative order (STAGE_ORDER), each
 * group's templates alphabetized by name. Unstaged templates form one
 * trailing "Other" group instead of being dropped.
 */
export function groupTemplatesByStage(
  templates: CommunicationTemplate[],
): TemplateStageGroup[] {
  const byStage = new Map<string, CommunicationTemplate[]>();
  const other: CommunicationTemplate[] = [];

  for (const template of templates) {
    const stage = template.stage;
    if (!stage || !(stage in STAGE_LABELS)) {
      other.push(template);
      continue;
    }
    const bucket = byStage.get(stage) ?? [];
    bucket.push(template);
    byStage.set(stage, bucket);
  }

  const byName = (a: CommunicationTemplate, b: CommunicationTemplate) =>
    a.name.localeCompare(b.name);

  const groups: TemplateStageGroup[] = STAGE_ORDER.filter((stage) =>
    byStage.has(stage),
  ).map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    templates: [...byStage.get(stage)!].sort(byName),
  }));

  if (other.length > 0) {
    groups.push({
      stage: null,
      label: OTHER_STAGE_LABEL,
      templates: [...other].sort(byName),
    });
  }

  return groups;
}
